import type { Metadata } from "next"
import { connection } from "next/server"
import { notFound } from "next/navigation"
import { TextPage } from "@/components/directory/text-page"
import { pageBySlug, publicFaqs } from "@/lib/pages-flow"
import { contentPaths } from "@/lib/site-pages"

export function generateStaticParams() {
  return contentPaths.map((path) => ({ slug: path.slice(1) }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  await connection()
  const { slug } = await params
  const page = await pageBySlug(slug)
  if (!page) return { title: "Sayfa yok", robots: { index: false, follow: false } }
  return {
    title: page.seoTitle,
    description: page.seoDescription,
    alternates: { canonical: page.canonical },
    robots: page.index ? { index: true, follow: true } : { index: false, follow: true },
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  await connection()
  const { slug } = await params
  const page = await pageBySlug(slug)
  if (!page) notFound()
  const faqs = slug === "sss" ? await publicFaqs() : []
  return <TextPage page={page} faqs={faqs} />
}
