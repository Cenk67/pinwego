"use client"

import Link from "next/link"
import { useState } from "react"
import { ContactEditor } from "@/components/directory/contact-lines"
import { ProfileEditor } from "@/components/directory/profile-editor"
import { SocialLinkEditor } from "@/components/directory/social-links"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useDirectory } from "@/lib/directory-context"
import { draftContacts, savedContacts, type ContactDraft } from "@/lib/contacts"
import { listingFields, normalizeProfile, resolveProfile } from "@/lib/profile"
import type { BusinessContacts, BusinessProfile, DayHours } from "@/lib/types"
import { draftLinks, savedLinks, type BusinessLinks } from "@/lib/social-links"
import type { Business } from "@/lib/types"

export function OwnerScreen() {
  const { account, ready } = useAuth()
  const { managedBusinesses, patchBusiness } = useDirectory()

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
            <OwnerCard key={business.id} business={business} onSave={(patch) => patchBusiness(business.id, patch)} />
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
}: {
  business: Business
  onSave: (patch: {
    links: BusinessLinks
    website: string
    contacts: BusinessContacts
    phone: string
    hours: DayHours[]
    summary: string
    about: string
    services: Business["services"]
    founded: number
    profile: BusinessProfile
  }) => void
}) {
  const [links, setLinks] = useState<BusinessLinks>(() => draftLinks(business))
  const [contacts, setContacts] = useState<ContactDraft>(() => draftContacts(business))
  const [profile, setProfile] = useState<BusinessProfile>(() => resolveProfile(business))
  const [hours, setHours] = useState<DayHours[]>(business.hours)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  return (
    <form
      className="grid gap-3 rounded-3xl bg-card p-5 ring-1 ring-foreground/10"
      onSubmit={(event) => {
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
        onSave({
          links: social.links,
          website: social.website,
          contacts: contact.contacts,
          phone: contact.phone,
          hours,
          ...listingFields(clean),
        })
        setLinks(social.links)
        setContacts({
          landline: contact.contacts.landline ?? "",
          mobile: contact.contacts.mobile ?? "",
          whatsapp: contact.contacts.whatsapp ?? "",
        })
        setError("")
        setSaved(true)
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
        hours={hours}
        onHours={(next) => {
          setSaved(false)
          setHours(next)
        }}
        allowPublish={false}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? <p className="text-sm text-primary">Profil kaydedildi. Bu tarayıcıda görünür.</p> : null}
      <Button type="submit" className="h-11 rounded-xl">
        Kaydet
      </Button>
    </form>
  )
}
