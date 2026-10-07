"use client"

import {
  BedDouble,
  Bookmark,
  Building2,
  HeartPulse,
  Paintbrush,
  Scissors,
  Sofa,
  UtensilsCrossed,
  Wrench,
  Star,
} from "lucide-react"
import { useState } from "react"
import { categoryById } from "@/lib/catalog"
import { useDirectory } from "@/lib/directory-context"
import { formatRating } from "@/lib/format"
import type { Business, CategoryId } from "@/lib/types"
import { cn } from "cn"

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex", className)} aria-label={`${rating.toFixed(1)} / 5`}>
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.min(1, Math.max(0, rating - index))
        return (
          <span key={index} className="relative size-3.5">
            <Star className="size-3.5 text-amber-200" />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star className="size-3.5 fill-amber-500 text-amber-500" />
            </span>
          </span>
        )
      })}
    </span>
  )
}

export function Cover({
  src,
  alt,
  position = "center",
  className,
}: {
  src: string
  alt: string
  position?: string
  className?: string
}) {
  const [visible, setVisible] = useState(true)
  if (!visible) {
    return <div className={cn("bg-primary/15", className)} aria-hidden />
  }
  return (
    // Local catalog photos; next/image would require per-file sizes without improving the demo.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("object-cover", className)}
      style={{ objectPosition: position }}
      onError={() => setVisible(false)}
    />
  )
}

export function CategoryGlyph({ id, className }: { id: CategoryId; className?: string }) {
  const Icon = {
    yeme: UtensilsCrossed,
    konaklama: BedDouble,
    guzellik: Scissors,
    ev: Paintbrush,
    usta: Wrench,
    saglik: HeartPulse,
    b2b: Building2,
    dekor: Sofa,
  }[id]
  return <Icon className={className} />
}

export function SaveButton({ business, className }: { business: Business; className?: string }) {
  const { isSaved, toggleSaved } = useDirectory()
  const saved = isSaved(business.id)
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `${business.name} kaydı kaldır` : `${business.name} kaydet`}
      onClick={() => toggleSaved(business.id)}
      className={cn(
        "grid size-9 place-items-center rounded-full bg-white/95 text-foreground shadow-sm ring-1 ring-foreground/10",
        className,
      )}
    >
      <Bookmark className={cn("size-4", saved && "fill-primary text-primary")} />
    </button>
  )
}

export function RatingBlock({ business }: { business: Business }) {
  return (
    <div className="text-right">
      <div className="font-heading text-lg leading-none">{formatRating(business)}</div>
      <Stars rating={business.reviewCount ? business.rating : 0} className="mt-1 justify-end" />
    </div>
  )
}

export function categoryTint(id: CategoryId) {
  return categoryById(id).tint
}

export const fieldClass =
  "h-11 w-full rounded-xl bg-card px-3 text-sm ring-1 ring-foreground/10 outline-none focus-visible:ring-2 focus-visible:ring-ring"
