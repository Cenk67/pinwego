"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { GuestNotice } from "@/components/auth/guest-gate"
import { ClassificationFields, defaultClassification, primarySubLabel, type Classification } from "@/components/directory/classification-fields"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PlaceEditor } from "@/components/directory/place-picker"
import { categoryById, defaultBooking } from "@/lib/catalog"
import { defaultPlace, type Place } from "@/lib/place"
import { useDirectory } from "@/lib/directory-context"
import { cleanDiscoverText } from "@/lib/discover"
import { recordDiscoverEvent, takeDiscoverLead } from "@/lib/discover-store"
import type { Business } from "@/lib/types"

export function ListScreen() {
  const router = useRouter()
  const { account } = useAuth()
  const { addListing, rememberListing, taxonomy } = useDirectory()
  const [cls, setCls] = useState<Classification>(defaultClassification)
  const category = cls.category
  const [place, setPlace] = useState<Place>(defaultPlace)
  const [district, setDistrict] = useState("")
  const [districtTouched, setDistrictTouched] = useState(false)
  const [phone, setPhone] = useState("")
  const [summary, setSummary] = useState("")
  const params = useSearchParams()
  const draftAddress = cleanDiscoverText(params.get("adres") ?? "", 120)
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const [name, setName] = useState(() => cleanDiscoverText(params.get("ad") ?? "", 80))

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const digits = phone.replace(/\D/g, "")
    const city = (place.province || place.region || place.country).trim()
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
    setPending(true)
    setError("")
    try {
      const response = await fetch("/api/ilan", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "create",
          name: name.trim(),
          category,
          categories: cls.categories,
          subcategory: primarySubLabel(taxonomy, cls) || meta.label,
          orgKind: cls.orgKind,
          providerKind: cls.providerKind,
          city,
          district: area,
          address: `${area}, ${city}`,
          lat: place.lat,
          lng: place.lng,
          phone: phone.trim(),
          summary: summary.trim(),
          photo: meta.photo,
          booking: defaultBooking(category),
        }),
      })
      const data = (await response.json().catch(() => null)) as { listing?: Business; reason?: string } | null
      if (response.status === 401 || data?.reason === "oturum") {
        setError("Bu oturum işletme kaydını sunucuya yazamıyor. İşletme hesabınla yeniden giriş yap.")
        return
      }
      if (data?.reason === "yetki") {
        setError("Bu hesap işletme kaydı açamaz.")
        return
      }
      if (data?.reason === "limited") {
        setError("Çok fazla deneme. Bir süre sonra tekrar dene.")
        return
      }
      if (data?.reason === "kategori") {
        setError("Seçilen sektör artık kullanılmıyor. Sektörü yeniden seç.")
        return
      }
      if (!response.ok || !data?.listing) {
        setError("Kayıt kaydedilemedi. Alanları kontrol edip tekrar dene.")
        return
      }
      addListing(data.listing)
      rememberListing(data.listing)
      if (takeDiscoverLead()) recordDiscoverEvent({ type: "register_done", q: name.trim(), city })
      router.push(`/isletme/${data.listing.slug}`)
    } catch {
      setError("Kayıt kaydedilemedi. Bağlantını kontrol edip tekrar dene.")
    } finally {
      setPending(false)
    }
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
        Kayıt aramada ve işletme sayfasında görünür. Doğrulama ve öne çıkarma yönetici onayından sonra açılır.
      </p>
      <form onSubmit={submit} className="mt-6 grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="biz-name">İşletme adı</Label>
          <Input id="biz-name" value={name} onChange={(event) => setName(event.target.value)} className="h-11" />
          {draftAddress ? <p className="text-sm leading-6 text-muted-foreground">Taslak adres, kayda kendiliğinden yazılmaz: {draftAddress}</p> : null}
        </div>
        <ClassificationFields value={cls} onChange={setCls} nodes={taxonomy} idPrefix="biz" />
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
        <Button type="submit" className="h-11 rounded-xl" disabled={pending}>
          {pending ? "Kaydediliyor" : "Kaydı oluştur"}
        </Button>
      </form>
    </div>
  )
}
