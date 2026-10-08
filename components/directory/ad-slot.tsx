"use client"

import Link from "next/link"
import { ArrowUpRight, Megaphone } from "lucide-react"
import { Cover } from "@/components/directory/bits"
import { adHref, adImage, adsFor } from "@/lib/ads"
import { useDirectory } from "@/lib/directory-context"
import type { Ad, AdSlotId } from "@/lib/types"
import { cn } from "cn"

export function AdSlot({
  slot,
  layout,
  className,
}: {
  slot: AdSlotId
  layout: "banner" | "card" | "inline" | "stack"
  className?: string
}) {
  const { ads } = useDirectory()
  const items = adsFor(ads, slot)
  if (!items.length) return null

  return (
    <section aria-label="Reklam" className={className}>
      <div
        className={cn(
          layout === "banner" && "grid gap-4",
          layout === "card" && "grid gap-4 md:grid-cols-2",
          layout === "inline" && "grid gap-3",
          layout === "stack" && "grid gap-3",
        )}
      >
        {items.map((ad) => (
          <AdCard key={ad.id} ad={ad} layout={layout} />
        ))}
      </div>
    </section>
  )
}

function AdCard({ ad, layout }: { ad: Ad; layout: "banner" | "card" | "inline" | "stack" }) {
  const href = adHref(ad.href)
  const image = adImage(ad.image)
  const wide = layout === "banner" || layout === "inline"
  const body = (
    <>
      <div className={cn("relative shrink-0 overflow-hidden bg-primary/10", wide ? "h-40 md:h-auto md:min-h-40" : "h-32")}>
        {image ? (
          <Cover src={image} alt="" className="absolute inset-0 size-full" />
        ) : (
          <span className="grid size-full place-items-center text-primary">
            <Megaphone className="size-6" />
          </span>
        )}
      </div>
      <div className="min-w-0 p-4">
        <p className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">Reklam</span>
          <span className="text-muted-foreground">{ad.advertiser}</span>
        </p>
        <h3 className={cn("mt-2 font-heading leading-tight", wide ? "text-2xl" : "text-xl")}>{ad.title}</h3>
        <p className={cn("mt-2 text-sm leading-6 text-muted-foreground", layout === "stack" && "line-clamp-3")}>
          {ad.body}
        </p>
        {href ? (
          <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
            İncele
            {href.startsWith("/") ? null : <ArrowUpRight className="size-3.5" />}
          </p>
        ) : null}
      </div>
    </>
  )
  const className = cn(
    "overflow-hidden rounded-3xl bg-card text-left ring-1 ring-foreground/10",
    wide && "md:grid md:grid-cols-[220px_minmax(0,1fr)]",
    href && "transition hover:ring-primary/40",
  )

  if (!href) return <article className={className}>{body}</article>
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    )
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {body}
    </a>
  )
}
