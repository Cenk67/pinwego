"use client"

import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useState } from "react"
import { CategoryGlyph, Cover } from "@/components/directory/bits"
import { recordSectorClick } from "@/lib/sector-clicks"
import { sectorCopy } from "@/lib/sector-copy"
import { inSector } from "@/lib/taxonomy"
import { useLocale } from "@/lib/use-locale"
import type { Business, Sector } from "@/lib/types"
import { cn } from "cn"

const PAGE_SIZE = 20

export function SectorStrip({ sectors, businesses }: { sectors: Sector[]; businesses: Business[] }) {
  const { locale, t } = useLocale()
  const pages = Math.max(1, Math.ceil(sectors.length / PAGE_SIZE))
  const [page, setPage] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [paused, setPaused] = useState(false)
  const signature = sectors.map((item) => item.id).join("\n")
  const [seenSignature, setSeenSignature] = useState(signature)
  if (seenSignature !== signature) {
    setSeenSignature(signature)
    setPage(0)
  }
  const safePage = Math.min(page, pages - 1)
  const slice = sectors.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

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
            const copy = sectorCopy(locale, category)
            const count = businesses.filter((item) => inSector(item, category.id)).length
            return (
              <Link
                key={category.id}
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
                  <p className="mt-1 font-medium">{copy.label}</p>
                  <p className="text-xs text-white/80">
                    {t("sector.count", { count })} · {copy.blurb}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <Link href="/iletisim" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          {t("home.sectorMissing")}
        </Link>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {safePage * PAGE_SIZE + 1}–{Math.min(sectors.length, (safePage + 1) * PAGE_SIZE)} / {sectors.length}
          </p>
          <button
            type="button"
            aria-label={t("sector.prev")}
            onClick={() => step(-1)}
            disabled={pages < 2}
            className="grid size-10 place-items-center rounded-full bg-card ring-1 ring-foreground/10 disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t("sector.next")}
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
