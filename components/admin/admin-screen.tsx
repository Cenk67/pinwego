"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { BlogAdmin } from "@/components/blog/blog-admin"
import { VoiceAdmin } from "@/components/admin/voice-admin"
import { CampaignAdmin } from "@/components/campaigns/campaign-manage"
import { QrAdmin } from "@/components/qr/qr-center"
import { DiscoverAdmin } from "@/components/discover/discover-admin"
import { AnalyticsPanel } from "@/components/admin/analytics-panel"
import { NeedAdmin } from "@/components/admin/need-admin"
import { ViewAdmin } from "@/components/directory/view-report"
import { InboxPanel } from "@/components/admin/inbox-panel"
import { BulkUpload } from "@/components/admin/bulk-upload"
import { CustomerPanel } from "@/components/admin/customer-panel"
import { PagesPanel } from "@/components/admin/pages-panel"
import { NotifyPanel } from "@/components/admin/notify-panel"
import { CrmPanel } from "@/components/crm/crm-panel"
import { SectorAdmin } from "@/components/admin/sector-admin"
import { ClassificationFields, primarySubLabel, type Classification } from "@/components/directory/classification-fields"
import { fieldClass } from "@/components/directory/bits"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { openStoredDocument } from "@/lib/auth-store"
import { categoryById, cities, cityCenter, defaultBooking } from "@/lib/catalog"
import { useDirectory } from "@/lib/directory-context"
import { ContactEditor } from "@/components/directory/contact-lines"
import { ProfileEditor } from "@/components/directory/profile-editor"
import { useListingGallery } from "@/components/directory/saved-media"
import { SocialLinkEditor } from "@/components/directory/social-links"
import { useMinute } from "@/components/directory/hours-view"
import { applyManual, bookFromHours, hoursFromBook, weekError } from "@/lib/hours"
import type { ManualAction } from "@/lib/hours"
import { mediaReason } from "@/lib/listing-media"
import { listingFields, normalizeProfile, resolveProfile } from "@/lib/profile"
import { draftContacts, savedContacts, type ContactDraft } from "@/lib/contacts"
import { fold, slugify } from "@/lib/format"
import { maskId } from "@/lib/identity"
import { draftLinks, savedLinks, type BusinessLinks } from "@/lib/social-links"
import { businessLeaf, inSector, providerKindLabel, providerKinds, rootsOf, sortTr, type TaxonomyNode } from "@/lib/taxonomy"
import type { BookingKind, Business, BusinessProfile, HourBook } from "@/lib/types"

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
const tabs = [
  { id: "ozet", label: "Özet" },
  { id: "isletmeler", label: "İşletmeler" },
  { id: "sektorler", label: "Sektörler" },
  { id: "talepler", label: "Talepler" },
  { id: "hesaplar", label: "Hesaplar" },
  { id: "musteriler", label: "Müşteriler" },
  { id: "blog", label: "Blog" },
  { id: "ses", label: "Sesli arama" },
  { id: "kampanya", label: "Kampanyalar" },
  { id: "qr", label: "QR kartlar" },
  { id: "kesif", label: "Keşif" },
  { id: "crm", label: "CRM" },
  { id: "bildirim", label: "Bildirim" },
  { id: "analitik", label: "Analitik" },
  { id: "ihtiyac", label: "İhtiyaç araması" },
  { id: "gorunum", label: "Görüntülenme" },
  { id: "icerik", label: "İçerik" },
  { id: "iletisim", label: "İletişim" },
] as const

type Tab = (typeof tabs)[number]["id"]

function sourceLabel(source: Business["source"]) {
  if (source === "google") return "Google"
  if (source === "senin") return "Kayıt"
  return "Katalog"
}

export function AdminScreen() {
  const { account } = useAuth()
  const [tab, setTab] = useState<Tab>("ozet")

  if (!account) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <p className="text-sm font-medium text-primary">Yönetici</p>
        <h1 className="mt-2 font-heading text-4xl text-balance">Yönetim yönetici girişi ister.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Müşteri ve işletme hesapları bu paneli açmaz. Yönetici kapısı giriş bölümündedir.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button className="h-11 rounded-xl" nativeButton={false} render={<Link href="/hesap?kayit=yonetici" />}>
            Yönetici girişi
          </Button>
          <Button variant="outline" className="h-11 rounded-xl" nativeButton={false} render={<Link href="/hesap" />}>
            Tüm girişler
          </Button>
        </div>
      </div>
    )
  }

  if (account.role !== "admin") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-heading text-4xl text-balance">Yönetim yalnızca yönetici hesabına açık.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Bu oturum {account.role === "musteri" ? "müşteri" : "işletme"} hesabı. Yönetici girişi ayrı kapıdadır.
        </p>
        <Button className="mt-6 h-11 rounded-xl" nativeButton={false} render={<Link href="/hesap?kayit=yonetici" />}>
          Yönetici girişi
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <p className="text-sm font-medium text-primary">Yönetim paneli</p>
      <h1 className="mt-2 font-heading text-4xl leading-tight">pinwego’yu buradan yönet.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Yeni işletme kayıtları ve sektör ağacı sunucuda durur; arama ve işletme sayfası onları gösterir. Talep ve
        belgeler bu tarayıcıda kalır. Pasife alınan sektör ve gizlenen işletme keşif, arama ve talepte görünmez.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={
              tab === item.id
                ? "rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                : "rounded-full bg-secondary px-3 py-1.5 text-sm"
            }
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "ozet" ? <Overview /> : null}
      {tab === "isletmeler" ? <BusinessAdmin /> : null}
      {tab === "sektorler" ? <SectorAdmin /> : null}
      {tab === "talepler" ? <RequestAdmin /> : null}
      {tab === "hesaplar" ? <AccountAdmin /> : null}
      {tab === "musteriler" ? <CustomerPanel /> : null}
      {tab === "blog" ? <BlogAdmin /> : null}
      {tab === "ses" ? <VoiceAdmin /> : null}
      {tab === "kampanya" ? <CampaignAdmin /> : null}
      {tab === "qr" ? <QrAdmin /> : null}
      {tab === "kesif" ? <DiscoverAdmin /> : null}
      {tab === "crm" ? <CrmPanel /> : null}
      {tab === "bildirim" ? <NotifyPanel /> : null}
      {tab === "analitik" ? <AnalyticsPanel /> : null}
      {tab === "ihtiyac" ? <NeedAdmin /> : null}
      {tab === "gorunum" ? <ViewAdmin /> : null}
      {tab === "icerik" ? <PagesPanel /> : null}
      {tab === "iletisim" ? <InboxPanel /> : null}
    </div>
  )
}

function Overview() {
  const { managedBusinesses, taxonomy, isBusinessHidden, requests } = useDirectory()
  const { accounts } = useAuth()
  const hiddenBusinesses = managedBusinesses.filter((item) => isBusinessHidden(item)).length
  const passiveSectors = taxonomy.filter((item) => item.status === "pasif").length
  const kamuPending = managedBusinesses.filter((item) => item.orgKind === "kamu" && !item.orgVerified).length
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        ["İşletme", `${managedBusinesses.length} kayıt`, `${hiddenBusinesses} gizli`],
        ["Sektör", `${rootsOf(taxonomy).length} ana, ${taxonomy.length - rootsOf(taxonomy).length} alt`, `${passiveSectors} pasif`],
        ["Talep", `${requests.length} talep`, kamuPending ? `${kamuPending} kamu beyanı bekliyor` : "Teklif ve randevu"],
        ["Hesap", `${accounts.length} hesap`, `${accounts.filter((item) => item.role === "admin").length} yönetici`],
      ].map(([title, value, hint]) => (
        <article key={title} className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="mt-2 font-heading text-2xl">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
        </article>
      ))}
      <article className="rounded-3xl bg-primary p-5 text-primary-foreground sm:col-span-2 lg:col-span-4">
        <p className="font-heading text-2xl">Yönetici girişi</p>
        <p className="mt-2 text-sm leading-6 text-primary-foreground/85">
          Oturum posta koduyla açılır. Kullanıcı adı ve şifre bu ekranda yazılmaz.
        </p>
      </article>
    </div>
  )
}

async function postListing(body: Record<string, unknown>) {
  const response = await fetch("/api/ilan", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = (await response.json().catch(() => null)) as { ok?: boolean; reason?: string; listing?: Business } | null
  return { response, data }
}

function BusinessAdmin() {
  const {
    managedBusinesses,
    taxonomy,
    isBusinessHidden,
    hideBusiness,
    patchBusiness,
    addListing,
    removeListing,
    rememberListing,
    forgetListing,
    rememberHidden,
  } = useDirectory()
  const [query, setQuery] = useState("")
  const [limit, setLimit] = useState(12)
  const [editor, setEditor] = useState<Business | null>(null)
  const [profileTarget, setProfileTarget] = useState<Business | null>(null)
  const [creating, setCreating] = useState(false)
  const [sectorFilter, setSectorFilter] = useState("")
  const [orgFilter, setOrgFilter] = useState<"" | "kamu" | "ozel" | "beyan">("")
  const [providerFilter, setProviderFilter] = useState("")
  const [stateFilter, setStateFilter] = useState<"" | "gizli" | "acik" | "onay">("")
  const now = useMinute()
  const roots = useMemo(() => sortTr(rootsOf(taxonomy)), [taxonomy])

  const filtered = useMemo(() => {
    const needle = fold(query)
    return managedBusinesses.filter((item) => {
      if (needle && !fold(`${item.name} ${item.city} ${item.district} ${item.category} ${item.subcategory} ${item.phone}`).includes(needle)) return false
      if (sectorFilter && !inSector(item, sectorFilter)) return false
      if (orgFilter === "kamu" && item.orgKind !== "kamu") return false
      if (orgFilter === "ozel" && item.orgKind === "kamu") return false
      if (orgFilter === "beyan" && !(item.orgKind === "kamu" && !item.orgVerified)) return false
      if (providerFilter && (item.providerKind ?? "isletme") !== providerFilter) return false
      if (stateFilter) {
        const review = (item as { review?: string }).review
        const hidden = isBusinessHidden(item)
        if (stateFilter === "onay" && review !== "onay" && review !== "taslak") return false
        if (stateFilter === "gizli" && !hidden) return false
        if (stateFilter === "acik" && (hidden || review === "onay" || review === "taslak")) return false
      }
      return true
    })
  }, [managedBusinesses, query, sectorFilter, orgFilter, providerFilter, stateFilter, isBusinessHidden])

  return (
    <div className="mt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setLimit(12)
          }}
          placeholder="İşletme, semt, telefon ara"
          className="h-11 sm:max-w-72"
        />
        <div className="flex flex-wrap gap-2">
          <BulkUpload
            onImported={(listings) => {
              for (const listing of listings) {
                addListing(listing)
                rememberListing(listing)
                const review = (listing as { review?: string }).review
                if (review === "onay" || review === "taslak") rememberHidden(listing.id, true)
              }
            }}
          />
          <Button type="button" className="h-11 rounded-xl" onClick={() => setCreating(true)}>
            İşletme ekle
          </Button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <select
          aria-label="Sektör filtresi"
          className={fieldClass}
          value={sectorFilter}
          onChange={(event) => {
            setSectorFilter(event.target.value)
            setLimit(12)
          }}
        >
          <option value="">Tüm sektörler</option>
          {roots.map((root) => {
            const children = sortTr(taxonomy.filter((item) => item.parentId === root.id))
            return (
              <optgroup key={root.id} label={root.label}>
                <option value={root.id}>{root.label} (tümü)</option>
                {children.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            )
          })}
        </select>
        <select aria-label="Kuruluş türü filtresi" className={fieldClass} value={orgFilter} onChange={(event) => setOrgFilter(event.target.value as typeof orgFilter)}>
          <option value="">Kamu ve özel</option>
          <option value="kamu">Kamu</option>
          <option value="beyan">Kamu – doğrulama bekleyen</option>
          <option value="ozel">Özel</option>
        </select>
        <select aria-label="Profil türü filtresi" className={fieldClass} value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)}>
          <option value="">Tüm profil türleri</option>
          {providerKinds.map((kind) => (
            <option key={kind.id} value={kind.id}>
              {kind.label}
            </option>
          ))}
        </select>
        <select aria-label="Durum filtresi" className={fieldClass} value={stateFilter} onChange={(event) => setStateFilter(event.target.value as typeof stateFilter)}>
          <option value="">Tüm durumlar</option>
          <option value="acik">Yayında</option>
          <option value="gizli">Gizli</option>
          <option value="onay">Onay bekleyen / taslak</option>
        </select>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{filtered.length} kayıt</p>
      <div className="mt-3 grid gap-3">
        {filtered.slice(0, limit).map((business) => {
          const hidden = isBusinessHidden(business)
          const leaf = businessLeaf(taxonomy, business)
          return (
            <article key={business.id} className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/isletme/${business.slug}`} className="font-medium hover:text-primary">
                    {business.name}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {categoryById(business.category).label}
                    {leaf ? ` › ${leaf.label}` : ""}
                    {business.categories?.filter((id) => id !== leaf?.id).length ? ` +${business.categories.filter((id) => id !== leaf?.id).length}` : ""}
                    {" · "}
                    {business.district}, {business.city} · {sourceLabel(business.source)}
                    {business.orgKind === "kamu" ? (business.orgVerified ? " · Kamu ✓" : " · Kamu (beyan)") : ""}
                    {business.providerKind && business.providerKind !== "isletme" ? ` · ${providerKindLabel(business.providerKind)}` : ""}
                    {(business as { review?: string }).review === "onay"
                      ? " · onay bekliyor"
                      : (business as { review?: string }).review === "taslak"
                        ? " · taslak"
                        : hidden
                          ? " · gizli"
                          : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => setEditor(business)}>
                    Düzenle
                  </Button>
                  <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => setProfileTarget(business)}>
                    Profil
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-xl"
                    onClick={() => {
                      const next = !hidden
                      if (business.source !== "senin") {
                        hideBusiness(business.id, next)
                        return
                      }
                      void postListing({ op: "flags", id: business.id, hidden: next }).then(({ response }) => {
                        if (!response.ok) return
                        hideBusiness(business.id, next)
                        rememberHidden(business.id, next)
                      })
                    }}
                  >
                    {hidden ? "Göster" : "Gizle"}
                  </Button>
                  {business.source === "senin" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-xl"
                      onClick={() => {
                        void postListing({ op: "delete", id: business.id }).then(({ response }) => {
                          if (!response.ok) return
                          removeListing(business.id)
                          forgetListing(business.id)
                        })
                      }}
                    >
                      Sil
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <Label className="gap-2">
                  <Checkbox
                    checked={business.verified}
                    onCheckedChange={(checked) => {
                      const verified = checked === true
                      if (business.source !== "senin") {
                        patchBusiness(business.id, { verified })
                        return
                      }
                      void postListing({ op: "flags", id: business.id, verified }).then(({ response, data }) => {
                        if (!response.ok || !data?.listing) return
                        patchBusiness(business.id, { verified: data.listing.verified })
                        rememberListing(data.listing)
                      })
                    }}
                  />
                  Doğrulanmış
                </Label>
                <Label className="gap-2">
                  <Checkbox
                    checked={business.premium}
                    onCheckedChange={(checked) => {
                      const premium = checked === true
                      if (business.source !== "senin") {
                        patchBusiness(business.id, { premium })
                        return
                      }
                      void postListing({ op: "flags", id: business.id, premium }).then(({ response, data }) => {
                        if (!response.ok || !data?.listing) return
                        patchBusiness(business.id, { premium: data.listing.premium })
                        rememberListing(data.listing)
                      })
                    }}
                  />
                  Öne çıkan
                </Label>
                <Label className="gap-2">
                  <Checkbox
                    checked={Boolean(now && business.hourBook?.manual?.mode === "open" && Date.parse(business.hourBook.manual.until) > now)}
                    onCheckedChange={(checked) => {
                      const action: ManualAction = { mode: checked === true ? "open" : "auto", span: "today" }
                      const base = business.hourBook ?? bookFromHours(business.hours)
                      if (business.source !== "senin") {
                        const next = applyManual(base, action, Date.now())
                        if (!next) return
                        patchBusiness(business.id, { hourBook: next, hours: hoursFromBook(next) })
                        return
                      }
                      void postListing({ op: "durum", id: business.id, mode: action.mode, span: action.span }).then(({ response, data }) => {
                        if (!response.ok || !data?.listing) return
                        patchBusiness(business.id, { hourBook: data.listing.hourBook, hours: data.listing.hours, openNow: data.listing.openNow })
                        rememberListing(data.listing)
                      })
                    }}
                  />
                  Bugün açık işaretle
                </Label>
              </div>
            </article>
          )
        })}
      </div>
      {limit < filtered.length ? (
        <Button type="button" variant="outline" className="mt-4 h-11 w-full rounded-xl" onClick={() => setLimit((value) => value + 12)}>
          Daha fazla göster ({filtered.length - limit})
        </Button>
      ) : null}
      {editor ? (
        <BusinessEditor
          key={editor.id}
          business={editor}
          nodes={taxonomy}
          onClose={() => setEditor(null)}
          onSave={async (patch) => {
            if (editor.source === "senin") {
              const { response, data } = await postListing({
                op: "sinif",
                id: editor.id,
                category: patch.category,
                categories: patch.categories ?? [],
                subcategory: patch.subcategory,
                orgKind: patch.orgKind,
                orgVerified: patch.orgVerified === true,
                providerKind: patch.providerKind,
              })
              if (!response.ok || !data?.listing) return data?.reason === "kategori" ? "Seçilen sektör geçersiz." : "Sınıflandırma sunucuya yazılamadı."
              rememberListing({ ...data.listing, ...patch, categories: data.listing.categories, orgVerified: data.listing.orgVerified })
            }
            patchBusiness(editor.id, patch)
            setEditor(null)
            return null
          }}
        />
      ) : null}
      {profileTarget ? (
        <ProfileDialog
          key={profileTarget.id}
          business={profileTarget}
          onClose={() => setProfileTarget(null)}
          onSave={(patch) => {
            patchBusiness(profileTarget.id, patch)
            setProfileTarget(null)
          }}
        />
      ) : null}
      {creating ? (
        <CreateBusiness
          nodes={taxonomy}
          onClose={() => setCreating(false)}
          onCreate={async (business) => {
            const { response, data } = await postListing({ op: "create", ...business, verified: true })
            if (!response.ok || !data?.listing) return "Kayıt sunucuya yazılamadı. Yönetici oturumu açık olsun."
            addListing(data.listing)
            rememberListing(data.listing)
            setCreating(false)
            return null
          }}
        />
      ) : null}
    </div>
  )
}

function ProfileDialog({
  business,
  onClose,
  onSave,
}: {
  business: Business
  onClose: () => void
  onSave: (patch: ReturnType<typeof listingFields> & { hours: Business["hours"]; hourBook: HourBook; photo?: string }) => void
}) {
  const media = useListingGallery(business.id, business.source === "senin")
  if (business.source === "senin" && !media.ready) {
    return (
      <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">{business.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Kapak ve galeri yükleniyor.</p>
        </DialogContent>
      </Dialog>
    )
  }
  const base = resolveProfile(business)
  const initialProfile = media.gallery.length ? normalizeProfile({ ...base, gallery: media.gallery }, base) : base
  return (
    <ProfileForm
      business={business}
      onClose={onClose}
      onSave={onSave}
      initialCover={media.photo || business.photo}
      initialProfile={initialProfile}
    />
  )
}

function ProfileForm({
  business,
  onClose,
  onSave,
  initialCover,
  initialProfile,
}: {
  business: Business
  onClose: () => void
  onSave: (patch: ReturnType<typeof listingFields> & { hours: Business["hours"]; hourBook: HourBook; photo?: string }) => void
  initialCover: string
  initialProfile: BusinessProfile
}) {
  const [profile, setProfile] = useState<BusinessProfile>(initialProfile)
  const [cover, setCover] = useState(initialCover)
  const { patchBusiness, rememberListing } = useDirectory()
  const [book, setBook] = useState<HourBook>(() => business.hourBook ?? bookFromHours(business.hours))
  const [error, setError] = useState("")
  async function onManual(action: ManualAction) {
    const next = applyManual(book, action, Date.now())
    if (!next) {
      setError(action.mode === "open" ? "Tatil günü açık işaretlenemez." : "Süre geçersiz.")
      return
    }
    if (business.source === "senin") {
      const { response, data } = await postListing({ op: "durum", id: business.id, mode: action.mode, span: action.span, until: action.until })
      if (!response.ok || !data?.listing?.hourBook) {
        setError(data?.reason === "tatil" ? "Tatil günü açık işaretlenemez." : "İşaret sunucuya yazılamadı.")
        return
      }
      setBook(data.listing.hourBook)
      patchBusiness(business.id, { hourBook: data.listing.hourBook, hours: data.listing.hours, openNow: data.listing.openNow })
      rememberListing(data.listing)
    } else {
      setBook(next)
      patchBusiness(business.id, { hourBook: next, hours: hoursFromBook(next) })
    }
    setError("")
  }
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">{business.name}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void (async () => {
              const problem = weekError(book)
              if (problem) {
                setError(problem)
                return
              }
              const clean = normalizeProfile(profile, resolveProfile(business))
              const hours = hoursFromBook(book)
              const fields = listingFields(clean)
              if (business.source === "senin") {
                const visual = await postListing({ op: "gorsel", id: business.id, photo: cover, gallery: clean.gallery })
                if (!visual.response.ok || !visual.data?.listing) {
                  setError(mediaReason(visual.data?.reason))
                  return
                }
                const timed = await postListing({ op: "saat", id: business.id, week: book.week, specials: book.specials })
                const base = timed.data?.listing ?? visual.data.listing
                rememberListing({ ...base, photo: visual.data.listing.photo, profile: clean, hours, hourBook: book })
                if (!timed.response.ok) {
                  setError("Kapak ve galeri kayda geçti. Saatler yazılamadı.")
                  return
                }
                onSave({ ...fields, profile: clean, hours, hourBook: book, photo: visual.data.listing.photo })
                return
              }
              onSave({ ...fields, hours, hourBook: book, photo: cover })
            })()
          }}
        >
          <ProfileEditor
            business={business}
            value={profile}
            onChange={setProfile}
            cover={cover}
            onCover={setCover}
            book={book}
            onBook={setBook}
            onManual={(action) => void onManual(action)}
            allowPublish
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" className="h-11 flex-1 rounded-xl">
              Profili kaydet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function BusinessEditor({
  business,
  nodes,
  onClose,
  onSave,
}: {
  business: Business
  nodes: TaxonomyNode[]
  onClose: () => void
  onSave: (patch: Parameters<ReturnType<typeof useDirectory>["patchBusiness"]>[1]) => Promise<string | null>
}) {
  const [name, setName] = useState(business.name)
  const [contacts, setContacts] = useState<ContactDraft>(() => draftContacts(business))
  const [city, setCity] = useState(business.city)
  const [district, setDistrict] = useState(business.district)
  const [summary, setSummary] = useState(business.summary)
  const [cls, setCls] = useState<Classification>(() => ({
    category: business.category,
    categories: business.categories ?? [],
    orgKind: business.orgKind ?? "ozel",
    providerKind: business.providerKind ?? "isletme",
    orgVerified: business.orgVerified === true,
  }))
  const [booking, setBooking] = useState<BookingKind>(business.booking)
  const [links, setLinks] = useState<BusinessLinks>(() => draftLinks(business))
  const [linkError, setLinkError] = useState("")
  const [saving, setSaving] = useState(false)

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">İşletmeyi düzenle</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            const social = savedLinks(links)
            if (social.error) {
              setLinkError(social.error)
              return
            }
            const contact = savedContacts(contacts)
            if (contact.error) {
              setLinkError(contact.error)
              return
            }
            const subLabel = primarySubLabel(nodes, cls)
            setSaving(true)
            void onSave({
              name: name.trim(),
              phone: contact.phone,
              contacts: contact.contacts,
              city,
              district: district.trim(),
              address: `${district.trim()}, ${city}`,
              summary: summary.trim(),
              about: summary.trim(),
              category: cls.category,
              categories: cls.categories,
              subcategory: subLabel || (cls.category === business.category ? business.subcategory : categoryById(cls.category).label),
              orgKind: cls.orgKind,
              orgVerified: cls.orgKind === "kamu" && cls.orgVerified,
              providerKind: cls.providerKind,
              booking,
              links: social.links,
              website: social.website,
            }).then((message) => {
              setSaving(false)
              if (message) setLinkError(message)
            })
          }}
        >
          <Field label="Ad" id="edit-name" value={name} onChange={setName} />
          <ContactEditor value={contacts} onChange={setContacts} />
          <ClassificationFields value={cls} onChange={setCls} nodes={nodes} admin idPrefix="edit" />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              Şehir
              <select className={fieldClass} value={city} onChange={(event) => setCity(event.target.value)}>
                {[city, ...cities.map((item) => item.name).filter((item) => item !== city)].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <Field label="Semt" id="edit-district" value={district} onChange={setDistrict} />
          </div>
          <label className="grid gap-1.5 text-sm">
            İşlem
            <select className={fieldClass} value={booking} onChange={(event) => setBooking(event.target.value as BookingKind)}>
              <option value="teklif">Teklif</option>
              <option value="randevu">Randevu</option>
              <option value="rezervasyon">Rezervasyon</option>
            </select>
          </label>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-summary">Özet</Label>
            <Textarea id="edit-summary" value={summary} onChange={(event) => setSummary(event.target.value)} className="min-h-24" />
          </div>
          <SocialLinkEditor value={links} onChange={setLinks} />
          {linkError ? <p className="text-sm text-destructive">{linkError}</p> : null}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" className="h-11 flex-1 rounded-xl" disabled={saving}>
              {saving ? "Kaydediliyor" : "Kaydet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CreateBusiness({
  nodes,
  onClose,
  onCreate,
}: {
  nodes: TaxonomyNode[]
  onClose: () => void
  onCreate: (business: Business) => Promise<string | null>
}) {
  const { account } = useAuth()
  const [name, setName] = useState("")
  const [contacts, setContacts] = useState<ContactDraft>({ landline: "", mobile: "", whatsapp: "" })
  const [city, setCity] = useState("İstanbul")
  const [district, setDistrict] = useState("")
  const [summary, setSummary] = useState("")
  const [cls, setCls] = useState<Classification>(() => ({
    category: sortTr(rootsOf(nodes))[0]?.id ?? "yeme",
    categories: [],
    orgKind: "ozel",
    providerKind: "isletme",
    orgVerified: false,
  }))
  const category = cls.category
  const [error, setError] = useState("")

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">İşletme ekle</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (name.trim().length < 2 || district.trim().length < 2 || summary.trim().length < 12) {
              setError("Ad, semt ve kısa özet gerekli.")
              return
            }
            const contact = savedContacts(contacts)
            if (contact.error) {
              setError(contact.error)
              return
            }
            if (contact.phone.replace(/\D/g, "").length < 10) {
              setError("Telefon için en az 10 rakam yaz.")
              return
            }
            const meta = categoryById(category)
            const slug = slugify(name)
            const center = cityCenter(city)
            void onCreate({
              id: slug,
              slug,
              name: name.trim(),
              category,
              categories: cls.categories,
              subcategory: primarySubLabel(nodes, cls) || meta.label,
              orgKind: cls.orgKind,
              orgVerified: cls.orgKind === "kamu" && cls.orgVerified,
              providerKind: cls.providerKind,
              city,
              district: district.trim(),
              address: `${district.trim()}, ${city}`,
              lat: center.lat + (Math.random() - 0.5) * 0.04,
              lng: center.lng + (Math.random() - 0.5) * 0.04,
              phone: contact.phone,
              contacts: contact.contacts,
              rating: 0,
              reviewCount: 0,
              priceLevel: 2,
              openNow: true,
              summary: summary.trim(),
              about: summary.trim(),
              services: [],
              amenities: ["Yönetim kaydı"],
              tags: [],
              reviews: [],
              premium: false,
              verified: true,
              responseMinutes: 120,
              founded: new Date().getFullYear(),
              photo: meta.photo,
              photoPosition: "center",
              booking: defaultBooking(category),
              hours: DAYS.map((day) => ({ day, hours: day === "Pazar" ? "Kapalı" : "09:00–18:00" })),
              facts: [],
              source: "senin",
              ownerAccountId: account?.id,
            }).then((message) => {
              if (message) setError(message)
            })
          }}
        >
          <Field label="Ad" id="new-name" value={name} onChange={setName} />
          <ClassificationFields value={cls} onChange={setCls} nodes={nodes} admin idPrefix="new" />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              Şehir
              <select className={fieldClass} value={city} onChange={(event) => setCity(event.target.value)}>
                {cities.map((item) => (
                  <option key={item.name}>{item.name}</option>
                ))}
              </select>
            </label>
            <Field label="Semt" id="new-district" value={district} onChange={setDistrict} />
          </div>
          <ContactEditor value={contacts} onChange={setContacts} />
          <div className="grid gap-1.5">
            <Label htmlFor="new-summary">Özet</Label>
            <Textarea id="new-summary" value={summary} onChange={(event) => setSummary(event.target.value)} className="min-h-24" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" className="h-11 flex-1 rounded-xl">
              Kaydı oluştur
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RequestAdmin() {
  const { requests, removeRequest } = useDirectory()
  if (!requests.length) {
    return <p className="mt-8 text-sm text-muted-foreground">Henüz talep yok. Talep oluştur akışından gelen kayıtlar burada durur.</p>
  }
  return (
    <ul className="mt-8 grid gap-3">
      {requests.map((request) => (
        <li key={request.id} className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{request.businessName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {request.name} · {request.phone} · {request.when} · {request.kind}
              </p>
              {request.note ? <p className="mt-2 text-sm leading-6">{request.note}</p> : null}
            </div>
            <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => removeRequest(request.id)}>
              Sil
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}

function AccountAdmin() {
  const { account, accounts, removeAccount } = useAuth()
  const [message, setMessage] = useState("")

  async function openDoc(id: string) {
    setMessage("")
    try {
      const url = await openStoredDocument(id)
      if (!url) {
        setMessage("Belge bu tarayıcıda bulunamadı.")
        return
      }
      window.open(url, "_blank", "noopener")
    } catch {
      setMessage("Belge açılamadı.")
    }
  }

  return (
    <div className="mt-8 grid gap-3">
      {accounts.map((item) => (
        <article key={item.id} className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.email} · {item.role === "admin" ? "yönetici" : item.role === "isletme" ? "işletme" : "müşteri"}
                {item.customer?.nationalId ? ` · TCKN ${maskId(item.customer.nationalId)}` : ""}
                {item.business ? ` · VKN ${maskId(item.business.taxId)}` : ""}
              </p>
            </div>
            {item.id !== account?.id ? (
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl"
                onClick={() => setMessage(removeAccount(item.id) ?? "")}
              >
                Sil
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Oturumdaki hesap</p>
            )}
          </div>
          {item.documents.length ? (
            <ul className="mt-3 grid gap-2">
              {item.documents.map((document) => (
                <li key={document.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    {document.label}
                    <span className="text-muted-foreground"> · {document.name}</span>
                  </span>
                  <button type="button" className="text-primary" onClick={() => openDoc(document.id)}>
                    Aç
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Yüklü belge yok.</p>
          )}
        </article>
      ))}
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} className="h-11" />
    </div>
  )
}
