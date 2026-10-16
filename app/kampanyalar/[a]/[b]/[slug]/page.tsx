import type { Metadata } from "next"
import { connection } from "next/server"
import { Suspense } from "react"
import { CampaignDetail } from "@/components/campaigns/campaign-detail"
import { campaignJsonLd, campaignPath, findSeedCampaign, isPublic } from "@/lib/campaigns"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ a: string; b: string; slug: string }>
}): Promise<Metadata> {
  await connection()
  const { slug } = await params
  const campaign = findSeedCampaign(slug)
  if (!campaign) return { title: "Kampanya", robots: { index: false, follow: false } }
  const path = campaignPath(campaign)
  const index = isPublic(campaign)
  return {
    title: `${campaign.title} · ${campaign.businessName}`,
    description: campaign.shortText,
    alternates: { canonical: path },
    robots: index ? undefined : { index: false, follow: false },
    openGraph: {
      title: campaign.title,
      description: campaign.shortText,
      url: `https://pinwego.com${path}`,
      images: campaign.image.startsWith("/") ? [{ url: campaign.image, alt: campaign.title }] : undefined,
    },
  }
}

export default function Page({ params }: { params: Promise<{ a: string; b: string; slug: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10"><div className="h-72 animate-pulse rounded-3xl bg-foreground/5" /></div>}>
      <Detail params={params} />
    </Suspense>
  )
}

async function Detail({ params }: { params: Promise<{ a: string; b: string; slug: string }> }) {
  await connection()
  const { slug } = await params
  const campaign = findSeedCampaign(slug)
  const live = campaign && isPublic(campaign)
  return (
    <>
      {campaign && live ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(campaignJsonLd(campaign)) }} />
      ) : null}
      <CampaignDetail slug={slug} />
    </>
  )
}
