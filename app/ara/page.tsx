import type { Metadata } from "next"
import { Suspense } from "react"
import { SearchScreen } from "@/components/directory/search-screen"
import { publishedTaxonomy, sectorMetadata } from "@/lib/taxonomy-server"

const fallback: Metadata = {
  title: "Arama",
  description: "Şehir, sektör, alt sektör, puan ve fiyat süzgeciyle işletme ara.",
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const params = await searchParams
  const raw = typeof params.kategori === "string" ? params.kategori : ""
  if (!raw || raw === "hepsi") return fallback
  const meta = sectorMetadata(await publishedTaxonomy(), raw)
  if (!meta) return { ...fallback, robots: { index: false, follow: true } }
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
  }
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="h-12 animate-pulse rounded-3xl bg-foreground/5" />
        </div>
      }
    >
      <SearchScreen />
    </Suspense>
  )
}
