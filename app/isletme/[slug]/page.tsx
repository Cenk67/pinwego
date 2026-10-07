import type { Metadata } from "next"
import { BusinessScreen } from "@/components/directory/business-screen"
import { businesses } from "@/lib/catalog"

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
  if (!business) return { title: "İşletme" }
  return {
    title: business.name,
    description: business.summary,
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <BusinessScreen slug={slug} />
}
