import type { Metadata } from "next"
import { CategoryScreen } from "@/components/blog/blog-screens"
import { categoryPath, findCategory } from "@/lib/blog"
import { publishedBlog } from "@/lib/blog-server"

export async function generateStaticParams() {
  const blog = await publishedBlog()
  return blog.categories.map((category) => ({ category: category.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params
  const match = findCategory(await publishedBlog(), category)
  if (!match) return { title: "Blog", robots: { index: false, follow: false } }
  return {
    title: match.name,
    description: match.description,
    alternates: { canonical: categoryPath(match.slug) },
  }
}

export default async function Page({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  return <CategoryScreen slug={category} />
}
