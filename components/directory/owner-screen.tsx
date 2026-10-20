"use client"

import Link from "next/link"
import { useState } from "react"
import { BusinessNewsDesk } from "@/components/blog/business-news"
import { CampaignOwner } from "@/components/campaigns/campaign-manage"
import { QrOwner } from "@/components/qr/qr-center"
import { ContactEditor } from "@/components/directory/contact-lines"
import { ProfileEditor } from "@/components/directory/profile-editor"
import { useListingGallery } from "@/components/directory/saved-media"
import { SocialLinkEditor } from "@/components/directory/social-links"
import { ViewReport } from "@/components/directory/view-report"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useDirectory } from "@/lib/directory-context"
import { draftContacts, savedContacts, type ContactDraft } from "@/lib/contacts"
import { applyManual, bookFromHours, hoursFromBook, weekError } from "@/lib/hours"
import type { ManualAction } from "@/lib/hours"
import { mediaReason } from "@/lib/listing-media"
import { listingFields, normalizeProfile, resolveProfile } from "@/lib/profile"
import type { BusinessContacts, BusinessProfile, HourBook } from "@/lib/types"
import { draftLinks, savedLinks, type BusinessLinks } from "@/lib/social-links"
import type { Business } from "@/lib/types"

export function OwnerScreen() {
  const { account, ready } = useAuth()
  const { managedBusinesses, patchBusiness, rememberListing } = useDirectory()

  if (!ready) return null

  if (!account) {
    return (
      <Gate
        title="İşletme paneli giriş ister."
        body="İletişim numaralarını ve site linklerini yalnızca işletme sahibi ya da yönetici değiştirir."
        href="/hesap?kayit=giris&kapi=isletme"
        action="İşletme girişi"
      />
    )
  }

  if (account.role === "musteri") {
    return (
      <Gate
        title="Bu panel işletme hesabına açık."
        body="Müşteri hesabı arama ve arama sırasında çıkan numaralar içindir. Kendi işletmenin numaralarını düzenlemek için işletme kaydı gerekir."
        href="/hesap?kayit=isletme"
        action="İşletme kaydı"
      />
    )
  }

  const owned = managedBusinesses.filter((item) => item.ownerAccountId === account.id)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <p className="text-sm font-medium text-primary">İşletme paneli</p>
      <h1 className="mt-2 font-heading text-4xl leading-tight">İşletme profili</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Kısa okuma, hakkımızda, özet, hizmet, galeri, saat ve iletişim buradan değişir. AI etiketleri onaylanmadan
        yayına çıkmaz. Doğrulama ve yayından kaldırma yöneticiye aittir.
      </p>
      {account.role === "admin" ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Bütün kayıtlar için{" "}
          <Link href="/yonetim" className="text-primary">
            yönetim paneli
          </Link>{" "}
          de aynı alanı açar.
        </p>
      ) : null}
      {owned.length ? (
        <div className="mt-6 grid gap-4">
          {owned.map((business) => (
            <OwnerCard
              key={business.id}
              business={business}
              onSave={(patch) => patchBusiness(business.id, patch)}
              onListing={(listing) => {
                patchBusiness(business.id, listing)
                rememberListing(listing)
              }}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
          <h2 className="font-heading text-2xl">Sana bağlı işletme yok.</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            İşletme ekle veya rehberdeki bir kaydı sahiplen. Linkler o kaydın paneline düşer.
          </p>
          <Button className="mt-4 h-11 rounded-xl" nativeButton={false} render={<Link href="/listele" />}>
            İşletme ekle
          </Button>
        </div>
      )}
      <BusinessNewsDesk />
      <CampaignOwner />
      <QrOwner />
    </div>
  )
}

function Gate({ title, body, href, action }: { title: string; body: string; href: string; action: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <p className="text-sm font-medium text-primary">İşletme paneli</p>
      <h1 className="mt-2 font-heading text-4xl text-balance">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
      <Button className="mt-6 h-11 rounded-xl" nativeButton={false} render={<Link href={href} />}>
        {action}
      </Button>
    </div>
  )
}

function OwnerCard({
  business,
  onSave,
  onListing,
}: {
  business: Business
  onSave: (patch: {
    links: BusinessLinks
    website: string
    contacts: BusinessContacts
    phone: string
    hours: Business["hours"]
    hourBook: HourBook
    summary: string
    about: string
    services: Business["services"]
    founded: number
    photo?: string
    profile?: BusinessProfile
  }) => void
  onListing: (listing: Business) => void
}) {
  const media = useListingGallery(business.id, business.source === "senin")
  if (business.source === "senin" && !media.ready) {
    return (
      <div className="rounded-3xl bg-card p-5 text-sm text-muted-foreground ring-1 ring-foreground/10">
        {business.name} için kapak ve galeri yükleniyor.
      </div>
    )
  }
  const base = resolveProfile(business)
  const initialProfile = media.gallery.length ? normalizeProfile({ ...base, gallery: media.gallery }, base) : base
  return (
    <OwnerForm
      business={business}
      onSave={onSave}
      onListing={onListing}
      initialCover={media.photo || business.photo}
      initialProfile={initialProfile}
    />
  )
}

function OwnerForm({
  business,
  onSave,
  onListing,
  initialCover,
  initialProfile,
}: {
  business: Business
  onSave: (patch: {
    links: BusinessLinks
    website: string
    contacts: BusinessContacts
    phone: string
    hours: Business["hours"]
    hourBook: HourBook
    summary: string
    about: string
    services: Business["services"]
    founded: number
    photo?: string
    profile?: BusinessProfile
  }) => void
  onListing: (listing: Business) => void
  initialCover: string
  initialProfile: BusinessProfile
}) {
  const [links, setLinks] = useState<BusinessLinks>(() => draftLinks(business))
  const [contacts, setContacts] = useState<ContactDraft>(() => draftContacts(business))
  const [profile, setProfile] = useState<BusinessProfile>(initialProfile)
  const [cover, setCover] = useState(initialCover)
  const { patchBusiness, rememberListing } = useDirectory()
  const [book, setBook] = useState<HourBook>(() => business.hourBook ?? bookFromHours(business.hours))
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  async function postHours(body: Record<string, unknown>) {
    const response = await fetch("/api/ilan", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, id: business.id }),
    })
    const data = (await response.json().catch(() => null)) as { ok?: boolean; reason?: string; listing?: Business } | null
    return { response, data }
  }

  async function onManual(action: ManualAction) {
    const next = applyManual(book, action, Date.now())
    if (!next) {
      setSaved(false)
      setError(action.mode === "open" ? "Tatil günü açık işaretlenemez." : "Süre geçersiz. En az bir dakika, en çok 14 gün.")
      return
    }
    if (business.source === "senin") {
      const { response, data } = await postHours({ op: "durum", mode: action.mode, span: action.span, until: action.until })
      if (!response.ok || !data?.listing) {
        setSaved(false)
        setError(data?.reason === "tatil" ? "Tatil günü açık işaretlenemez." : "İşaret sunucuya yazılamadı.")
        return
      }
      setBook(data.listing.hourBook ?? next)
      onListing(data.listing)
    } else {
      setBook(next)
      patchBusiness(business.id, { hours: hoursFromBook(next), hourBook: next })
    }
    setError("")
    setSaved(true)
  }

  return (
    <div className="grid gap-3">
    <ViewReport slug={business.slug} />
    <form
      className="grid gap-3 rounded-3xl bg-card p-5 ring-1 ring-foreground/10"
      onSubmit={(event) => {
        void (async () => {
        event.preventDefault()
        const contact = savedContacts(contacts)
        if (contact.error) {
          setSaved(false)
          setError(contact.error)
          return
        }
        const social = savedLinks(links)
        if (social.error) {
          setSaved(false)
          setError(social.error)
          return
        }
        const clean = normalizeProfile(profile, resolveProfile(business))
        const hoursProblem = weekError(book)
        if (hoursProblem) {
          setSaved(false)
          setError(hoursProblem)
          return
        }
        const hours = hoursFromBook(book)
        const fields = listingFields(clean)
        let savedPhoto = cover
        let hoursNote = ""
        if (business.source === "senin") {
          const visual = await postHours({ op: "gorsel", photo: cover, gallery: clean.gallery })
          if (!visual.response.ok || !visual.data?.listing) {
            setSaved(false)
            setError(mediaReason(visual.data?.reason))
            return
          }
          savedPhoto = visual.data.listing.photo || cover
          const timed = await postHours({ op: "saat", week: book.week, specials: book.specials })
          const base = timed.data?.listing ?? visual.data.listing
          rememberListing({ ...base, photo: savedPhoto, profile: clean, hours, hourBook: book })
          if (timed.data?.listing?.hourBook) setBook(timed.data.listing.hourBook)
          if (!timed.response.ok || !timed.data?.listing) hoursNote = "Kapak ve galeri kayda geçti. Saatler yazılamadı."
        }
        onSave({
          links: social.links,
          website: social.website,
          contacts: contact.contacts,
          phone: contact.phone,
          hours,
          hourBook: book,
          summary: fields.summary,
          about: fields.about,
          services: fields.services,
          founded: fields.founded,
          photo: savedPhoto,
          ...(business.source === "senin" ? {} : { profile: fields.profile }),
        })
        if (hoursNote) {
          setSaved(false)
          setError(hoursNote)
          return
        }
        setLinks(social.links)
        setContacts({
          landline: contact.contacts.landline ?? "",
          mobile: contact.contacts.mobile ?? "",
          whatsapp: contact.contacts.whatsapp ?? "",
        })
        setError("")
        setSaved(true)
        })()
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl">{business.name}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {business.district}, {business.city}
          </p>
        </div>
        <Button variant="outline" className="h-9 rounded-xl" nativeButton={false} render={<Link href={`/isletme/${business.slug}`} />}>
          Sayfayı aç
        </Button>
      </div>
      <ContactEditor
        value={contacts}
        onChange={(next) => {
          setSaved(false)
          setContacts(next)
        }}
      />
      <SocialLinkEditor
        value={links}
        onChange={(next) => {
          setSaved(false)
          setLinks(next)
        }}
      />
      <ProfileEditor
        business={business}
        value={profile}
        onChange={(next) => {
          setSaved(false)
          setProfile(next)
        }}
        cover={cover}
        onCover={(next) => {
          setSaved(false)
          setCover(next)
        }}
        book={book}
        onBook={(next) => {
          setSaved(false)
          setBook(next)
        }}
        onManual={(action) => {
          setSaved(false)
          void onManual(action)
        }}
        allowPublish={false}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? (
        <p className="text-sm text-primary">
          {business.source === "senin"
            ? "Kapak ve galeri işletme sayfasına yazıldı."
            : "Profil kaydedildi. Bu tarayıcıda görünür."}
        </p>
      ) : null}
      <Button type="submit" className="h-11 rounded-xl">
        Kaydet
      </Button>
    </form>
    </div>
  )
}
