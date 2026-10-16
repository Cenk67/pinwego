import type { Metadata } from "next"
import { Suspense } from "react"
import { BusinessScreen } from "@/components/directory/business-screen"
import { businesses } from "@/lib/catalog"
import { PROFILE_ORIGIN, resolveProfile } from "@/lib/profile"

export function generateStaticParams() {
  return businesses.map((business) => ({ slug: business.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const business = businesses.find((item) => item.slug === slug)
  if (!business) return { title: "İşletme", robots: { index: false, follow: false } }
  const profile = resolveProfile(business)
  const url = `/isletme/${business.slug}`
  const image = profile.gallery.find((item) => item.active && item.image.startsWith("/"))
  return {
    title: profile.seoTitle || business.name,
    description: profile.seoDescription || business.summary,
    alternates: { canonical: url },
    openGraph: {
      title: profile.seoTitle || business.name,
      description: profile.seoDescription || business.summary,
      type: "website",
      url: `${PROFILE_ORIGIN}${url}`,
      images: image ? [{ url: image.image, alt: image.alt || business.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: profile.seoTitle || business.name,
      description: profile.seoDescription || business.summary,
      images: image ? [image.image] : undefined,
    },
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
