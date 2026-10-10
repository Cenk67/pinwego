import { businesses } from "@/lib/catalog"
import { assembleBlog, publicArticles } from "@/lib/blog"
import { readBlogState } from "@/lib/blog-file"
import { seedSectors } from "@/lib/sectors"

export async function publishedBlog() {
  const document = assembleBlog(await readBlogState(), businesses, seedSectors)
  return { ...document, articles: publicArticles(document) }
}
