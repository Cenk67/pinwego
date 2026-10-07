import { BUSINESSES } from "@/lib/businesses"
import { BusinessProfile } from "./profile"

export const instant = false

export function generateStaticParams() {
  return BUSINESSES.map((b) => ({ slug: b.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const b = BUSINESSES.find((x) => x.slug === slug)
  return {
    title: b ? `${b.name} · ${b.district}` : "İşletme",
    description: b?.description,
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <BusinessProfile slug={slug} />
}
