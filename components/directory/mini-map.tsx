import Link from "next/link"
import { useId, useMemo } from "react"
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

function boundsOf(points: Pin[]) {
  if (!points.length) {
    return { minLat: 36.4, maxLat: 41.4, minLng: 26.4, maxLng: 33.2 }
  }
  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity
  for (const point of points) {
    minLat = Math.min(minLat, point.lat)
    maxLat = Math.max(maxLat, point.lat)
    minLng = Math.min(minLng, point.lng)
    maxLng = Math.max(maxLng, point.lng)
  }
  const latPad = Math.max(0.03, (maxLat - minLat) * 0.45 || 0.03)
  const lngPad = Math.max(0.03, (maxLng - minLng) * 0.45 || 0.03)
  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  }
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
  const bounds = useMemo(() => boundsOf(points), [points])
  const patternId = useId().replace(/:/g, "")
  return (
    <div className={cn("overflow-hidden rounded-3xl bg-[#e4eee8] ring-1 ring-foreground/10", className)}>
      <div className="flex items-center justify-between px-4 py-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{points.length} pin</span>
      </div>
      <svg viewBox="0 0 100 78" role="img" aria-label={label} className="h-64 w-full md:h-72">
        <defs>
          <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M 6 0 L 0 0 0 6" fill="none" stroke="#c5d6cc" strokeWidth="0.35" />
          </pattern>
        </defs>
        <rect width="100" height="78" fill={`url(#${patternId})`} />
        <path
          d="M0 52 C 18 46, 28 62, 46 54 S 74 40, 100 50 L 100 78 L 0 78 Z"
          fill="#d3e3da"
        />
        {points.map((point) => {
          const x =
            8 +
            ((point.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 84
          const y =
            8 +
            ((bounds.maxLat - point.lat) / (bounds.maxLat - bounds.minLat)) * 58
          return (
            <Link key={point.id} href={`/isletme/${point.slug}`} aria-label={point.name}>
              <circle cx={x} cy={y} r="1.7" fill={categoryTint(point.category)} stroke="white" strokeWidth="0.55" />
              <title>{point.name}</title>
            </Link>
          )
        })}
      </svg>
    </div>
  )
}
