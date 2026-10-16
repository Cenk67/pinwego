import type { Metadata } from "next"
import { connection } from "next/server"
import { QrMissing } from "@/components/qr/qr-landing"
import { QrPoster } from "@/components/qr/qr-poster"
import { openQr } from "@/lib/qr-open"

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  await connection()
  const { code } = await params
  const opened = await openQr(code)
  return {
    title: opened ? `${opened.business.name} baskı` : "QR baskı",
    robots: { index: false, follow: true },
  }
}

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  await connection()
  const { code } = await params
  const opened = await openQr(code)
  if (!opened) return <QrMissing />
  const { hit, business } = opened
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
