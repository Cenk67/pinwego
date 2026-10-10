import bundled from "@/data/blog-state.json"
import { normalizeBlogState } from "@/lib/blog"

const FILE = "data/blog-state.json"

export async function readBlogState(): Promise<BlogState> {
  if (process.env.NODE_ENV === "development") {
    try {
      const { readFileSync } = await import("node:fs")
      const { join } = await import("node:path")
      return normalizeBlogState(JSON.parse(readFileSync(join(process.cwd(), FILE), "utf8")))
    } catch {
      return normalizeBlogState(bundled)
    }
  }
  return normalizeBlogState(bundled)
}

export async function writeBlogState(state: unknown) {
  const { writeFile } = await import("node:fs/promises")
  const { join } = await import("node:path")
  const next = normalizeBlogState(state)
  await writeFile(join(process.cwd(), FILE), `${JSON.stringify(next, null, 2)}\n`)
  return next
}
