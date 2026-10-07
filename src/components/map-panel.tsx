"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import type { Business } from "@/lib/types"

type Pin = Pick<Business, "slug" | "name" | "lat" | "lng" | "rating" | "category">

export function MapPanel({
  items,
  activeSlug,
  onSelect,
}: {
  items: Pin[]
  activeSlug?: string
  onSelect?: (slug: string) => void
}) {
  const [hover, setHover] = useState<string | null>(null)
  const bounds = useMemo(() => {
    if (!items.length) {
      return { minLat: 40.9, maxLat: 41.12, minLng: 28.9, maxLng: 29.15 }
    }
    const lats = items.map((i) => i.lat)
    const lngs = items.map((i) => i.lng)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const latPad = Math.max((maxLat - minLat) * 0.18, 0.02)
    const lngPad = Math.max((maxLng - minLng) * 0.18, 0.02)
    return {
      minLat: minLat - latPad,
      maxLat: maxLat + latPad,
      minLng: minLng - lngPad,
      maxLng: maxLng + lngPad,
    }
  }, [items])

  function pos(item: Pin) {
    const x = ((item.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100
    const y = (1 - (item.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100
    return { left: `${x}%`, top: `${y}%` }
  }

  const current = items.find((i) => i.slug === (hover || activeSlug))

  return (
    <div className="map-texture relative min-h-[320px] overflow-hidden rounded-2xl ring-1 ring-foreground/10 md:min-h-[520px]">
      <svg className="absolute inset-0 size-full opacity-40" aria-hidden>
        <path
          d="M0 180 C 80 120, 160 220, 240 160 S 400 80, 520 140 S 720 240, 900 180"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-teal/40"
        />
        <path
          d="M40 40 C 120 90, 200 20, 300 70 S 500 160, 640 90"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-primary/30"
        />
      </svg>
      {items.map((item) => {
        const on = item.slug === (hover || activeSlug)
        return (
          <button
            key={item.slug}
            type="button"
            style={pos(item)}
            className="absolute -translate-x-1/2 -translate-y-full"
            onMouseEnter={() => setHover(item.slug)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onSelect?.(item.slug)}
            aria-label={item.name}
          >
            <span
              className={
                on
                  ? "grid size-8 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground shadow-lg"
                  : "grid size-6 place-items-center rounded-full bg-foreground text-[10px] text-background shadow"
              }
            >
              {item.rating.toFixed(1)}
            </span>
            <span className="mx-auto mt-0.5 block h-2 w-0.5 bg-foreground/70" />
          </button>
        )
      })}
      {current && (
        <Link
          href={`/isletme/${current.slug}`}
          className="absolute right-3 bottom-3 left-3 rounded-xl bg-card/95 p-3 text-sm shadow-md ring-1 ring-foreground/10"
        >
          <p className="font-medium">{current.name}</p>
          <p className="text-muted-foreground">
            {current.rating.toFixed(1)} · haritada seçili · profile git
          </p>
        </Link>
      )}
    </div>
  )
}

export function DirectionsLink({
  lat,
  lng,
  name,
}: {
  lat: number
  lng: number
  name: string
}) {
  const href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(name)}`
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
      Yol tarifi
    </a>
  )
}

export function OsmEmbed({ lat, lng }: { lat: number; lng: number }) {
  const delta = 0.012
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`
  return (
    <iframe
      title="Harita"
      src={src}
      className="h-64 w-full rounded-2xl ring-1 ring-foreground/10 md:h-80"
    />
  )
}
