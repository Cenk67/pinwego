import { businesses } from "@/lib/catalog"
import { assembleBlog, publicArticles } from "@/lib/blog"
import { deskDay, projectPublicState } from "@/lib/blog-desk"
import { readBlogState } from "@/lib/blog-file"
import { seedSectors } from "@/lib/sectors"

async function assemblePublished(now: number) {
  const state = projectPublicState(await readBlogState(), deskDay(now))
  const document = assembleBlog(state, businesses, seedSectors)
  return { ...document, articles: publicArticles(document) }
}

/** `now` is an explicit clock. Pass `0` from prerendered pages so only posts already marked published are listed. */
export async function publishedBlogAt(now: number) {
  return assemblePublished(now)
}

export async function publishedBlog() {
  return publishedBlogAt(0)
}
