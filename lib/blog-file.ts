import bundled from "@/data/blog-state.json"
import { normalizeBlogState, type BlogState } from "@/lib/blog"

const FILE = "data/blog-state.json"
const KEY = "state"

type BlogKv = {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
}

async function blogKv(): Promise<BlogKv | null> {
  try {
    const loaded = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "cloudflare:workers")) as {
      env?: { BLOG_STATE?: BlogKv }
    }
    return loaded.env?.BLOG_STATE ?? null
  } catch {
    return null
  }
}

async function readFileState() {
  const { readFileSync } = await import("node:fs")
  const { join } = await import("node:path")
  return normalizeBlogState(JSON.parse(readFileSync(join(process.cwd(), FILE), "utf8")))
}

export async function readBlogState(): Promise<BlogState> {
  const kv = await blogKv()
  if (kv) {
    const raw = await kv.get(KEY)
    if (raw) return normalizeBlogState(JSON.parse(raw))
    return normalizeBlogState(bundled)
  }
  if (process.env.NODE_ENV === "development") {
    try {
      return await readFileState()
    } catch {
      return normalizeBlogState(bundled)
    }
  }
  return normalizeBlogState(bundled)
}

export async function writeBlogState(state: unknown) {
  const next = normalizeBlogState(state)
  const kv = await blogKv()
  if (kv) {
    await kv.put(KEY, JSON.stringify(next))
    return next
  }
  const { writeFile } = await import("node:fs/promises")
  const { join } = await import("node:path")
  await writeFile(join(process.cwd(), FILE), `${JSON.stringify(next, null, 2)}\n`)
  return next
}
