"use client"

import Link from "next/link"
import { SlidersHorizontal } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import { BusinessCard } from "@/components/directory/business-card"
import { MiniMap } from "@/components/directory/mini-map"
import { SearchForm } from "@/components/directory/search-form"
import { fieldClass } from "@/components/directory/bits"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { allBusinesses, cityCenter } from "@/lib/catalog"
import { useDirectory } from "@/lib/directory-context"
import { defaultFilters, parseQuery, searchDirectory } from "@/lib/match"
import { applyPlace, placeLabel } from "@/lib/place"
import type { CategoryId, SortKey } from "@/lib/types"

const sorts: { id: SortKey; label: string }[] = [
  { id: "ilgili", label: "En ilgili" },
  { id: "puan", label: "Puan" },
  { id: "yorum", label: "Yorum sayısı" },
  { id: "mesafe", label: "Mesafe" },
  { id: "yanit", label: "Dönüş süresi" },
  { id: "fiyat", label: "Fiyat" },
]

export function SearchScreen() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { listings, place, sectors } = useDirectory()
  const [showMap, setShowMap] = useState(false)
  const [limit, setLimit] = useState(9)

  const query = params.get("q") ?? ""
  const catalog = useMemo(() => allBusinesses(listings), [listings])
  const parsed = parseQuery(query, catalog)
  const namedCity = params.get("sehir") ?? parsed.city
  const sehir = place.nearMe ? "hepsi" : namedCity ?? "hepsi"
  const kategori = (params.get("kategori") ?? parsed.category ?? "hepsi") as CategoryId | "hepsi"
  const minRating = Number(params.get("puan") ?? "0")
  const maxPrice = Number(params.get("fiyat") ?? "4")
  const openNow = params.get("acik") === "1"
  const verified = params.get("dogru") === "1"
  const premium = params.get("one") === "1"
  const sort = (params.get("sirala") ?? "ilgili") as SortKey

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(patch)) {
      if (!value) next.delete(key)
      else next.set(key, value)
    }
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    setLimit(9)
  }

  const origin = useMemo(
    () =>
      namedCity && !place.nearMe
        ? cityCenter(namedCity)
        : { name: place.province || place.country || "Konum", lat: place.lat, lng: place.lng },
    [namedCity, place],
  )
  const scoped = useMemo(() => {
    const ranked = searchDirectory(
      catalog,
      query,
      {
        ...defaultFilters,
        sehir,
        kategori,
        minRating,
        maxPrice,
        openNow,
        verified,
        premium,
        sort,
      },
      origin,
    )
    if (namedCity && !place.nearMe) return { items: ranked, widened: false }
    return applyPlace(ranked, place)
  }, [catalog, query, sehir, kategori, minRating, maxPrice, openNow, verified, premium, sort, origin, namedCity, place])
  const results = scoped.items

  const activeCount = [kategori !== "hepsi", minRating > 0, maxPrice < 4, openNow, verified, premium].filter(Boolean).length
  const visible = results.slice(0, limit)

  const filters = (
    <div className="grid gap-4">
      <div className="rounded-2xl bg-card px-3 py-3 ring-1 ring-foreground/10">
        <p className="text-xs text-muted-foreground">Konum</p>
        <p className="mt-1 text-sm font-medium">{place.nearMe ? "Yakınımdakiler" : placeLabel(place)}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Eşleştirmenin yanındaki düğmeden ülke, bölge, il, ilçe veya semt değişir.
        </p>
      </div>
      <label className="grid gap-1.5 text-sm">
        Kategori
        <select
          className={fieldClass}
          value={kategori}
          onChange={(event) => update({ kategori: event.target.value })}
        >
          <option value="hepsi">Hepsi</option>
          {sectors.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <div>
        <p className="text-sm">En az puan</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            ["0", "Hepsi"],
            ["3.5", "3.5+"],
            ["4", "4+"],
            ["4.5", "4.5+"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => update({ puan: value === "0" ? null : value })}
              className={
                String(minRating || 0) === value
                  ? "rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground"
                  : "rounded-full bg-secondary px-3 py-1 text-xs"
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm">Fiyat tavanı</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            ["4", "Hepsi"],
            ["1", "₺"],
            ["2", "₺₺"],
            ["3", "₺₺₺"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => update({ fiyat: value === "4" ? null : value })}
              className={
                String(maxPrice) === value
                  ? "rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground"
                  : "rounded-full bg-secondary px-3 py-1 text-xs"
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3">
        <Label className="gap-2">
          <Checkbox checked={openNow} onCheckedChange={(checked) => update({ acik: checked === true ? "1" : null })} />
          Şu an açık
        </Label>
        <Label className="gap-2">
          <Checkbox checked={verified} onCheckedChange={(checked) => update({ dogru: checked === true ? "1" : null })} />
          Doğrulanmış
        </Label>
        <Label className="gap-2">
          <Checkbox checked={premium} onCheckedChange={(checked) => update({ one: checked === true ? "1" : null })} />
          Öne çıkan
        </Label>
      </div>
      {activeCount ? (
        <button
          type="button"
          className="text-left text-sm text-primary"
            onClick={() =>
            update({ kategori: "hepsi", puan: null, fiyat: null, acik: null, dogru: null, one: null })
          }
        >
          Süzgeçleri temizle
        </button>
      ) : null}
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <div className="max-w-3xl">
        <SearchForm
          key={query}
          initial={query}
          onSearch={(value) => update({ q: value || null, sehir: null, kategori: null })}
        />
      </div>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl">
            {query ? `“${query}”` : place.nearMe ? "Yakınımdakiler" : placeLabel(place)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {results.length} işletme
            {scoped.widened ? " · 40 km içinde örnek kayıt yok, en yakınlar duruyor" : ""}
            {query ? " · gerekçe her kartın altında" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="hidden text-sm md:block">
            <span className="sr-only">Sırala</span>
            <select
              className={fieldClass}
              value={sort}
              onChange={(event) => update({ sirala: event.target.value === "ilgili" ? null : event.target.value })}
            >
              {sorts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl md:hidden"
            onClick={() => setShowMap((value) => !value)}
          >
            {showMap ? "Liste" : "Harita"}
          </Button>
          <Sheet>
            <SheetTrigger
              render={<Button type="button" variant="outline" className="h-10 rounded-xl lg:hidden" />}
            >
              <SlidersHorizontal className="size-4" />
              Süz{activeCount ? ` ${activeCount}` : ""}
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl">
              <SheetHeader>
                <SheetTitle className="font-heading text-xl">Süzgeçler</SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto px-4 pb-6">{filters}</div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside className="hidden lg:block">{filters}</aside>
        <div>
          {showMap ? (
            <div className="mb-4 lg:hidden">
              <MiniMap label="Sonuçlar" points={results.slice(0, 30).map((item) => item.business)} focus={place} />
            </div>
          ) : null}
          {visible.length ? (
            <div className="grid gap-4">
              {visible.map((item) => (
                <BusinessCard
                  key={item.business.id}
                  business={item.business}
                  distanceKm={item.distanceKm}
                  reason={query ? item.reason : undefined}
                  layout="row"
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl bg-card px-5 py-10 ring-1 ring-foreground/10">
              <h2 className="font-heading text-2xl">Bu süzgeçte kayıt yok</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Örnek katalog İstanbul, Ankara, İzmir, Antalya ve Bursa kayıtlarından oluşur. Seçtiğin yer bu
                şehirlerin dışındaysa Google haritası o noktayı gösterir; eşleşen kart çıkmayabilir.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl"
                  onClick={() => update({ kategori: "hepsi", puan: null, fiyat: null, acik: null, dogru: null, one: null, sehir: "hepsi" })}
                >
                  Süzgeçleri kaldır
                </Button>
                <Button className="h-10 rounded-xl" nativeButton={false} render={<Link href="/talep" />}>
                  Talep oluştur
                </Button>
              </div>
            </div>
          )}
          {limit < results.length ? (
            <Button
              type="button"
              variant="outline"
              className="mt-4 h-11 w-full rounded-xl"
              onClick={() => setLimit((value) => value + 9)}
            >
              Daha fazla göster ({results.length - limit})
            </Button>
          ) : null}
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <MiniMap label="Sonuçlar" points={results.slice(0, 40).map((item) => item.business)} focus={place} />
          </div>
        </aside>
      </div>
    </div>
  )
}
