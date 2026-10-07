import Link from "next/link"
import { notFound } from "next/navigation"
import { BusinessCard } from "@/components/business-card"
import { MapPanel } from "@/components/map-panel"
import { businessesByCity } from "@/lib/businesses"
import { CITIES } from "@/lib/categories"

export function generateStaticParams() {
  return CITIES.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const city = CITIES.find((c) => c.slug === slug)
  return { title: city ? `${city.label} işletmeleri` : "Şehir" }
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const city = CITIES.find((c) => c.slug === slug)
  if (!city) notFound()
  const list = businessesByCity(slug)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm text-muted-foreground">
        {city.country} · yerel dizin
      </p>
      <h1 className="mt-1 text-3xl md:text-5xl">{city.label}</h1>
      <p className="mt-2 text-muted-foreground">
        {list.length} işletme. Loc8NearMe tarzı “yakınımda” bu şehir merkezine göre hesaplanır.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-3">
          {list.map((b) => (
            <BusinessCard key={b.slug} business={b} />
          ))}
          {list.length === 0 && (
            <p className="text-muted-foreground">Bu şehirde henüz kayıt yok.</p>
          )}
        </div>
        <MapPanel items={list} />
      </div>
      <p className="mt-6 text-sm">
        <Link href={`/ara?sehir=${city.slug}`} className="text-primary hover:underline">
          Filtreli arama
        </Link>
      </p>
    </div>
  )
}
