import Link from "next/link"
import { notFound } from "next/navigation"
import { BusinessCard } from "@/components/business-card"
import { businessesByCategory } from "@/lib/businesses"
import { CATEGORIES } from "@/lib/categories"
import type { CategoryId } from "@/lib/types"

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const cat = CATEGORIES.find((c) => c.id === slug)
  return { title: cat?.label ?? "Kategori" }
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const cat = CATEGORIES.find((c) => c.id === slug)
  if (!cat) notFound()
  const list = businessesByCategory(slug as CategoryId)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm text-muted-foreground">{cat.inspiredBy}</p>
      <h1 className="mt-1 text-3xl md:text-5xl">{cat.label}</h1>
      <p className="mt-2 text-muted-foreground">{cat.hint}</p>
      <p className="mt-4 text-sm">
        <Link href={`/ara?kategori=${cat.id}`} className="text-primary hover:underline">
          Harita ile gör
        </Link>
      </p>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {list.map((b) => (
          <BusinessCard key={b.slug} business={b} />
        ))}
      </div>
      {list.length === 0 && (
        <p className="mt-8 text-muted-foreground">Bu kategoride henüz kayıt yok.</p>
      )}
    </div>
  )
}
