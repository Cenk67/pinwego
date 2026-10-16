"use client"

import Link from "next/link"
import { SlidersHorizontal } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { GuideList } from "@/components/blog/guide-list"
import { useBlog } from "@/components/blog/blog-context"
import { publicArticles, searchGuides } from "@/lib/blog"
import { BusinessCard } from "@/components/directory/business-card"
import { MiniMap } from "@/components/directory/mini-map"
import { NeedAlternatives, NeedBrief, NeedFeedback } from "@/components/directory/need-brief"
import { SearchForm } from "@/components/directory/search-form"
import { VoiceTrail } from "@/components/directory/voice-search"
import { DiscoverOffer } from "@/components/discover/discover-offer"
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
import { discoverQuery, showDiscover } from "@/lib/discover"
import { useDiscoverSettings } from "@/lib/discover-store"
import { needIntent } from "@/lib/need"
import { rememberNeedContext, trackNeed } from "@/lib/need-client"
import { rememberNeed } from "@/lib/need-memory"
import { useNeedScope } from "@/lib/need-scope"
import { defaultFilters, parseQuery, searchDirectory } from "@/lib/match"
import { applyPlace, placeLabel } from "@/lib/place"
import { sectorCopy } from "@/lib/sector-copy"
import { childrenOf, pathOf, resolveNodeId, rootsOf, sortTr, type TaxonomyNode } from "@/lib/taxonomy"
import type { CategoryId, SortKey } from "@/lib/types"
import { useMinute } from "@/components/directory/hours-view"
import { liveList } from "@/lib/hours"
import { useLocale } from "@/lib/use-locale"
import { getVoiceTrail, voiceQueryMark } from "@/lib/voice/trail"

export function SearchScreen() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { place, sectors, visibleBusinesses, taxonomy, remap } = useDirectory()
  const { locale, t } = useLocale()
  const discoverSettings = useDiscoverSettings()
  const scope = useNeedScope()
  const blog = useBlog()
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
  const now = useMinute()

  const query = params.get("q") ?? ""
  const catalog = useMemo(() => liveList(visibleBusinesses, now), [visibleBusinesses, now])
  const parsed = parseQuery(query, catalog)
  const namedCity = params.get("sehir") ?? parsed.city
  const sehir = place.nearMe ? "hepsi" : namedCity ?? "hepsi"
  const rawKategori = params.get("kategori")
  // Old ids, aliases and sectors merged by the admin resolve to the live node; unknown ids fall back to "all".
  const resolvedKategori = rawKategori && rawKategori !== "hepsi" ? resolveNodeId(taxonomy, remap, rawKategori) : null
  const kategori = (rawKategori ? resolvedKategori ?? "hepsi" : parsed.category ?? "hepsi") as CategoryId | "hepsi"
  const sectorPath = kategori !== "hepsi" ? pathOf(taxonomy, kategori) : []
  const sectorMoved = Boolean(rawKategori && rawKategori !== "hepsi" && resolvedKategori && resolvedKategori !== rawKategori)
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
    const nearest = <T extends { distanceKm: number }>(items: T[]) =>
      [...items].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 8)
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
      if (relaxed.length && parsed.category) return { items: nearest(relaxed), widened: true, adsFilled: true as const }
    }
    if (!placed.items.length && ranked.length && parsed.category) {
      return { items: nearest(ranked), widened: true, adsFilled: false as const }
    }
    return { ...placed, adsFilled: false as const }
  }, [catalog, query, sehir, kategori, minRating, maxPrice, openNow, verified, premium, sort, origin, namedCity, place, parsed.category])
  const results = scoped.items

  const activeCount = [kategori !== "hepsi", minRating > 0, maxPrice < 4, openNow, verified, premium].filter(Boolean).length
  const visible = results.slice(0, limit)
  const hasPlace = Boolean(parsed.city || parsed.district || params.get("sehir")) || place.nearMe
  const intent = query ? needIntent(parsed.text) : "isletme"
  const needCity = namedCity && namedCity !== "hepsi" ? namedCity : place.nearMe ? "" : place.province
  const needCategory = parsed.category ?? ""
  const stage = !results.length ? "zero" : parsed.changes.length ? "corrected" : scoped.widened ? "nearby" : "direct"

  useEffect(() => {
    if (!query.trim()) return
    const voice = getVoiceTrail()?.mark === voiceQueryMark(query)
    rememberNeedContext(query, needCategory, needCity)
    rememberNeed(query)
    trackNeed(
      { kind: "search", q: query, category: needCategory, city: needCity, count: results.length, voice, stage, intent },
      `search.${query}.${needCity}`,
    )
    // Only a new sentence or city should count as a new search; result churn from filters should not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, needCity])

  useEffect(() => {
    if (!sectorMoved || !resolvedKategori) return
    const next = new URLSearchParams(params.toString())
    next.set("kategori", resolvedKategori)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    // The redirect depends only on the resolved id; the params object changes identity on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectorMoved, resolvedKategori])

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
          {sortTr(rootsOf(taxonomy).filter((root) => root.status === "aktif").map((root) => ({ ...root, label: sectorCopy(locale, root).label }))).map((root) => {
            const children = sortTr(childrenOf(taxonomy, root.id).filter((item) => item.status === "aktif"))
            if (!children.length) {
              return (
                <option key={root.id} value={root.id}>
                  {root.label}
                </option>
              )
            }
            return (
              <optgroup key={root.id} label={root.label}>
                <option value={root.id}>{t("search.sectorAll", { name: root.label })}</option>
                {children.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            )
          })}
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

  const safeQuery = discoverQuery(query)
  const thin = showDiscover(results.length, discoverSettings, Boolean(safeQuery))
  const showOutside = Boolean(safeQuery) && discoverSettings.enabled && scope !== "pinwego" && (thin || scope === "rehber")
  const guideHits = Boolean(safeQuery) && (thin || scope === "rehber" || intent === "bilgi") ? searchGuides(publicArticles(blog.document), query) : []
  const guideList = guideHits.length ? (
    <GuideList hits={guideHits} onOpen={() => trackNeed({ kind: "guide", q: query, category: needCategory, city: needCity })} />
  ) : null
  const alternatives = query && results.length < 3 ? (
    <NeedAlternatives
      parsed={parsed}
      sectors={sectors}
      catalog={catalog}
      city={sehir}
      active={kategori}
      onPick={(id) => update({ kategori: id })}
    />
  ) : null
  const discoverOffer = showOutside ? (
    <DiscoverOffer
      query={safeQuery}
      city={namedCity && namedCity !== "hepsi" ? namedCity : place.nearMe ? "" : place.province}
      count={results.length}
      guides={scope === "rehber" && !thin}
    />
  ) : null

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <div className="max-w-3xl">
        <SearchForm
          key={query}
          initial={query}
          onSearch={(value, voice) => {
            if (voice?.voice) {
              update({
                q: value || null,
                sehir: null,
                kategori: voice.kategori,
                acik: voice.acik,
                puan: voice.puan,
                sirala: voice.sirala,
              })
              return
            }
            update({ q: value || null, sehir: null, kategori: null })
          }}
        />
        <NeedBrief parsed={parsed} sectors={sectors} count={results.length} widened={scoped.widened} hasPlace={hasPlace} onPatch={update} />
      </div>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl">
            {query ? `“${query}”` : place.nearMe ? t("search.near") : placeLabel(place)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {results.length === 1 ? t("search.countOne") : t("search.count", { count: results.length })}
            {scoped.adsFilled ? ` · ${t("search.ads")}` : ""}
            {scoped.widened ? ` · ${t("search.widened")}` : ""}
            {query ? ` · ${t("search.reason")}` : ""}
          </p>
          <SectorPath path={sectorPath} moved={sectorMoved} onPick={(id) => update({ kategori: id })} />
          <VoiceTrail count={results.length} query={query} />
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
          {intent === "bilgi" && visible.length ? <div className="mb-4">{guideList}</div> : null}
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
            <>
              {alternatives}
              {guideList}
              {discoverOffer}
              <div className="rounded-3xl bg-card px-5 py-10 ring-1 ring-foreground/10">
              <h2 className="font-heading text-2xl">{query ? t("need.zeroTitle") : t("search.emptyTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{query ? t("need.zeroBody") : t("search.emptyBody")}</p>
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
            </>
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
          {results.length > 0 ? (
            <>
              {alternatives}
              {intent === "bilgi" ? null : guideList}
              {discoverOffer}
              <NeedFeedback key={query} query={query} category={needCategory} city={needCity} />
            </>
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

function SectorPath({ path, moved, onPick }: { path: TaxonomyNode[]; moved: boolean; onPick: (id: string) => void }) {
  const { locale, t } = useLocale()
  if (!path.length) return null
  const last = path[path.length - 1]
  return (
    <p className="mt-1 flex flex-wrap items-center gap-1 text-sm">
      <span className="text-muted-foreground">{t("search.sectorPath")}:</span>
      {path.map((node, index) => (
        <span key={node.id} className="flex items-center gap-1">
          {index ? <span className="text-muted-foreground">›</span> : null}
          <button type="button" onClick={() => onPick(node.id)} className={node.id === last.id ? "font-medium" : "text-primary"}>
            {index === 0 ? sectorCopy(locale, node).label : node.label}
          </button>
        </span>
      ))}
      {moved ? <span className="text-muted-foreground">· {t("search.sectorMoved", { name: last.label })}</span> : null}
    </p>
  )
}
