"use client"

import { useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CATEGORIES, CITIES } from "@/lib/categories"
import { saveUserBusiness } from "@/lib/storage"
import { P } from "@/lib/photos"
import { clinicHours } from "@/lib/hours"
import type { Business, CategoryId, PriceLevel } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function ListingPage() {
  const [name, setName] = useState("")
  const [category, setCategory] = useState<CategoryId>("restoranlar")
  const [citySlug, setCitySlug] = useState("istanbul")
  const [district, setDistrict] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [description, setDescription] = useState("")
  const [priceLevel, setPriceLevel] = useState<PriceLevel>(2)
  const [quote, setQuote] = useState(false)
  const [slug, setSlug] = useState<string>()

  const city = CITIES.find((c) => c.slug === citySlug)!

  if (slug) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-teal text-teal-foreground">
          <Check />
        </div>
        <h1 className="mt-4 text-3xl">Listen yayında</h1>
        <p className="mt-2 text-muted-foreground">
          Manta tarzı ücretsiz kayıt bu tarayıcıda saklanır. Aramada ve
          profilde görünür.
        </p>
        <Link href={`/isletme/${slug}`} className={cn(buttonVariants(), "mt-6 inline-flex")}>
          Profili aç
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <p className="text-sm text-muted-foreground">Ücretsiz liste · premium görünürlük sonra</p>
      <h1 className="mt-1 text-3xl md:text-4xl">İşletmeni Lumina’ya ekle</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Yellow Pages + Manta: temel profil ücretsiz. Doğrulama rozeti ve öne
        çıkarma demo dışında kapalıdır.
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          const id = name
            .toLocaleLowerCase("tr")
            .replace(/[^a-z0-9ğüşıöç]+/gi, "-")
            .replace(/^-|-$/g, "")
            .concat("-", Math.random().toString(36).slice(2, 6))
          const row: Business = {
            slug: id,
            name: name.trim(),
            category,
            subcategory: "Yeni kayıt",
            city: city.label,
            citySlug: city.slug,
            district: district.trim() || city.label,
            country: city.country,
            address: address.trim() || `${district}, ${city.label}`,
            lat: city.lat + (Math.random() - 0.5) * 0.04,
            lng: city.lng + (Math.random() - 0.5) * 0.04,
            phone: phone.trim(),
            rating: 0,
            reviewCount: 0,
            priceLevel,
            tags: ["yeni"],
            amenities: [],
            description: description.trim(),
            hours: clinicHours(),
            cover: P.office,
            photos: [P.office],
            verified: false,
            premium: false,
            quoteEnabled: quote,
            reviews: [],
          }
          saveUserBusiness(row)
          setSlug(id)
        }}
      >
        <Field label="İşletme adı" htmlFor="ad">
          <Input id="ad" required className="h-10" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kategori" htmlFor="kat">
            <select
              id="kat"
              className="h-10 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryId)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Şehir" htmlFor="city">
            <select
              id="city"
              className="h-10 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
              value={citySlug}
              onChange={(e) => setCitySlug(e.target.value)}
            >
              {CITIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="İlçe / mahalle" htmlFor="ilce">
          <Input id="ilce" className="h-10" value={district} onChange={(e) => setDistrict(e.target.value)} />
        </Field>
        <Field label="Adres" htmlFor="adres">
          <Input id="adres" className="h-10" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="Telefon" htmlFor="tel">
          <Input id="tel" required className="h-10" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Kısa açıklama" htmlFor="acik">
          <Textarea
            id="acik"
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <fieldset>
          <legend className="text-sm font-medium">Fiyat seviyesi</legend>
          <div className="mt-2 flex gap-2">
            {([1, 2, 3, 4] as PriceLevel[]).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPriceLevel(n)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm ring-1",
                  priceLevel === n
                    ? "bg-foreground text-background ring-foreground"
                    : "ring-foreground/15"
                )}
              >
                {"₺".repeat(n)}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={quote}
            onChange={(e) => setQuote(e.target.checked)}
          />
          Teklif almaya aç (usta / B2B)
        </label>
        <Button type="submit" size="lg" className="h-11 w-full">
          Ücretsiz yayınla
        </Button>
      </form>
    </div>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}
