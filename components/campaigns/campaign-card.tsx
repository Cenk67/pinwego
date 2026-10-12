"use client"

import Link from "next/link"
import { useEffect } from "react"
import { BadgeCheck } from "lucide-react"
import { Cover, Stars } from "@/components/directory/bits"
import { campaignPath, liveStatus, sectorLabel, sponsoredActive, todayISO, type Campaign, type Trust } from "@/lib/campaigns"
import { trackCampaign } from "@/lib/campaign-store"
import { useLocale } from "@/lib/use-locale"

export function formatDay(value: string, locale: string) {
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(locale === "zh" ? "zh-CN" : locale)
}

export function CampaignCard({ campaign, trust, compact = false }: { campaign: Campaign; trust?: Trust | null; compact?: boolean }) {
  const { locale, t } = useLocale()
  const today = todayISO()
  const live = liveStatus(campaign, today)
  const href = campaignPath(campaign)
  const badge = campaign.discountPercent > 0 ? `%${campaign.discountPercent}` : campaign.advantage

  useEffect(() => {
    if (live === "published") trackCampaign(campaign.id, "view")
  }, [campaign.id, live])

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10">
      <Link href={href} onClick={() => trackCampaign(campaign.id, "click")} className="flex h-full flex-col">
        <div className="relative">
          <Cover src={campaign.image} alt="" className={compact ? "h-36 w-full" : "h-44 w-full"} />
          {badge ? (
            <span className="absolute start-3 top-3 rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">{badge}</span>
          ) : null}
          {sponsoredActive(campaign, today) ? (
            <span className="absolute end-3 top-3 rounded-full bg-card px-3 py-1 text-xs">{t("campaign.sponsored")}</span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <p className="text-xs text-muted-foreground">
            {campaign.businessName}
            {trust?.verified ? <BadgeCheck className="ms-1 inline size-3.5 text-primary" aria-hidden /> : null}
          </p>
          <h3 className="mt-1 font-heading text-xl leading-tight">{campaign.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{campaign.shortText}</p>
          {trust && trust.rating > 0 ? <Stars rating={trust.rating} className="mt-2" /> : null}
          <p className="mt-auto pt-3 text-xs text-muted-foreground">
            {campaign.district}, {campaign.city} · {sectorLabel(campaign.category)}
          </p>
          <p className="mt-1 text-xs">
            {t("campaign.until")} {formatDay(campaign.endDate, locale)}
          </p>
          <span className="mt-3 text-sm text-primary">{t("campaign.see")}</span>
        </div>
      </Link>
    </article>
  )
}
