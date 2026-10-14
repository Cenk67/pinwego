import type { Metadata } from "next"
import { connection } from "next/server"
import { QrLanding, QrMissing, type QrCardBusiness } from "@/components/qr/qr-landing"
import { liveStatus, seedCampaigns } from "@/lib/campaigns"
import { findBusiness, resolveQr } from "@/lib/qr"
import type { Business } from "@/lib/types"

function cardOf(business: Business): QrCardBusiness {
  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
    category: business.category,
    summary: business.summary,
    phone: business.phone,
    address: business.address,
    city: business.city,
    district: business.district,
    website: business.website,
    photo: business.photo,
    openNow: business.openNow,
    hours: business.hours,
    hourBook: business.hourBook,
    lat: business.lat,
    lng: business.lng,
    verified: business.verified,
  }
}

function openCard(code: string) {
  const hit = resolveQr(code)
  const business = hit ? findBusiness(hit.businessId) : null
  if (!hit || !business || business.profile?.published === false) return null
  return { hit, business }
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params
  const opened = openCard(code)
  if (!opened) return { title: "QR kart", robots: { index: false, follow: true } }
  return {
    title: opened.business.name,
    description: opened.business.summary,
    alternates: { canonical: `/q/${opened.hit.code}` },
    robots: { index: false, follow: true },
  }
}

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  await connection()
  const { code } = await params
  const opened = openCard(code)
  if (!opened) return <QrMissing />
  const today = new Date().toISOString().slice(0, 10)
  const source = opened.hit.campaignId ? seedCampaigns.find((item) => item.id === opened.hit.campaignId) : undefined
  const campaign = source
    ? {
        id: source.id,
        slug: source.slug,
        title: source.title,
        advantage: source.advantage,
        live: liveStatus(source, today) === "published",
      }
    : null
  return <QrLanding hit={opened.hit} business={cardOf(opened.business)} campaign={campaign} />
}
