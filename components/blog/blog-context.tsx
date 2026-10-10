"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { businesses } from "@/lib/catalog"
import {
  assembleBlog,
  baseArticles,
  normalizeBlogState,
  type BlogArticle,
  type BlogCategory,
  type BlogDocument,
  type BlogState,
  type BlogSubcategory,
} from "@/lib/blog"
import { seedSectors } from "@/lib/sectors"

const BlogContext = createContext<{
  state: BlogState
  document: BlogDocument
  hiddenArticles: BlogArticle[]
  replace: (state: BlogState) => void
} | null>(null)

export function BlogProvider({ initial, children }: { initial: BlogState; children: ReactNode }) {
  const [state, setState] = useState(initial)
  const serialized = JSON.stringify(initial)
  useEffect(() => {
    setState(normalizeBlogState(JSON.parse(serialized)))
  }, [serialized])
  const document = useMemo(() => assembleBlog(state, businesses, seedSectors), [state])
  const hiddenArticles = useMemo(
    () => baseArticles(businesses, seedSectors).filter((article) => state.deletedPostIds.includes(article.id)),
    [state],
  )
  const value = useMemo(
    () => ({ state, document, hiddenArticles, replace: setState }),
    [state, document, hiddenArticles],
  )
  return <BlogContext.Provider value={value}>{children}</BlogContext.Provider>
}

export function useBlog() {
  const value = useContext(BlogContext)
  if (!value) throw new Error("Blog sağlayıcısı bulunamadı")
  return value
}

export type { BlogCategory, BlogSubcategory }
