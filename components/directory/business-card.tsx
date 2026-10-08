import Link from "next/link"
import { BadgeCheck } from "lucide-react"
import { ClaimPrompt } from "@/components/directory/claim-button"
import { Cover, RatingBlock, SaveButton } from "@/components/directory/bits"
import { categoryById } from "@/lib/catalog"
import { formatDistance, priceLabel, priceMarks, priceRange } from "@/lib/format"
import type { Business } from "@/lib/types"

export function BusinessCard({
  business,
  distanceKm,
  reason,
  layout = "stack",
}: {
  business: Business
  distanceKm?: number
  reason?: string
  layout?: "stack" | "row"
}) {
  const category = categoryById(business.category)
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10">
      <Link
        href={`/isletme/${business.slug}`}
        className={layout === "row" ? "flex h-full flex-col sm:flex-row" : "flex h-full flex-col"}
      >
        <div
          className={
            layout === "row"
              ? "relative aspect-[16/10] overflow-hidden sm:aspect-auto sm:min-h-44 sm:w-60 sm:shrink-0"
              : "relative aspect-[16/10] overflow-hidden"
          }
        >
          <Cover
            src={business.photo}
            alt={`${business.name}, ${business.subcategory}`}
            position={business.photoPosition}
            className="absolute inset-0 size-full"
          />
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <span
              className={
                business.openNow
                  ? "rounded-full bg-white/95 px-2 py-0.5 text-xs font-medium text-emerald-800"
                  : "rounded-full bg-white/90 px-2 py-0.5 text-xs text-foreground/70"
              }
            >
              {business.openNow ? "Açık" : "Kapalı"}
            </span>
            {business.premium ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                Öne çıkan
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-heading text-xl leading-tight">{business.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {category.label} · {business.district}
              </p>
            </div>
            <RatingBlock business={business} />
          </div>
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{business.summary}</p>
          {reason ? (
            <p className="rounded-2xl bg-primary/10 px-3 py-2 text-sm leading-5 text-primary">
              {reason}
            </p>
          ) : null}
          <div className="mt-auto flex items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
            <span>
              {typeof distanceKm === "number" ? formatDistance(distanceKm) : business.city}
              {" · "}
              {priceMarks(business.priceLevel)} {priceLabel(business.priceLevel)}
            </span>
            <span className="text-foreground">{priceRange(business)}</span>
          </div>
          {business.source === "google" ? (
            <p className="text-xs text-primary">Google Haritalar kaydı</p>
          ) : business.verified ? (
            <p className="flex items-center gap-1 text-xs text-primary">
              <BadgeCheck className="size-3.5" />
              Doğrulandı
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {business.source === "senin" ? "Senin kaydın" : "Doğrulama bekliyor"}
            </p>
          )}
        </div>
      </Link>
      {business.source === "google" ? (
        <div className="px-4 pb-4">
          <ClaimPrompt business={business} />
        </div>
      ) : null}
      <SaveButton business={business} className="absolute top-3 right-3" />
    </article>
  )
}
