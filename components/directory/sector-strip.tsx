"use client"

import Link from "next/link"
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react"
import { useEffect, useState } from "react"
import { CategoryGlyph, Cover } from "@/components/directory/bits"
import { recordSectorClick } from "@/lib/sector-clicks"
import type { Business, Sector } from "@/lib/types"
import { cn } from "cn"

const PAGE_SIZE = 20

export function SectorStrip({
  sectors,
  businesses,
  onRemove,
  onAdd,
}: {
  sectors: Sector[]
  businesses: Business[]
  onRemove: (id: string) => void
  onAdd: () => void
}) {
  const pages = Math.max(1, Math.ceil(sectors.length / PAGE_SIZE))
  const [page, setPage] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [paused, setPaused] = useState(false)
  const safePage = Math.min(page, pages - 1)
  const slice = sectors.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
  const signature = sectors.map((item) => item.id).join("\n")

  useEffect(() => {
    setPage(0)
  }, [signature])

  useEffect(() => {
    if (pages < 2 || paused) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const timer = window.setInterval(() => {
      setDirection(1)
      setPage((current) => (current + 1) % pages)
    }, 7000)
    return () => window.clearInterval(timer)
  }, [pages, paused, signature])

  function step(delta: number) {
    setDirection(delta > 0 ? 1 : -1)
    setPage((current) => (current + delta + pages) % pages)
  }

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="mt-5 overflow-hidden">
        <div
          key={`${signature}:${safePage}`}
          className={cn(
            "grid grid-cols-2 gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 sm:grid-cols-4 lg:grid-cols-5",
            direction > 0 ? "motion-safe:slide-in-from-right-8" : "motion-safe:slide-in-from-left-8",
          )}
        >
          {slice.map((category) => {
            const count = businesses.filter((item) => item.category === category.id).length
            return (
              <div key={category.id} className="relative">
                <Link
                  href={`/ara?kategori=${category.id}`}
                  onClick={() => recordSectorClick(category.id)}
                  className="group relative block h-28 overflow-hidden rounded-3xl ring-1 ring-foreground/10"
                >
                  <Cover
                    src={category.photo}
                    alt=""
                    className="absolute inset-0 size-full transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <div className="absolute right-3 bottom-3 left-3 text-white">
                    <CategoryGlyph id={category.id} icon={category.icon} className="size-4" />
                    <p className="mt-1 font-medium">{category.label}</p>
                    <p className="text-xs text-white/80">
                      {count} kayıt · {category.blurb}
                    </p>
                  </div>
                </Link>
                {category.custom ? (
                  <button
                    type="button"
                    aria-label={`${category.label} sektörünü kaldır`}
                    onClick={() => onRemove(category.id)}
                    className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-black/55 text-white"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted-foreground ring-1 ring-foreground/15"
        >
          <Plus className="size-4" />
          Sektör ekle
        </button>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {safePage * PAGE_SIZE + 1}–{Math.min(sectors.length, (safePage + 1) * PAGE_SIZE)} / {sectors.length}
          </p>
          <button
            type="button"
            aria-label="Önceki 20 sektör"
            onClick={() => step(-1)}
            disabled={pages < 2}
            className="grid size-10 place-items-center rounded-full bg-card ring-1 ring-foreground/10 disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Sonraki 20 sektör"
            onClick={() => step(1)}
            disabled={pages < 2}
            className="grid size-10 place-items-center rounded-full bg-card ring-1 ring-foreground/10 disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
