import type { MetadataRoute } from "next"
import { absoluteUrl, articlePath, categoryPath, subcategoryPath } from "@/lib/blog"
import { publishedBlog } from "@/lib/blog-server"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blog = await publishedBlog()
  const now = new Date("2026-10-10")
  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/blog"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...blog.categories.map((category) => ({
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
