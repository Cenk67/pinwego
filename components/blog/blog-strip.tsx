"use client"

import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { articlePath, stripArticles } from "@/lib/blog"
import { useBlog } from "@/components/blog/blog-context"

export function BlogStrip() {
  const { document } = useBlog()
  const articles = stripArticles(document)
  const scroller = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const step = useCallback((direction: 1 | -1) => {
    const node = scroller.current
    if (!node) return
    const card = node.querySelector("a")
    const width = card ? card.getBoundingClientRect().width + 16 : 320
    const max = node.scrollWidth - node.clientWidth
    if (direction > 0 && node.scrollLeft >= max - 8) node.scrollTo({ left: 0, behavior: "smooth" })
    else node.scrollBy({ left: width * direction, behavior: "smooth" })
  }, [])

  useEffect(() => {
    if (articles.length < 2 || paused) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const timer = window.setInterval(() => step(1), 5500)
    return () => window.clearInterval(timer)
  }, [articles.length, paused, step])

  if (!articles.length) return null
  return (
    <section className="mx-auto max-w-6xl px-4 py-8" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-3xl">Blog</h2>
          <p className="mt-1 text-sm text-muted-foreground">Görselli rehber ve şehir sayfaları</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Önceki yazılar" onClick={() => step(-1)} className="grid size-9 place-items-center rounded-full bg-card ring-1 ring-foreground/10">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" aria-label="Sonraki yazılar" onClick={() => step(1)} className="grid size-9 place-items-center rounded-full bg-card ring-1 ring-foreground/10">
            <ChevronRight className="size-4" />
          </button>
          <Link href="/blog" className="rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground">
            Tümü
          </Link>
        </div>
      </div>
      <div ref={scroller} className="mt-5 flex snap-x gap-4 overflow-x-auto scroll-smooth pb-2">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={articlePath(article)}
            className="w-[min(100%,320px)] shrink-0 snap-start overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10"
          >
            <img src={article.image} alt={article.imageAlt} className="aspect-[16/10] w-full object-cover" />
            <div className="p-4">
              <p className="text-xs text-primary">
                {article.categoryName} · {article.subcategoryName}
              </p>
              <h3 className="mt-1 font-heading text-xl leading-tight">{article.title}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
