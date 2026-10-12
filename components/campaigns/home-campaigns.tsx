"use client"

import Link from "next/link"
import { CampaignCard } from "@/components/campaigns/campaign-card"
import { useCampaigns } from "@/lib/campaign-store"
import { citySlug, listPublic, todayISO, type Campaign, type Trust } from "@/lib/campaigns"
import { useDirectory } from "@/lib/directory-context"
import { useLocale } from "@/lib/use-locale"

function trustFor(businesses: { id: string; verified: boolean; rating: number; reviewCount: number }[], id: string): Trust | null {
  const business = businesses.find((item) => item.id === id)
  if (!business) return null
  return { verified: business.verified, rating: business.rating, reviewCount: business.reviewCount }
}

function Strip({ title, href, rows, trust }: { title: string; href: string; rows: Campaign[]; trust: (id: string) => Trust | null }) {
  const { t } = useLocale()
  if (!rows.length) return null
  return (
    <div className="mt-8">
      <div className="flex items-end justify-between gap-4">
        <h3 className="font-heading text-2xl">{title}</h3>
        <Link href={href} className="text-sm text-primary">
          {t("campaign.all")}
        </Link>
      </div>
      <div className="-mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {rows.map((campaign) => (
          <div key={campaign.id} className="w-72 shrink-0">
            <CampaignCard campaign={campaign} trust={trust(campaign.businessId)} compact />
          </div>
        ))}
      </div>
    </div>
  )
}

export function HomeCampaigns() {
  const { t } = useLocale()
  const { campaigns, settings, viewedCategories } = useCampaigns()
  const { visibleBusinesses, place } = useDirectory()
  const today = todayISO()
  const trust = (id: string) => trustFor(visibleBusinesses, id)
  const popular = listPublic(campaigns, { sort: "populer", viewedCategories }, settings, today, (campaign) => trust(campaign.businessId)).slice(0, 6)
  const ending = listPublic(campaigns, { sort: "bitis", endingDays: 7 }, settings, today).slice(0, 6)
  const half = listPublic(campaigns, { sort: "indirim", minDiscount: 50 }, settings, today).slice(0, 6)
  const local = listPublic(campaigns, { city: place.province, sort: "populer" }, settings, today).slice(0, 6)

  if (!popular.length) return null

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl">{t("campaign.today")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("campaign.lead")}</p>
        </div>
        <Link href="/kampanyalar" className="text-sm text-primary">
          {t("campaign.all")}
        </Link>
      </div>
      <div className="-mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {popular.map((campaign) => (
          <div key={campaign.id} className="w-72 shrink-0">
            <CampaignCard campaign={campaign} trust={trust(campaign.businessId)} compact />
          </div>
        ))}
      </div>
      <Strip title={t("campaign.ending")} href="/kampanyalar?sirala=bitis&bitis=3" rows={ending} trust={trust} />
      <Strip title={t("campaign.half")} href="/kampanyalar?indirim=50&sirala=indirim" rows={half} trust={trust} />
      <Strip title={t("campaign.inCity", { city: place.province })} href={`/kampanyalar/${citySlug(place.province)}`} rows={local} trust={trust} />
    </section>
  )
}
