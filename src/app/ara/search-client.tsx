"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { SlidersHorizontal } from "lucide-react"
import { BusinessCard } from "@/components/business-card"
import { MapPanel } from "@/components/map-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { CATEGORIES, CITIES } from "@/lib/categories"
import { listUserBusinesses } from "@/lib/storage"
import { mergeCatalog } from "@/lib/catalog"
import { runSearch } from "@/lib/search"
import type { CategoryId, SearchIntent } from "@/lib/types"
import { useBrowserValue } from "@/lib/use-browser"

export function SearchClient() {
  const params = useSearchParams()
  const router = useRouter()
  const q = params.get("q") ?? ""
  const category = (params.get("kategori") as CategoryId) || undefined
  const city = params.get("sehir") || undefined
  const sort = (params.get("sort") as SearchIntent["sort"]) || "relevance"
  const near = params.get("near") === "1"
  const booking = params.get("randevu") === "1"
  const quote = params.get("teklif") === "1"

  const extra = useBrowserValue(listUserBusinesses, [])
  const [active, setActive] = useState<string>()

  const catalog = useMemo(() => mergeCatalog(extra), [extra])
  const result = useMemo(
    () =>
      runSearch(
        q,
        {
          category,
          city,
          sort,
          nearMe: near || undefined,
          wantsBooking: booking || undefined,
          wantsQuote: quote || undefined,
        },
        catalog
      ),
    [q, category, city, sort, near, booking, quote, catalog]
  )

  function setParam(key: string, value?: string) {
    const next = new URLSearchParams(params.toString())
    if (!value) next.delete(key)
    else next.set(key, value)
    router.replace(`/ara?${next.toString()}`)
  }

  function toggle(key: string, on: boolean) {
    setParam(key, on ? "1" : undefined)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm text-muted-foreground">Yapay zekâ yorumu</p>
      <h1 className="mt-1 max-w-3xl text-2xl md:text-4xl">
        {q.trim() ? q : "Tüm işletmeler"}
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {result.explanation}
      </p>
      {result.chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {result.chips.map((c) => (
            <Badge key={c} variant="secondary">
              {c}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
        <SlidersHorizontal className="size-4 text-muted-foreground" />
        <select
          className="h-9 min-w-40 rounded-lg border border-input bg-transparent px-2 text-sm"
          value={category ?? "all"}
          onChange={(e) =>
            setParam("kategori", e.target.value === "all" ? undefined : e.target.value)
          }
          aria-label="Kategori"
        >
          <option value="all">Tüm kategoriler</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          className="h-9 min-w-36 rounded-lg border border-input bg-transparent px-2 text-sm"
          value={city ?? "all"}
          onChange={(e) =>
            setParam("sehir", e.target.value === "all" ? undefined : e.target.value)
          }
          aria-label="Şehir"
        >
          <option value="all">Tüm şehirler</option>
          {CITIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          className="h-9 min-w-36 rounded-lg border border-input bg-transparent px-2 text-sm"
          value={sort}
          onChange={(e) => setParam("sort", e.target.value)}
          aria-label="Sıralama"
        >
          <option value="relevance">Akıllı sıra</option>
          <option value="rating">Puan</option>
          <option value="reviews">Yorum sayısı</option>
          <option value="distance">Mesafe</option>
        </select>
        <Label className="ml-1 flex items-center gap-2 text-sm">
          <Checkbox checked={near} onCheckedChange={(v) => toggle("near", v === true)} />
          Yakınımda
        </Label>
        <Label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={booking}
            onCheckedChange={(v) => toggle("randevu", v === true)}
          />
          Randevu
        </Label>
        <Label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={quote}
            onCheckedChange={(v) => toggle("teklif", v === true)}
          />
          Teklif
        </Label>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {result.businesses.length} sonuç
          </p>
          {result.businesses.length === 0 ? (
            <div className="rounded-2xl bg-card p-8 text-center ring-1 ring-foreground/10">
              <p className="font-heading text-xl">Eşleşen işletme yok</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Filtreleri gevşetin veya asistanla yeniden sorun.
              </p>
              <Button className="mt-4" onClick={() => router.push("/ara")}>
                Filtreleri temizle
              </Button>
            </div>
          ) : (
            result.businesses.map((b) => (
              <div
                key={b.slug}
                onMouseEnter={() => setActive(b.slug)}
              >
                <BusinessCard business={b} distanceKm={b.distanceKm} />
              </div>
            ))
          )}
        </div>
        <div className="lg:sticky lg:top-20 h-fit">
          <MapPanel
            items={result.businesses}
            activeSlug={active}
            onSelect={(slug) => {
              setActive(slug)
              router.push(`/isletme/${slug}`)
            }}
          />
        </div>
      </div>
    </div>
  )
}
