import type { MetadataRoute } from "next"
import { NEWS_CATEGORY_ID, absoluteUrl, articlePath, categoryPath, subcategoryPath } from "@/lib/blog"
import { publishedBlogAt } from "@/lib/blog-server"
import { contactPublished } from "@/lib/inbox-flow"
import { sitemapPages } from "@/lib/pages-flow"
import { publishedTaxonomy, sectorSearchPath } from "@/lib/taxonomy-server"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blog = await publishedBlogAt(0)
  const pages = await sitemapPages()
  const contact = await contactPublished()
  const sectors = await publishedTaxonomy()
  const now = new Date("2026-10-10")
  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...(contact ? [{ url: absoluteUrl("/iletisim"), lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 }] : []),
    ...pages.map((page) => ({
      url: page.canonical,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: page.legal ? 0.4 : 0.6,
    })),
    { url: absoluteUrl("/ara"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    ...sectors.nodes.map((node) => ({
      url: absoluteUrl(sectorSearchPath(node.id)),
      lastModified: node.updatedAt ? new Date(node.updatedAt) : now,
      changeFrequency: "weekly" as const,
      priority: node.parentId ? 0.5 : 0.7,
    })),
    { url: absoluteUrl("/blog"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...blog.categories
      .filter((category) => category.id !== NEWS_CATEGORY_ID || blog.articles.some((article) => article.categoryId === category.id))
      .map((category) => ({
        url: absoluteUrl(categoryPath(category.slug)),
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ...blog.subcategories.flatMap((subcategory) => {
      const category = blog.categories.find((item) => item.id === subcategory.categoryId)
      if (!category) return []
      return [
        {
          url: absoluteUrl(subcategoryPath(category.slug, subcategory.slug)),
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.6,
        },
      ]
    }),
    ...blog.articles.map((article) => ({
      url: absoluteUrl(articlePath(article)),
      lastModified: new Date(`${article.updatedAt}T12:00:00`),
      changeFrequency: "monthly" as const,
      priority: article.kind === "editorial" ? 0.7 : 0.5,
    })),
  ]
}
