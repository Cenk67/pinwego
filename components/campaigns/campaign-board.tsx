"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CampaignCard } from "@/components/campaigns/campaign-card"
import { fieldClass } from "@/components/directory/bits"
import { Button } from "@/components/ui/button"
import { useCampaigns } from "@/lib/campaign-store"
import { cities } from "@/lib/catalog"
import {
  citySlug,
  listPublic,
  NEAR_KM,
  resolveSegment,
  todayISO,
  type CampaignSort,
  type Trust,
} from "@/lib/campaigns"
import { useDirectory } from "@/lib/directory-context"
import { sectorCopy } from "@/lib/sector-copy"
import { seedSectors } from "@/lib/sectors"
import { useLocale } from "@/lib/use-locale"

const pageSize = 9

export function CampaignBoard({ city = "", category = "" }: { city?: string; category?: string }) {
  const params = useSearchParams()
  const router = useRouter()
  const { locale, t } = useLocale()
  const { campaigns, settings, viewedCategories } = useCampaigns()
  const { visibleBusinesses, place } = useDirectory()
  const [limit, setLimit] = useState(pageSize)
  const q = params.get("q") ?? ""
  const discount = params.get("indirim") ?? ""
  const sort = (params.get("sirala") as CampaignSort) || "populer"
  const ending = params.get("bitis") === "3"
  const wantNear = params.get("yakin") === "1"
  const resolvedCity = city || params.get("sehir") || ""
  const resolvedCategory = category || params.get("kategori") || ""
  const cityName = resolveSegment(resolvedCity)?.kind === "city" ? resolveSegment(resolvedCity)?.city ?? "" : resolvedCity
  const trustFor = (id: string): Trust | null => {
    const business = visibleBusinesses.find((item) => item.id === id)
    if (!business) return null
    return { verified: business.verified, rating: business.rating, reviewCount: business.reviewCount }
  }
  const rows = useMemo(
    () =>
      listPublic(
        campaigns,
        {
          q,
          city: cityName,
          category: resolvedCategory,
          minDiscount: Number(discount || 0),
          sort,
          endingDays: ending ? 3 : 0,
          near: wantNear && place.nearMe ? { lat: place.lat, lng: place.lng } : null,
          viewedCategories,
        },
        settings,
        todayISO(),
        (campaign) => trustFor(campaign.businessId),
      ),
    // trustFor closes over visible businesses; the list identity is the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [campaigns, q, cityName, resolvedCategory, discount, sort, ending, wantNear, place.nearMe, place.lat, place.lng, settings, viewedCategories, visibleBusinesses],
  )
  const shown = rows.slice(0, limit)

  function visit(next: { city?: string; category?: string; q?: string; indirim?: string; sirala?: string; bitis?: boolean; yakin?: boolean }) {
    const search = new URLSearchParams()
    const text = next.q ?? q
    const rate = next.indirim ?? discount
    const order = next.sirala ?? (sort === "populer" ? "" : sort)
    const soon = next.bitis ?? ending
    const local = next.yakin ?? wantNear
    if (text.trim()) search.set("q", text.trim())
    if (rate && rate !== "0") search.set("indirim", rate)
    if (order && order !== "populer") search.set("sirala", order)
    if (soon) search.set("bitis", "3")
    if (local) search.set("yakin", "1")
    const nextCity = next.city ?? resolvedCity
    const nextCategory = next.category ?? resolvedCategory
    let path = "/kampanyalar"
    if (nextCity && nextCategory) path = `/kampanyalar/${nextCity}/${nextCategory}`
    else if (nextCity) path = `/kampanyalar/${nextCity}`
    else if (nextCategory) path = `/kampanyalar/${nextCategory}`
    const query = search.toString()
    setLimit(pageSize)
    router.push(query ? `${path}?${query}` : path)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <p className="text-sm font-medium text-primary">pinwego</p>
      <h1 className="mt-2 font-heading text-4xl leading-tight md:text-5xl">{t("campaign.title")}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{t("campaign.lead")}</p>
      <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">{t("campaign.sample")}</p>
      <form
        className="mt-6 grid gap-2 md:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          visit({ q: String(data.get("q") ?? "") })
        }}
      >
        <input name="q" defaultValue={q} placeholder={t("campaign.search")} className={fieldClass} key={q} />
        <select
          className={fieldClass}
          value={resolvedCity}
          onChange={(event) => visit({ city: event.target.value })}
          aria-label={t("campaign.city")}
        >
          <option value="">{t("campaign.all")}</option>
          {cities.map((item) => (
            <option key={item.name} value={citySlug(item.name)}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          className={fieldClass}
          value={resolvedCategory}
          onChange={(event) => visit({ category: event.target.value })}
          aria-label={t("campaign.category")}
        >
          <option value="">{t("campaign.category")}</option>
          {seedSectors.map((sector) => (
            <option key={sector.id} value={sector.id}>
              {sectorCopy(locale, sector).label}
            </option>
          ))}
        </select>
        <select className={fieldClass} value={discount} onChange={(event) => visit({ indirim: event.target.value })} aria-label={t("campaign.discount")}>
          <option value="">{t("campaign.discount")}</option>
          <option value="10">%10+</option>
          <option value="20">%20+</option>
          <option value="30">%30+</option>
          <option value="50">%50+</option>
        </select>
        <select className={fieldClass} value={sort} onChange={(event) => visit({ sirala: event.target.value })} aria-label={t("campaign.sort")}>
          <option value="populer">{t("campaign.popular")}</option>
          <option value="yeni">{t("campaign.newest")}</option>
          <option value="bitis">{t("campaign.ending")}</option>
          <option value="indirim">{t("campaign.discount")}</option>
        </select>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => visit({ bitis: !ending })} className={ending ? "rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground" : "rounded-full bg-secondary px-3 py-1.5 text-sm"}>
          {t("campaign.endingDays", { count: 3 })}
        </button>
        <button type="button" onClick={() => visit({ yakin: !wantNear })} className={wantNear ? "rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground" : "rounded-full bg-secondary px-3 py-1.5 text-sm"}>
          {t("campaign.nearby")}
        </button>
        <Link href="/kampanyalar" className="rounded-full bg-secondary px-3 py-1.5 text-sm">
          {t("campaign.clear")}
        </Link>
      </div>
      {wantNear && !place.nearMe ? <p className="mt-3 text-sm text-muted-foreground">{t("campaign.nearHint")}</p> : null}
      {wantNear && place.nearMe ? <p className="mt-3 text-sm text-muted-foreground">{t("campaign.nearOn", { km: NEAR_KM })}</p> : null}
      {shown.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} trust={trustFor(campaign.businessId)} />
          ))}
        </div>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">{t("campaign.empty")}</p>
      )}
      {rows.length > shown.length ? (
        <Button type="button" variant="outline" className="mt-6 h-11 rounded-full" onClick={() => setLimit((value) => value + pageSize)}>
          {t("campaign.more")}
        </Button>
      ) : null}
    </div>
  )
}
