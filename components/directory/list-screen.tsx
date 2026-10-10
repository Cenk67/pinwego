"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { GuestNotice } from "@/components/auth/guest-gate"
import { fieldClass } from "@/components/directory/bits"
import { SectorForm } from "@/components/directory/sector-form"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PlaceEditor } from "@/components/directory/place-picker"
import { categoryById, defaultBooking } from "@/lib/catalog"
import { defaultPlace, placeCity, type Place } from "@/lib/place"
import { useDirectory } from "@/lib/directory-context"
import { slugify } from "@/lib/format"
import type { Business, CategoryId } from "@/lib/types"

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]

export function ListScreen() {
  const router = useRouter()
  const { account } = useAuth()
  const { addListing, listings, sectors } = useDirectory()
  const [sectorOpen, setSectorOpen] = useState(false)
  const [name, setName] = useState("")
  const [category, setCategory] = useState<CategoryId>("yeme")
  const [place, setPlace] = useState<Place>(defaultPlace)
  const [district, setDistrict] = useState("")
  const [districtTouched, setDistrictTouched] = useState(false)
  const [phone, setPhone] = useState("")
  const [summary, setSummary] = useState("")
  const [error, setError] = useState("")

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const digits = phone.replace(/\D/g, "")
    const city = placeCity(place)
    const area = district.trim() || place.neighborhood || place.district
    if (name.trim().length < 2 || area.length < 2 || summary.trim().length < 12) {
      setError("Ad, semt ve en az bir cümlelik özet gerekli.")
      return
    }
    if (!place.country || !Number.isFinite(place.lat)) {
      setError("Şehir ve konum seç.")
      return
    }
    if (digits.length < 10) {
      setError("Telefon için en az 10 rakam gir.")
      return
    }
    const meta = categoryById(category)
    const slug = slugify(name)
    const business: Business = {
      id: slug,
      slug,
      name: name.trim(),
      category,
      subcategory: meta.label,
      city,
      district: area,
      address: `${area}, ${city}`,
      lat: place.lat,
      lng: place.lng,
      phone: phone.trim(),
      rating: 0,
      reviewCount: 0,
      priceLevel: 2,
      openNow: true,
      summary: summary.trim(),
      about: summary.trim(),
      services: [],
      amenities: ["Yeni kayıt"],
      tags: [],
      reviews: [],
      premium: false,
      verified: false,
      responseMinutes: 180,
      founded: new Date().getFullYear(),
      photo: meta.photo,
      photoPosition: "center",
      booking: defaultBooking(category),
      hours: DAYS.map((day) => ({ day, hours: day === "Pazar" ? "Kapalı" : "09:00–18:00" })),
      facts: [],
      source: "senin",
      ownerAccountId: account?.id,
    }
    addListing(business)
    router.push(`/isletme/${slug}`)
  }

  if (!account) return <GuestNotice />

  if (account.role !== "isletme" && account.role !== "admin") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-heading text-4xl text-balance">İşletme eklemek için işletme hesabı gerekir.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Müşteri hesabı arama, harita ve talep için yeter. İşletme kaydı ayrı açılır; vergi levhası, imza sirküleri,
          sicil belgesi ve yetkili kimliği istenir. Müşteri kaydın bu tarayıcıda durur.
        </p>
        <Button className="mt-6 h-11 rounded-xl" nativeButton={false} render={<Link href="/hesap?kayit=isletme" />}>
          İşletme kaydı
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 md:py-12">
      <p className="text-sm font-medium text-primary">Ücretsiz kayıt</p>
      <h1 className="mt-2 font-heading text-4xl leading-tight">İşletmeni ekle.</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Kayıt bu tarayıcıda kalır, aramada ve profilde görünür. Doğrulama ve öne çıkarma bu demoda elle açılmaz.
      </p>
      <form onSubmit={submit} className="mt-6 grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="biz-name">İşletme adı</Label>
          <Input id="biz-name" value={name} onChange={(event) => setName(event.target.value)} className="h-11" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="biz-category">Kategori</Label>
          <select
            id="biz-category"
            className={fieldClass}
            value={category}
            onChange={(event) => setCategory(event.target.value as CategoryId)}
          >
            {sectors.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <button type="button" className="text-left text-sm text-primary" onClick={() => setSectorOpen(true)}>
            Listede yoksa sektör ekle
          </button>
        </div>
        <div className="grid gap-2 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
          <Label>Şehir</Label>
          <p className="text-xs leading-5 text-muted-foreground">
            Ülke, il ve semt seç veya istediğin yeri ara. Seçtiğin nokta Google Haritalar üzerinde durur.
          </p>
          <PlaceEditor
            current={place}
            embedded
            onChange={(next) => {
              setPlace(next)
              if (!districtTouched) setDistrict(next.neighborhood || next.district || "")
            }}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="biz-district">Semt</Label>
          <Input
            id="biz-district"
            value={district}
            onChange={(event) => {
              setDistrictTouched(true)
              setDistrict(event.target.value)
            }}
            className="h-11"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="biz-phone">Telefon</Label>
          <Input id="biz-phone" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="h-11" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="biz-summary">Kısa özet</Label>
          <Textarea
            id="biz-summary"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Ne iş yaptığını, kime ve hangi semtte yaptığını yaz."
            className="min-h-24"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="h-11 rounded-xl">
          Kaydı oluştur
        </Button>
      </form>
      {listings.length ? (
        <p className="mt-4 text-sm text-muted-foreground">{listings.length} kaydın bu tarayıcıda duruyor.</p>
      ) : null}
      <SectorForm open={sectorOpen} onOpenChange={setSectorOpen} />
    </div>
  )
}
