"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { BlogAdmin } from "@/components/blog/blog-admin"
import { SectorForm } from "@/components/directory/sector-form"
import { fieldClass } from "@/components/directory/bits"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { ADMIN_EMAIL, ADMIN_PASSWORD, openStoredDocument } from "@/lib/auth-store"
import { categoryById, cities, cityCenter, defaultBooking } from "@/lib/catalog"
import { useDirectory } from "@/lib/directory-context"
import { ContactEditor } from "@/components/directory/contact-lines"
import { ProfileEditor } from "@/components/directory/profile-editor"
import { SocialLinkEditor } from "@/components/directory/social-links"
import { listingFields, normalizeProfile, resolveProfile } from "@/lib/profile"
import { draftContacts, savedContacts, type ContactDraft } from "@/lib/contacts"
import { fold, slugify } from "@/lib/format"
import { maskId } from "@/lib/identity"
import { draftLinks, savedLinks, type BusinessLinks } from "@/lib/social-links"
import type { BookingKind, Business, BusinessProfile, CategoryId, DayHours } from "@/lib/types"

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
const tabs = [
  { id: "ozet", label: "Özet" },
  { id: "isletmeler", label: "İşletmeler" },
  { id: "sektorler", label: "Sektörler" },
  { id: "talepler", label: "Talepler" },
  { id: "hesaplar", label: "Hesaplar" },
  { id: "blog", label: "Blog" },
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
        Sektör, işletme, talep ve hesap kayıtları bu tarayıcıda durur. Gizlenen sektör ve işletme keşif, arama ve
        talepte görünmez.
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
      {tab === "blog" ? <BlogAdmin /> : null}
    </div>
  )
}

function Overview() {
  const { managedBusinesses, managedSectors, hiddenSectorIds, isBusinessHidden, requests } = useDirectory()
  const { accounts } = useAuth()
  const hiddenBusinesses = managedBusinesses.filter((item) => isBusinessHidden(item)).length
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        ["İşletme", `${managedBusinesses.length} kayıt`, `${hiddenBusinesses} gizli`],
        ["Sektör", `${managedSectors.length} sektör`, `${hiddenSectorIds.length} gizli`],
        ["Talep", `${requests.length} talep`, "Teklif ve randevu"],
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
          E-posta {ADMIN_EMAIL}. Şifre {ADMIN_PASSWORD}. Bu tarayıcıdaki örnek panel içindir; ayrı bir sunucu yoktur.
        </p>
      </article>
    </div>
  )
}

function BusinessAdmin() {
  const {
    managedBusinesses,
    managedSectors,
    isBusinessHidden,
    hideBusiness,
    patchBusiness,
    addListing,
    removeListing,
  } = useDirectory()
  const [query, setQuery] = useState("")
  const [limit, setLimit] = useState(12)
  const [editor, setEditor] = useState<Business | null>(null)
  const [profileTarget, setProfileTarget] = useState<Business | null>(null)
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    const needle = fold(query)
    return managedBusinesses.filter((item) => {
      if (!needle) return true
      return fold(`${item.name} ${item.city} ${item.district} ${item.category} ${item.phone}`).includes(needle)
    })
  }, [managedBusinesses, query])

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
        <Button type="button" className="h-11 rounded-xl" onClick={() => setCreating(true)}>
          İşletme ekle
        </Button>
      </div>
      <div className="mt-4 grid gap-3">
        {filtered.slice(0, limit).map((business) => {
          const hidden = isBusinessHidden(business)
          return (
            <article key={business.id} className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/isletme/${business.slug}`} className="font-medium hover:text-primary">
                    {business.name}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {categoryById(business.category).label} · {business.district}, {business.city} · {sourceLabel(business.source)}
                    {hidden ? " · gizli" : ""}
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
                    onClick={() => hideBusiness(business.id, !hidden)}
                  >
                    {hidden ? "Göster" : "Gizle"}
                  </Button>
                  {business.source === "senin" ? (
                    <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => removeListing(business.id)}>
                      Sil
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <Label className="gap-2">
                  <Checkbox
                    checked={business.verified}
                    onCheckedChange={(checked) => patchBusiness(business.id, { verified: checked === true })}
                  />
                  Doğrulanmış
                </Label>
                <Label className="gap-2">
                  <Checkbox
                    checked={business.premium}
                    onCheckedChange={(checked) => patchBusiness(business.id, { premium: checked === true })}
                  />
                  Öne çıkan
                </Label>
                <Label className="gap-2">
                  <Checkbox
                    checked={business.openNow}
                    onCheckedChange={(checked) => patchBusiness(business.id, { openNow: checked === true })}
                  />
                  Şu an açık
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
          sectors={managedSectors}
          onClose={() => setEditor(null)}
          onSave={(patch) => {
            patchBusiness(editor.id, patch)
            setEditor(null)
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
          sectors={managedSectors}
          onClose={() => setCreating(false)}
          onCreate={(business) => {
            addListing(business)
            setCreating(false)
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
  onSave: (patch: ReturnType<typeof listingFields> & { hours: DayHours[] }) => void
}) {
  const [profile, setProfile] = useState<BusinessProfile>(() => resolveProfile(business))
  const [hours, setHours] = useState<DayHours[]>(business.hours)
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
            const clean = normalizeProfile(profile, resolveProfile(business))
            onSave({ ...listingFields(clean), hours })
          }}
        >
          <ProfileEditor
            business={business}
            value={profile}
            onChange={setProfile}
            hours={hours}
            onHours={setHours}
            allowPublish
          />
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
  sectors,
  onClose,
  onSave,
}: {
  business: Business
  sectors: { id: string; label: string }[]
  onClose: () => void
  onSave: (patch: Parameters<ReturnType<typeof useDirectory>["patchBusiness"]>[1]) => void
}) {
  const [name, setName] = useState(business.name)
  const [contacts, setContacts] = useState<ContactDraft>(() => draftContacts(business))
  const [city, setCity] = useState(business.city)
  const [district, setDistrict] = useState(business.district)
  const [summary, setSummary] = useState(business.summary)
  const [category, setCategory] = useState<CategoryId>(business.category)
  const [booking, setBooking] = useState<BookingKind>(business.booking)
  const [links, setLinks] = useState<BusinessLinks>(() => draftLinks(business))
  const [linkError, setLinkError] = useState("")

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
            onSave({
              name: name.trim(),
              phone: contact.phone,
              contacts: contact.contacts,
              city,
              district: district.trim(),
              address: `${district.trim()}, ${city}`,
              summary: summary.trim(),
              about: summary.trim(),
              category,
              booking,
              links: social.links,
              website: social.website,
            })
          }}
        >
          <Field label="Ad" id="edit-name" value={name} onChange={setName} />
          <ContactEditor value={contacts} onChange={setContacts} />
          <label className="grid gap-1.5 text-sm">
            Sektör
            <select className={fieldClass} value={category} onChange={(event) => setCategory(event.target.value)}>
              {sectors.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
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
            <Button type="submit" className="h-11 flex-1 rounded-xl">
              Kaydet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CreateBusiness({
  sectors,
  onClose,
  onCreate,
}: {
  sectors: { id: string; label: string; photo?: string }[]
  onClose: () => void
  onCreate: (business: Business) => void
}) {
  const { account } = useAuth()
  const [name, setName] = useState("")
  const [contacts, setContacts] = useState<ContactDraft>({ landline: "", mobile: "", whatsapp: "" })
  const [city, setCity] = useState("İstanbul")
  const [district, setDistrict] = useState("")
  const [summary, setSummary] = useState("")
  const [category, setCategory] = useState<CategoryId>(sectors[0]?.id ?? "yeme")
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
            if (name.trim().length < 2 || district.trim().length < 2 || summary.trim().length < 8) {
              setError("Ad, semt ve kısa özet gerekli.")
              return
            }
            const contact = savedContacts(contacts)
            if (contact.error) {
              setError(contact.error)
              return
            }
            const meta = categoryById(category)
            const slug = slugify(name)
            const center = cityCenter(city)
            onCreate({
              id: slug,
              slug,
              name: name.trim(),
              category,
              subcategory: meta.label,
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
            })
          }}
        >
          <Field label="Ad" id="new-name" value={name} onChange={setName} />
          <label className="grid gap-1.5 text-sm">
            Sektör
            <select className={fieldClass} value={category} onChange={(event) => setCategory(event.target.value)}>
              {sectors.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
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

function SectorAdmin() {
  const { managedSectors, hiddenSectorIds, hideSector, removeSector } = useDirectory()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const filtered = managedSectors.filter((item) => fold(`${item.label} ${item.blurb}`).includes(fold(query)))

  return (
    <div className="mt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sektör ara" className="h-11 sm:max-w-72" />
        <Button type="button" className="h-11 rounded-xl" onClick={() => setOpen(true)}>
          Sektör ekle
        </Button>
      </div>
      <div className="mt-4 grid gap-2">
        {filtered.map((sector) => {
          const hidden = hiddenSectorIds.includes(sector.id)
          return (
            <article key={sector.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10">
              <div>
                <p className="font-medium">{sector.label}</p>
                <p className="text-xs text-muted-foreground">
                  {sector.blurb}
                  {sector.custom ? " · özel" : ""}
                  {hidden ? " · gizli" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => hideSector(sector.id, !hidden)}>
                  {hidden ? "Göster" : "Gizle"}
                </Button>
                {sector.custom ? (
                  <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => removeSector(sector.id)}>
                    Sil
                  </Button>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
      <SectorForm open={open} onOpenChange={setOpen} />
    </div>
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
                {item.customer ? ` · TCKN ${maskId(item.customer.nationalId)}` : ""}
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
