import type { Metadata } from "next"
import { Suspense } from "react"
import { CampaignBoard } from "@/components/campaigns/campaign-board"

export const metadata: Metadata = {
  title: "Kampanyalar",
  description: "Onaylı ve tarihi süren pinwego kampanyaları. Şehir, kategori ve indirimle süzün.",
  alternates: { canonical: "/kampanyalar" },
  openGraph: {
    title: "Kampanyalar",
    description: "Onaylı ve tarihi süren pinwego kampanyaları.",
    url: "https://pinwego.com/kampanyalar",
  },
}

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-16"><div className="h-12 animate-pulse rounded-3xl bg-foreground/5" /></div>}>
      <CampaignBoard />
    </Suspense>
  )
}
