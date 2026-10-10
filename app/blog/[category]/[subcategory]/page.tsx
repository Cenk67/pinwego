import type { Metadata } from "next"
import { SubcategoryScreen } from "@/components/blog/blog-screens"
import { findSubcategory, subcategoryPath } from "@/lib/blog"
import { publishedBlog } from "@/lib/blog-server"

export async function generateStaticParams() {
  const blog = await publishedBlog()
  return blog.subcategories.flatMap((subcategory) => {
    const category = blog.categories.find((item) => item.id === subcategory.categoryId)
    return category ? [{ category: category.slug, subcategory: subcategory.slug }] : []
  })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; subcategory: string }>
}): Promise<Metadata> {
  const { category, subcategory } = await params
  const match = findSubcategory(await publishedBlog(), category, subcategory)
  if (!match) return { title: "Blog", robots: { index: false, follow: false } }
  return {
    title: `${match.subcategory.name} · ${match.category.name}`,
    description: match.subcategory.description,
    alternates: { canonical: subcategoryPath(match.category.slug, match.subcategory.slug) },
  }
}

export default async function Page({ params }: { params: Promise<{ category: string; subcategory: string }> }) {
  const { category, subcategory } = await params
  return <SubcategoryScreen categorySlug={category} subcategorySlug={subcategory} />
}
