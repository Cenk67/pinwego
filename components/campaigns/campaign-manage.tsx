"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { fieldClass } from "@/components/directory/bits"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { readCampaignImage } from "@/lib/campaign-image"
import { useCampaigns } from "@/lib/campaign-store"
import {
  blankDraft,
  campaignPath,
  createPayment,
  liveStatus,
  moderate,
  qualityScore,
  reviewCampaign,
  sectorLabel,
  suggestCampaignCopy,
  todayISO,
  type Actor,
  type Campaign,
  type CampaignPatch,
  type CampaignStatus,
} from "@/lib/campaigns"
import { useDirectory } from "@/lib/directory-context"
import type { Business } from "@/lib/types"

const statusLabel: Record<CampaignStatus, string> = {
  draft: "Taslak",
  pending_moderation: "Moderasyonda",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  published: "Yayında",
  expired: "Süresi doldu",
  archived: "Arşiv",
  suspended: "Askıda",
}

const flagLabel: Record<string, string> = {
  caps: "Tamamı büyük harf",
  exclaim: "Fazla ünlem",
  discount: "İndirim eşiği",
  short: "Kısa metin",
  image: "Görsel yok",
  terms: "Koşul yok",
  dates: "Bitiş, başlangıçtan önce",
}

function actorOf(account: { id: string; role: "musteri" | "isletme" | "admin" }): Actor {
  return { id: account.id, role: account.role }
}

export function CampaignOwner() {
  const { account } = useAuth()
  const { managedBusinesses } = useDirectory()
  const { campaigns, saveCampaign, settings } = useCampaigns()
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  if (!account || account.role === "musteri") return null
  const ownedBusinesses = managedBusinesses.filter((item) => item.ownerAccountId === account.id)
  const mine = campaigns.filter((campaign) => {
    const business = ownedBusinesses.find((item) => item.id === campaign.businessId)
    return campaign.ownerAccountId === account.id || Boolean(business)
  })
  const taken = campaigns.map((campaign) => campaign.slug)

  return (
    <section className="mt-10">
      <h2 className="font-heading text-3xl">Kampanyalarım</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        Taslak bu tarayıcıda kalır. Gönderilen kampanya moderasyona düşer. Yayındaki bir kaydı düzenlemek yeniden
        incelemeye alır. Onay yalnızca yönetimdedir.
      </p>
      {account.role === "admin" ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Örnek kayıtlar ve tüm kuyruk{" "}
          <Link href="/yonetim" className="text-primary">yönetimdeki Kampanyalar</Link> sekmesindedir.
        </p>
      ) : null}
      {ownedBusinesses.length ? (
        <Button type="button" className="mt-4 h-11 rounded-full" onClick={() => { setCreating(true); setEditing(null) }}>
          Kampanya oluştur
        </Button>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Kampanya açmak için sana bağlı bir işletme gerekir.</p>
      )}
      {creating && ownedBusinesses[0] ? (
        <Creator
          businesses={ownedBusinesses}
          taken={taken}
          onClose={() => setCreating(false)}
          onSave={(campaign, send) => {
            const actor = actorOf(account)
            if (!send) {
              saveCampaign(campaign)
              setCreating(false)
              return
            }
            const result = moderate(actor, campaign, { type: "submit" }, "", settings)
            if (result.ok) saveCampaign(result.campaign)
            setCreating(false)
          }}
        />
      ) : null}
      <div className="mt-4 grid gap-3">
        {mine.map((campaign) => (
          <article key={campaign.id} className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{campaign.businessName}</p>
                <h3 className="font-heading text-2xl">{campaign.title || "Adsız taslak"}</h3>
                <p className="mt-1 text-xs">{statusLabel[liveStatus(campaign)]}</p>
              </div>
              <Button type="button" variant="outline" className="h-9 rounded-full" onClick={() => setEditing(editing === campaign.id ? null : campaign.id)}>
                Düzenle
              </Button>
            </div>
            {campaign.status === "rejected" && campaign.moderationNote ? (
              <p className="mt-3 rounded-2xl bg-secondary px-3 py-2 text-sm">Red notu: {campaign.moderationNote}</p>
            ) : null}
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
              <div>Görüntüleme {campaign.views}</div>
              <div>Tıklama {campaign.clicks}</div>
              <div>WhatsApp {campaign.whatsappClicks}</div>
              <div>Site {campaign.websiteClicks}</div>
            </dl>
            {editing === campaign.id ? (
              <Editor
                campaign={campaign}
                onSave={(patch, send) => {
                  const actor = actorOf(account)
                  const edited = moderate(actor, campaign, { type: "edit", patch, taken }, ownedBusinesses.find((item) => item.id === campaign.businessId)?.ownerAccountId ?? "", settings)
                  if (!edited.ok) return
                  if (send && edited.campaign.status === "draft") {
                    const sent = moderate(actor, edited.campaign, { type: "submit" }, "", settings)
                    if (sent.ok) saveCampaign(sent.campaign)
                  } else {
                    saveCampaign(edited.campaign)
                  }
                  setEditing(null)
                }}
              />
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}

export function CampaignAdmin() {
  const { account } = useAuth()
  const { campaigns, saveCampaign, settings, saveSettings } = useCampaigns()
  const [tab, setTab] = useState<"pending" | "live" | "rejected" | "expired" | "archived" | "all">("pending")
  const [note, setNote] = useState("")
  const [editing, setEditing] = useState<string | null>(null)
  const [paymentNote, setPaymentNote] = useState("")
  const today = todayISO()
  const rows = useMemo(() => {
    return campaigns.filter((campaign) => {
      const live = liveStatus(campaign, today)
      if (tab === "all") return true
      if (tab === "pending") return campaign.status === "pending_moderation"
      if (tab === "rejected") return campaign.status === "rejected"
      if (tab === "archived") return campaign.status === "archived"
      if (tab === "expired") return live === "expired"
      return live === "published"
    })
  }, [campaigns, tab, today])
  if (!account || account.role !== "admin") return null
  const actor = actorOf(account)
  const month = today.slice(0, 7)
  const active = campaigns.filter((campaign) => liveStatus(campaign, today) === "published").length
  const pending = campaigns.filter((campaign) => campaign.status === "pending_moderation").length
  const addedMonth = campaigns.filter((campaign) => campaign.createdAt.slice(0, 7) === month).length
  const addedToday = campaigns.filter((campaign) => campaign.createdAt.slice(0, 10) === today).length
  const viewed = [...campaigns].sort((a, b) => b.views - a.views)[0]
  const clicked = [...campaigns].sort((a, b) => b.clicks - a.clicks)[0]
  const byCategory = new Map<string, number>()
  for (const campaign of campaigns) byCategory.set(campaign.category, (byCategory.get(campaign.category) ?? 0) + 1)
  const taken = campaigns.map((campaign) => campaign.slug)

  function run(campaign: Campaign, action: Parameters<typeof moderate>[2]) {
    const result = moderate(actor, campaign, action, "", settings)
    if (!result.ok) {
      if (result.error === "reason") setNote("Red için gerekçe yazın.")
      return
    }
    saveCampaign(result.campaign)
    setNote("")
  }

  return (
    <div className="mt-6">
      <h2 className="font-heading text-3xl">Kampanya moderasyonu</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        Onay bu tarayıcıda işler. Ödeme alınmaz. Ön kontrol uyarı yazar, kendisi yayınlamaz. Moderasyon kapatılamaz.
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Toplam" value={campaigns.length} />
        <Stat label="Yayında" value={active} />
        <Stat label="Bekleyen" value={pending} />
        <Stat label="Bu ay / bugün" value={`${addedMonth} / ${addedToday}`} />
      </dl>
      <p className="mt-3 text-sm text-muted-foreground">
        En çok görülen: {viewed?.title ?? "—"}. En çok tıklanan: {clicked?.title ?? "—"}.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {[...byCategory.entries()].map(([id, count]) => `${sectorLabel(id)} ${count}`).join(" · ")}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {([
          ["pending", "Bekleyenler"],
          ["live", "Yayındakiler"],
          ["rejected", "Reddedilenler"],
          ["expired", "Süresi dolanlar"],
          ["archived", "Arşiv"],
          ["all", "Tümü"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={tab === id ? "rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground" : "rounded-full bg-secondary px-3 py-1.5 text-sm"}>
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3">
        {rows.map((campaign) => {
          const live = liveStatus(campaign, today)
          return (
            <article key={campaign.id} className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{campaign.businessName} · {sectorLabel(campaign.category)}</p>
                  <h3 className="font-heading text-2xl">{campaign.title}</h3>
                  <p className="mt-1 text-xs">{statusLabel[live]} · kalite {qualityScore(campaign)}</p>
                  {campaign.aiReview?.flags.length ? (
                    <p className="mt-2 text-xs text-muted-foreground">Ön kontrol: {campaign.aiReview.flags.map((flag) => flagLabel[flag] ?? flag).join(", ")}</p>
                  ) : null}
                  {campaign.moderationNote ? <p className="mt-2 text-sm">Not: {campaign.moderationNote}</p> : null}
                </div>
                <Button variant="outline" className="h-9 rounded-full" nativeButton={false} render={<Link href={campaignPath(campaign)} />}>
                  Önizle
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" className="h-9 rounded-full" onClick={() => run(campaign, { type: "approve" })}>Onayla</Button>
                <Button type="button" variant="outline" className="h-9 rounded-full" onClick={() => run(campaign, { type: "reject", note })}>Reddet</Button>
                <Button type="button" variant="outline" className="h-9 rounded-full" onClick={() => run(campaign, { type: "unpublish" })}>Yayından kaldır</Button>
                <Button type="button" variant="outline" className="h-9 rounded-full" onClick={() => run(campaign, { type: "archive" })}>Arşivle</Button>
                <Button type="button" variant="outline" className="h-9 rounded-full" onClick={() => run(campaign, { type: "feature", on: !campaign.featured })}>
                  {campaign.featured ? "Öne çıkanı kapat" : "Öne çıkar"}
                </Button>
                <Button type="button" variant="outline" className="h-9 rounded-full" onClick={() => run(campaign, { type: "sponsor", on: !campaign.sponsored, until: "2026-10-31" })}>
                  {campaign.sponsored ? "Sponsorluğu kapat" : "Sponsorlu işaretle"}
                </Button>
                <Button type="button" variant="outline" className="h-9 rounded-full" onClick={() => setEditing(editing === campaign.id ? null : campaign.id)}>Düzenle</Button>
              </div>
              <label className="mt-3 block text-xs text-muted-foreground" htmlFor={`note-${campaign.id}`}>Red gerekçesi</label>
              <input id={`note-${campaign.id}`} value={note} onChange={(event) => setNote(event.target.value)} className={`${fieldClass} mt-1`} />
              {editing === campaign.id ? (
                <Editor
                  campaign={campaign}
                  onSave={(patch, send) => {
                    const result = moderate(actor, campaign, { type: "edit", patch, taken }, "", settings)
                    if (!result.ok) return
                    if (send && result.campaign.status === "draft") {
                      const sent = moderate(actor, result.campaign, { type: "submit" }, "", settings)
                      if (sent.ok) saveCampaign(sent.campaign)
                    } else {
                      saveCampaign(result.campaign)
                    }
                    setEditing(null)
                  }}
                />
              ) : null}
            </article>
          )
        })}
        {rows.length ? null : <p className="text-sm text-muted-foreground">Bu sekmede kayıt yok.</p>}
      </div>
      {note ? <p className="mt-3 text-sm">{note}</p> : null}
      <form
        className="mt-8 grid gap-3 rounded-3xl bg-card p-4 ring-1 ring-foreground/10"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          saveSettings({
            ...settings,
            discountFlag: Number(data.get("discountFlag")),
            shortMin: Number(data.get("shortMin")),
            sponsorWeek: Number(data.get("week")),
            sponsorMonth: Number(data.get("month")),
            moderationRequired: true,
          })
        }}
      >
        <h3 className="font-heading text-2xl">Eşikler ve paket etiketleri</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground">İndirim uyarısı (%)<input name="discountFlag" type="number" defaultValue={settings.discountFlag} className={`${fieldClass} mt-1`} /></label>
          <label className="text-xs text-muted-foreground">Kısa metin sınırı<input name="shortMin" type="number" defaultValue={settings.shortMin} className={`${fieldClass} mt-1`} /></label>
          <label className="text-xs text-muted-foreground">Haftalık sponsor etiketi (₺)<input name="week" type="number" defaultValue={settings.sponsorWeek} className={`${fieldClass} mt-1`} /></label>
          <label className="text-xs text-muted-foreground">Aylık sponsor etiketi (₺)<input name="month" type="number" defaultValue={settings.sponsorMonth} className={`${fieldClass} mt-1`} /></label>
        </div>
        <Button type="submit" variant="outline" className="h-11 rounded-full">Eşikleri kaydet</Button>
        <div className="flex flex-wrap gap-2">
          {(["paytr", "iyzico", "stripe"] as const).map((provider) => (
            <Button
              key={provider}
              type="button"
              variant="outline"
              className="h-11 rounded-full"
              onClick={() => {
                const result = createPayment(provider)
                setPaymentNote(result.reason === "not_connected" ? `${provider} bağlı değil. Ücret alınmadı.` : "")
              }}
            >
              {provider}
            </Button>
          ))}
        </div>
        {paymentNote ? <p className="text-sm">{paymentNote}</p> : null}
      </form>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-3xl">{value}</p>
    </div>
  )
}

function Creator({
  businesses,
  taken,
  onSave,
  onClose,
}: {
  businesses: Business[]
  taken: string[]
  onSave: (campaign: Campaign, send: boolean) => void
  onClose: () => void
}) {
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "")
  const business = businesses.find((item) => item.id === businessId) ?? businesses[0]
  const draft = business ? blankDraft(business, business.ownerAccountId ?? "", taken) : null
  if (!draft || !business) return null
  return (
    <div className="mt-4 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
      <label className="text-xs text-muted-foreground">İşletme
        <select className={`${fieldClass} mt-1`} value={businessId} onChange={(event) => setBusinessId(event.target.value)}>
          {businesses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <Editor
        key={business.id}
        campaign={draft}
        onSave={(patch, send) => onSave({ ...draft, ...patch, businessId: business.id, businessSlug: business.slug, businessName: business.name, category: business.category, subcategory: business.subcategory, city: business.city, district: business.district, address: business.address, phone: business.phone, whatsapp: business.contacts?.whatsapp || business.phone, website: business.website ?? "", lat: business.lat, lng: business.lng }, Boolean(send))}
      />
      <Button type="button" variant="ghost" className="mt-2 h-9 rounded-full" onClick={onClose}>Vazgeç</Button>
    </div>
  )
}

function Editor({
  campaign,
  onSave,
}: {
  campaign: Campaign
  onSave: (patch: CampaignPatch, send?: boolean) => void
}) {
  const [patch, setPatch] = useState<CampaignPatch>({
    title: campaign.title,
    shortText: campaign.shortText,
    longText: campaign.longText,
    image: campaign.image,
    discountPercent: campaign.discountPercent,
    advantage: campaign.advantage,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    code: campaign.code,
    terms: campaign.terms,
    usageLimit: campaign.usageLimit,
    whatsapp: campaign.whatsapp,
    website: campaign.website,
    subcategory: campaign.subcategory,
  })
  const [sentence, setSentence] = useState("")
  const [imageError, setImageError] = useState("")
  const preview = reviewCampaign({ ...campaign, ...patch })

  function set<K extends keyof CampaignPatch>(key: K, value: CampaignPatch[K]) {
    setPatch((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="mt-4 grid gap-2">
      <p className="text-xs text-muted-foreground">Metin önerisi yayınlamaz. Cümleyi kendin düzenle.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input value={sentence} onChange={(event) => setSentence(event.target.value)} placeholder="Tek cümleyle kampanya" className={fieldClass} />
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full"
          onClick={() => {
            const copy = suggestCampaignCopy(sentence)
            setPatch((current) => ({ ...current, title: copy.title, shortText: copy.shortText, longText: copy.longText }))
          }}
        >
          Öner
        </Button>
      </div>
      <input value={patch.title} onChange={(event) => set("title", event.target.value)} placeholder="Başlık" className={fieldClass} />
      <input value={patch.shortText} onChange={(event) => set("shortText", event.target.value)} placeholder="Kısa açıklama" className={fieldClass} />
      <textarea value={patch.longText} onChange={(event) => set("longText", event.target.value)} placeholder="Uzun açıklama" className="min-h-24 rounded-xl bg-background px-3 py-2 text-sm ring-1 ring-foreground/10 outline-none" />
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={patch.advantage} onChange={(event) => set("advantage", event.target.value)} placeholder="Avantaj" className={fieldClass} />
        <input type="number" value={patch.discountPercent} onChange={(event) => set("discountPercent", Number(event.target.value))} placeholder="İndirim %" className={fieldClass} />
        <input type="date" value={patch.startDate} onChange={(event) => set("startDate", event.target.value)} className={fieldClass} />
        <input type="date" value={patch.endDate} onChange={(event) => set("endDate", event.target.value)} className={fieldClass} />
        <input value={patch.code} onChange={(event) => set("code", event.target.value)} placeholder="Kampanya kodu" className={fieldClass} />
        <input type="number" value={patch.usageLimit} onChange={(event) => set("usageLimit", Number(event.target.value))} placeholder="Kullanım sınırı" className={fieldClass} />
        <input value={patch.whatsapp} onChange={(event) => set("whatsapp", event.target.value)} placeholder="WhatsApp" className={fieldClass} />
        <input value={patch.website} onChange={(event) => set("website", event.target.value)} placeholder="Site" className={fieldClass} />
      </div>
      <input value={patch.terms} onChange={(event) => set("terms", event.target.value)} placeholder="Koşullar" className={fieldClass} />
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return
          readCampaignImage(file).then((image) => {
            setImageError("")
            set("image", image)
          }).catch((error: Error) => {
            setImageError(error.message === "size" ? "Görsel 1,2 MB sınırını aşıyor." : "Yalnızca JPEG, PNG veya WebP.")
          })
        }}
      />
      {imageError ? <p className="text-xs">{imageError}</p> : null}
      {patch.image ? <p className="text-xs text-muted-foreground">Görsel hazır.</p> : null}
      {preview.flags.length ? <p className="text-xs text-muted-foreground">Ön kontrol: {preview.flags.map((flag) => flagLabel[flag] ?? flag).join(", ")}. Yayınlanmaz.</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="h-11 rounded-full" onClick={() => onSave(patch, false)}>Taslak kaydet</Button>
        <Button type="button" className="h-11 rounded-full" onClick={() => onSave(patch, true)}>Moderasyona gönder</Button>
      </div>
    </div>
  )
}
