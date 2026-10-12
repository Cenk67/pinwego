import type { Metadata } from "next"
import { Suspense } from "react"
import { CampaignBoard } from "@/components/campaigns/campaign-board"
import { resolveSegment, sectorLabel } from "@/lib/campaigns"

export async function generateMetadata({ params }: { params: Promise<{ a: string }> }): Promise<Metadata> {
  const { a } = await params
  const resolved = resolveSegment(a)
  if (!resolved) return { title: "Kampanyalar", robots: { index: false, follow: false } }
  const label = resolved.kind === "city" ? resolved.city : sectorLabel(resolved.category)
  const path = `/kampanyalar/${a}`
  return {
    title: `${label} kampanyaları`,
    description: `${label} için onaylı ve tarihi süren kampanyalar.`,
    alternates: { canonical: path },
    openGraph: { title: `${label} kampanyaları`, description: `${label} kampanyaları`, url: `https://pinwego.com${path}` },
  }
}

export default function Page({ params }: { params: Promise<{ a: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-16"><div className="h-12 animate-pulse rounded-3xl bg-foreground/5" /></div>}>
      <Segment params={params} />
    </Suspense>
  )
}

async function Segment({ params }: { params: Promise<{ a: string }> }) {
  const { a } = await params
  const resolved = resolveSegment(a)
  if (!resolved) return <CampaignBoard />
  if (resolved.kind === "city") return <CampaignBoard city={a} />
  return <CampaignBoard category={resolved.category} />
}
