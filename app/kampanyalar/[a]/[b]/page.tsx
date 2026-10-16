import type { Metadata } from "next"
import { Suspense } from "react"
import { CampaignBoard } from "@/components/campaigns/campaign-board"
import { resolveSegment, sectorLabel } from "@/lib/campaigns"

export async function generateMetadata({ params }: { params: Promise<{ a: string; b: string }> }): Promise<Metadata> {
  const { a, b } = await params
  const city = resolveSegment(a)
  const category = resolveSegment(b)
  if (city?.kind !== "city" || category?.kind !== "category") return { title: "Kampanyalar", robots: { index: false, follow: false } }
  const label = `${city.city} ${sectorLabel(category.category)}`
  const path = `/kampanyalar/${a}/${b}`
  return {
    title: `${label} kampanyaları`,
    description: `${label} için onaylı kampanyalar.`,
    alternates: { canonical: path },
    openGraph: { title: `${label} kampanyaları`, description: `${label} kampanyaları`, url: `https://pinwego.com${path}` },
  }
}

export default function Page({ params }: { params: Promise<{ a: string; b: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-16"><div className="h-12 animate-pulse rounded-3xl bg-foreground/5" /></div>}>
      <Segment params={params} />
    </Suspense>
  )
}

async function Segment({ params }: { params: Promise<{ a: string; b: string }> }) {
  const { a, b } = await params
  const city = resolveSegment(a)
  const category = resolveSegment(b)
  if (city?.kind !== "city" || category?.kind !== "category") return <CampaignBoard />
  return <CampaignBoard city={a} category={category.category} />
}
