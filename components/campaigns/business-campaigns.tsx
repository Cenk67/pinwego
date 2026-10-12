"use client"

import { CampaignCard } from "@/components/campaigns/campaign-card"
import { useCampaigns } from "@/lib/campaign-store"
import { isPublic, todayISO } from "@/lib/campaigns"
import { useDirectory } from "@/lib/directory-context"
import { useLocale } from "@/lib/use-locale"

export function BusinessCampaigns({ businessId }: { businessId: string }) {
  const { t } = useLocale()
  const { campaigns } = useCampaigns()
  const { visibleBusinesses } = useDirectory()
  const today = todayISO()
  const business = visibleBusinesses.find((item) => item.id === businessId)
  const rows = campaigns.filter((campaign) => campaign.businessId === businessId && isPublic(campaign, today))
  if (!rows.length) return null
  const trust = business ? { verified: business.verified, rating: business.rating, reviewCount: business.reviewCount } : null
  return (
    <section className="mt-8">
      <h2 className="font-heading text-2xl">{t("campaign.current")}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {rows.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} trust={trust} compact />
        ))}
      </div>
    </section>
  )
}
