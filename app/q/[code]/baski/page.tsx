import type { Metadata } from "next"
import { QrMissing } from "@/components/qr/qr-landing"
import { QrPoster } from "@/components/qr/qr-poster"
import { findBusiness, resolveQr } from "@/lib/qr"

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params
  const hit = resolveQr(code)
  const business = hit ? findBusiness(hit.businessId) : null
  return {
    title: business ? `${business.name} baskı` : "QR baskı",
    robots: { index: false, follow: true },
  }
}

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const hit = resolveQr(code)
  const business = hit ? findBusiness(hit.businessId) : null
  if (!hit || !business || business.profile?.published === false) return <QrMissing />
  return (
    <QrPoster
      code={hit.code}
      name={business.name}
      photo={business.photo}
      city={business.city}
      district={business.district}
    />
  )
}
