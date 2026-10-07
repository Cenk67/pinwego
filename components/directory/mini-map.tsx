"use client"

import Link from "next/link"
import { useLayoutEffect, useRef, useState } from "react"
import { categoryTint } from "@/components/directory/bits"
import { cn } from "cn"

type Pin = {
  id: string
  slug: string
  name: string
  lat: number
  lng: number
  category: Parameters<typeof categoryTint>[0]
}

type View = { lat: number; lng: number; zoom: number }

function project(lat: number, lng: number, zoom: number) {
  const scale = 256 * 2 ** zoom
  const x = ((lng + 180) / 360) * scale
  const sine = Math.sin((lat * Math.PI) / 180)
  const y = (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * scale
  return { x, y }
}

function unproject(x: number, y: number, zoom: number) {
  const scale = 256 * 2 ** zoom
  const lng = (x / scale) * 360 - 180
  const mercator = Math.PI - (2 * Math.PI * y) / scale
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(mercator))
  return { lat, lng }
}

function viewOf(points: Pin[], width: number, height: number): View {
  if (!points.length) return { lat: 39.1, lng: 35.2, zoom: 5 }
  if (points.length === 1) return { lat: points[0].lat, lng: points[0].lng, zoom: 16 }

  for (let zoom = 16; zoom >= 5; zoom -= 1) {
    const placed = points.map((point) => project(point.lat, point.lng, zoom))
    const xs = placed.map((point) => point.x)
    const ys = placed.map((point) => point.y)
    const spanX = Math.max(...xs) - Math.min(...xs)
    const spanY = Math.max(...ys) - Math.min(...ys)
    if (spanX <= width - 56 && spanY <= height - 96) {
      return {
        ...unproject((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, zoom),
        zoom,
      }
    }
  }

  const lat = points.reduce((sum, point) => sum + point.lat, 0) / points.length
  const lng = points.reduce((sum, point) => sum + point.lng, 0) / points.length
  return { lat, lng, zoom: 5 }
}

// Ground span Google uses for /maps/embed at zoom 0 on the equator.
const EMBED_SPAN_ZOOM0 = 522953451.522212

function googleEmbed(view: View) {
  const lat = Number(view.lat.toFixed(6))
  const lng = Number(view.lng.toFixed(6))
  const span = (EMBED_SPAN_ZOOM0 * Math.cos((lat * Math.PI) / 180)) / 2 ** view.zoom
  const pb = `!1m11!1m8!1m3!1d${span}!2d${lng}!3d${lat}!3m2!1i1024!2i768!4f13.1!5e0!6i${view.zoom}!3m1!1str!5m1!1str`
  return `https://www.google.com/maps/embed?origin=mfe&pb=${pb}`
}

function googleLink(view: View, points: Pin[]) {
  if (points.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${points[0].lat},${points[0].lng}`
  }
  return `https://www.google.com/maps/@${view.lat.toFixed(6)},${view.lng.toFixed(6)},${view.zoom}z`
}

export function MiniMap({
  points,
  className,
  label = "Harita",
}: {
  points: Pin[]
  className?: string
  label?: string
}) {
  const frame = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 480, h: 320 })

  useLayoutEffect(() => {
    const node = frame.current
    if (!node) return
    const measure = () => {
      const { width, height } = node.getBoundingClientRect()
      if (width < 8 || height < 8) return
      setSize((current) => {
        if (current && Math.abs(current.w - width) < 2 && Math.abs(current.h - height) < 2) return current
        return { w: width, h: height }
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const view = viewOf(points, size.w, size.h)
  const origin = project(view.lat, view.lng, view.zoom)

  return (
    <div className={cn("overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10", className)}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{points.length} pin</span>
      </div>
      <div ref={frame} className="relative h-72 bg-[#e7eef2] md:h-80">
        <iframe
          key={`${view.lat.toFixed(5)}-${view.lng.toFixed(5)}-${view.zoom}`}
          title={`${label} — Google haritası`}
          src={googleEmbed(view)}
          className="pointer-events-none absolute inset-0 z-0 h-full w-full border-0"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <a
          href={googleLink(view, points)}
          target="_blank"
          rel="noreferrer"
          className="absolute top-2 left-2 z-20 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-[#1a73e8] shadow-md"
        >
          Google Haritalar’da aç
        </a>
        {points.map((point) => {
          const placed = project(point.lat, point.lng, view.zoom)
          const left = ((0.5 + (placed.x - origin.x) / size.w) * 100).toFixed(4)
          const top = ((0.5 + (placed.y - origin.y) / size.h) * 100).toFixed(4)
          return (
            <Link
              key={point.id}
              href={`/isletme/${point.slug}`}
              aria-label={point.name}
              className="group absolute z-10 -translate-x-1/2 -translate-y-full"
              style={{ left: `${left}%`, top: `${top}%`, zIndex: Math.round(Number(top)) }}
            >
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background group-hover:block group-focus-visible:block">
                {point.name}
              </span>
              <svg width="28" height="36" viewBox="0 0 28 36" aria-hidden className="drop-shadow-md">
                <path
                  d="M14 35c4.2-6.2 12-12.4 12-20.2A12 12 0 1 0 2 14.8C2 22.6 9.8 28.8 14 35z"
                  fill={categoryTint(point.category)}
                  stroke="white"
                  strokeWidth="2"
                />
                <circle cx="14" cy="14.5" r="4.2" fill="white" />
              </svg>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
