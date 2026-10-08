"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { fieldClass } from "@/components/directory/bits"
import { PlaceEditor } from "@/components/directory/place-picker"
import { SectorForm } from "@/components/directory/sector-form"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { categoryById, defaultBooking } from "@/lib/catalog"
import { useDirectory } from "@/lib/directory-context"
import { slugify } from "@/lib/format"
import { businessArea, openAddress, placeReady } from "@/lib/listing-location"
import type { Place } from "@/lib/place"
import type { Business, CategoryId } from "@/lib/types"

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]

export function ListScreen() {
  const router = useRouter()
  const { account } = useAuth()
  const { addListing, listings, place: savedPlace, sectors } = useDirectory()
  const [sectorOpen, setSectorOpen] = useState(false)
  const [name, setName] = useState("")
  const [category, setCategory] = useState<CategoryId>("yeme")
  const [place, setPlace] = useState<Place>(savedPlace)
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null)
  const [street, setStreet] = useState("")
  const [pinNote, setPinNote] = useState("")
  const [phone, setPhone] = useState("")
  const [summary, setSummary] = useState("")
  const [error, setError] = useState("")
  const pinRequest = useRef(0)

  function choosePlace(next: Place) {
    setPlace(next)
    setPin(null)
    setPinNote("")
  }

  async function pinAddress(current = place, text = street) {
    const written = text.trim()
    if (written.length < 8) return null
    const query = [written, current.neighborhood, current.district, current.province, current.country].filter(Boolean).join(", ")
    const token = ++pinRequest.current
    setPinNote("Açık adres Google Haritalar’da aranıyor.")
    try {
      const response = await fetch(`/api/yer?q=${encodeURIComponent(query)}&country=${encodeURIComponent(current.countryCode)}`)
      const body = (await response.json()) as Place[] | { error?: string }
      if (token !== pinRequest.current) return null
      const hit = Array.isArray(body) ? body[0] : null
      if (!hit) {
        setPin(null)
        setPinNote("Bu açık adres ayrı bir nokta açmadı. Seçili konum haritada duruyor.")
        return null
      }
      const next: Place = {
        ...current,
        ...hit,
        nearMe: false,
        country: hit.country || current.country,
        countryCode: hit.countryCode || current.countryCode,
        region: hit.region || current.region,
        province: hit.province || current.province,
        district: hit.district || current.district,
        neighborhood: hit.neighborhood || current.neighborhood,
      }
      setPlace(next)
      setPin({ lat: next.lat, lng: next.lng })
      setPinNote("Açık adres haritada işaretlendi.")
      return next
    } catch {
      if (token === pinRequest.current) setPinNote("Harita servisi yanıt vermedi. Seçili konum duruyor.")
      return null
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const digits = phone.replace(/\D/g, "")
    if (name.trim().length < 2 || street.trim().length < 8 || summary.trim().length < 12) {
      setError("Ad, açık adres ve en az bir cümlelik özet gerekli.")
      return
    }
    if (digits.length < 10) {
      setError("Telefon için en az 10 rakam gir.")
      return
    }
    const located = (await pinAddress(place, street)) ?? place
    if (!placeReady(located)) {
      setError("İl, ilçe, semt ya da Yakınımdakiler ile bir nokta seç.")
      return
    }
    const area = businessArea(located)
    const meta = categoryById(category)
    const slug = slugify(name)
    const business: Business = {
      id: slug,
      slug,
      name: name.trim(),
      category,
      subcategory: meta.label,
      city: area.city,
      district: area.district,
      address: openAddress(street, located),
      lat: located.lat,
      lng: located.lng,
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

  if (account?.role !== "isletme" && account?.role !== "admin") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-heading text-4xl text-balance">İşletme eklemek için işletme hesabı gerekir.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Müşteri hesabı arama, harita ve talep için yeter. Kendi işletmeni rehbere koymak için çıkış yapıp vergi
          levhası, imza sirküleri, sicil belgesi ve yetkili kimliğiyle işletme kaydı aç.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
      <p className="text-sm font-medium text-primary">Ücretsiz kayıt</p>
      <h1 className="mt-2 font-heading text-4xl leading-tight">İşletmeni ekle.</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Kayıt bu tarayıcıda kalır, aramada ve profilde görünür. Konum ülke, bölge, il, ilçe ve semtten seçilir.
        Yakınımdakiler tarayıcı konumunu kullanır. Açık adres Google Haritalar’da aynı noktayı açar.
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
        <div className="grid gap-3 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
          <div>
            <p className="text-sm font-medium">Konum</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Ülke, bölge, il, ilçe ve semt birbirine bağlıdır. Yakınımdakiler tarayıcı konumunu kullanır. Seçtiğin nokta
              Google Haritalar üzerinde durur.
            </p>
          </div>
          <PlaceEditor current={place} onChange={choosePlace} embedded point={pin} />
          <div className="grid gap-1.5">
            <Label htmlFor="biz-address">Açık adres</Label>
            <Input
              id="biz-address"
              value={street}
              onChange={(event) => {
                setStreet(event.target.value)
                setPin(null)
                setPinNote("")
              }}
              onBlur={(event) => void pinAddress(place, event.currentTarget.value)}
              placeholder="Sokak, kapı numarası, daire. Örn. İstiklal Cad. No: 12 D: 3"
              className="h-11"
            />
            {pinNote ? <p className="text-xs text-muted-foreground">{pinNote}</p> : null}
          </div>
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
