import type { Metadata } from "next"
import { ArticleScreen } from "@/components/blog/blog-screens"
import { absoluteUrl, articlePath, findArticle } from "@/lib/blog"
import { publishedBlog } from "@/lib/blog-server"

export async function generateStaticParams() {
  const blog = await publishedBlog()
  return blog.articles.map((article) => ({
    category: article.categorySlug,
    subcategory: article.subcategorySlug,
    slug: article.slug,
  }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; subcategory: string; slug: string }>
}): Promise<Metadata> {
  const { category, subcategory, slug } = await params
  const article = findArticle(await publishedBlog(), category, subcategory, slug)
  if (!article) return { title: "Blog", robots: { index: false, follow: false } }
  const image = article.image.startsWith("/") ? [{ url: article.image, alt: article.imageAlt }] : undefined
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: articlePath(article) },
    openGraph: {
      title: article.title,
      description: article.description,
      type: "article",
      url: absoluteUrl(articlePath(article)),
      images: image,
    },
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ category: string; subcategory: string; slug: string }>
}) {
  const { category, subcategory, slug } = await params
  return <ArticleScreen categorySlug={category} subcategorySlug={subcategory} slug={slug} />
}
