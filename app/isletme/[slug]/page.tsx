import type { Metadata } from "next"
import { Suspense } from "react"
import { BusinessScreen } from "@/components/directory/business-screen"
import { businesses } from "@/lib/catalog"

export function generateStaticParams() {
  return businesses
    .filter((business) => business.source !== "google")
    .map((business) => ({ slug: business.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const business = businesses.find((item) => item.slug === slug)
  if (!business) return { title: "İşletme" }
  return {
    title: business.name,
    description: business.summary,
  }
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="h-72 animate-pulse rounded-3xl bg-foreground/5" />
        </div>
      }
    >
      <BusinessProfile params={params} />
    </Suspense>
  )
}

async function BusinessProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <BusinessScreen slug={slug} />
}
