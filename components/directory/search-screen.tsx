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
import { cityCenter } from "@/lib/catalog"
import { useDirectory } from "@/lib/directory-context"
import { defaultFilters, parseQuery, searchDirectory } from "@/lib/match"
import { applyPlace, placeLabel } from "@/lib/place"
import { sectorCopy } from "@/lib/sector-copy"
import type { CategoryId, SortKey } from "@/lib/types"
import { useLocale } from "@/lib/use-locale"

export function SearchScreen() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { place, sectors, visibleBusinesses } = useDirectory()
  const { locale, t } = useLocale()
  const sorts: { id: SortKey; label: string }[] = [
    { id: "ilgili", label: t("search.sortRelevant") },
    { id: "puan", label: t("search.sortRating") },
    { id: "yorum", label: t("search.sortReviews") },
    { id: "mesafe", label: t("search.sortDistance") },
    { id: "yanit", label: t("search.sortResponse") },
    { id: "fiyat", label: t("search.sortPrice") },
  ]
  const [showMap, setShowMap] = useState(false)
  const [limit, setLimit] = useState(9)

  const query = params.get("q") ?? ""
  const catalog = visibleBusinesses
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
    const placed = namedCity && !place.nearMe ? { items: ranked, widened: false } : applyPlace(ranked, place)
    if (premium && !placed.items.length) {
      const relaxed = searchDirectory(
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
          premium: false,
          sort,
        },
        origin,
      )
      const local = namedCity && !place.nearMe ? { items: relaxed, widened: false } : applyPlace(relaxed, place)
      if (local.items.length) return { ...local, adsFilled: true as const }
    }
    return { ...placed, adsFilled: false as const }
  }, [catalog, query, sehir, kategori, minRating, maxPrice, openNow, verified, premium, sort, origin, namedCity, place])
  const results = scoped.items

  const activeCount = [kategori !== "hepsi", minRating > 0, maxPrice < 4, openNow, verified, premium].filter(Boolean).length
  const visible = results.slice(0, limit)

  const filters = (
    <div className="grid gap-4">
      <div className="rounded-2xl bg-card px-3 py-3 ring-1 ring-foreground/10">
        <p className="text-xs text-muted-foreground">{t("search.place")}</p>
        <p className="mt-1 text-sm font-medium">{place.nearMe ? t("search.near") : placeLabel(place)}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("search.placeHint")}</p>
      </div>
      <label className="grid gap-1.5 text-sm">
        {t("search.category")}
        <select
          className={fieldClass}
          value={kategori}
          onChange={(event) => update({ kategori: event.target.value })}
        >
          <option value="hepsi">{t("home.all")}</option>
          {sectors.map((item) => (
            <option key={item.id} value={item.id}>
              {sectorCopy(locale, item).label}
            </option>
          ))}
        </select>
      </label>
      <div>
        <p className="text-sm">{t("search.minRating")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            ["0", t("home.all")],
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
        <p className="text-sm">{t("search.priceCap")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            ["4", t("home.all")],
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
          {t("search.openNow")}
        </Label>
        <Label className="gap-2">
          <Checkbox checked={verified} onCheckedChange={(checked) => update({ dogru: checked === true ? "1" : null })} />
          {t("search.verified")}
        </Label>
        <Label className="gap-2">
          <Checkbox checked={premium} onCheckedChange={(checked) => update({ one: checked === true ? "1" : null })} />
          {t("search.featured")}
        </Label>
      </div>
      {activeCount ? (
        <button
          type="button"
          className="text-start text-sm text-primary"
            onClick={() =>
            update({ kategori: "hepsi", puan: null, fiyat: null, acik: null, dogru: null, one: null })
          }
        >
          {t("search.clear")}
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
            {query ? `“${query}”` : place.nearMe ? t("search.near") : placeLabel(place)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("search.count", { count: results.length })}
            {scoped.adsFilled ? ` · ${t("search.ads")}` : ""}
            {scoped.widened ? ` · ${t("search.widened")}` : ""}
            {query ? ` · ${t("search.reason")}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="hidden text-sm md:block">
            <span className="sr-only">{t("search.sortRelevant")}</span>
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
            {showMap ? t("home.list") : t("search.map")}
          </Button>
          <Sheet>
            <SheetTrigger
              render={<Button type="button" variant="outline" className="h-10 rounded-xl lg:hidden" />}
            >
              <SlidersHorizontal className="size-4" />
              {t("search.filterShort")}
              {activeCount ? ` ${activeCount}` : ""}
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl">
              <SheetHeader>
                <SheetTitle className="font-heading text-xl">{t("search.filters")}</SheetTitle>
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
              <MiniMap label={t("search.resultsLabel")} points={results.slice(0, 30).map((item) => item.business)} focus={place} />
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
              <h2 className="font-heading text-2xl">{t("search.emptyTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("search.emptyBody")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl"
                  onClick={() => update({ kategori: "hepsi", puan: null, fiyat: null, acik: null, dogru: null, one: null, sehir: "hepsi" })}
                >
                  {t("search.clearAll")}
                </Button>
                <Button className="h-10 rounded-xl" nativeButton={false} render={<Link href="/talep" />}>
                  {t("nav.request")}
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
              {t("search.more", { count: results.length - limit })}
            </Button>
          ) : null}
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <MiniMap label={t("search.resultsLabel")} points={results.slice(0, 40).map((item) => item.business)} focus={place} />
          </div>
        </aside>
      </div>
    </div>
  )
}
