import Link from "next/link"
import { BadgeCheck, MapPin } from "lucide-react"
import type { Business } from "@/lib/types"
import { formatRating, priceLabel } from "@/lib/search"
import { RatingStars } from "@/components/rating-stars"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function BusinessCard({
  business,
  distanceKm,
  compact,
}: {
  business: Business
  distanceKm?: number
  compact?: boolean
}) {
  return (
    <Link
      href={`/isletme/${business.slug}`}
      className={cn(
        "group flex overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 transition hover:-translate-y-0.5 hover:shadow-md",
        compact ? "flex-row" : "flex-col sm:flex-row"
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-muted",
          compact ? "h-28 w-28 shrink-0" : "h-44 w-full sm:h-auto sm:w-52"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={business.cover}
          alt=""
          className="size-full object-cover transition duration-500 group-hover:scale-105"
        />
        {business.premium && (
          <span className="absolute top-2 left-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
            Öne çıkan
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-heading truncate text-lg leading-tight">
              {business.name}
            </h3>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {business.subcategory} · {priceLabel(business.priceLevel)}
            </p>
          </div>
          {business.verified && (
            <Badge variant="secondary" className="shrink-0 gap-1">
              <BadgeCheck className="size-3" />
              Doğrulandı
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <RatingStars rating={business.rating} />
          <span className="font-medium">{formatRating(business.rating)}</span>
          <span className="text-muted-foreground">
            ({business.reviewCount.toLocaleString("tr-TR")} yorum)
          </span>
        </div>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          {business.district}, {business.city}
          {distanceKm !== undefined && (
            <span> · {distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km</span>
          )}
        </p>
        {!compact && (
          <div className="mt-auto flex flex-wrap gap-1 pt-1">
            {business.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
            {business.services?.length ? (
              <Badge variant="outline">Randevu</Badge>
            ) : null}
            {business.quoteEnabled ? <Badge variant="outline">Teklif</Badge> : null}
            {business.intel ? <Badge variant="outline">B2B veri</Badge> : null}
          </div>
        )}
      </div>
    </Link>
  )
}
