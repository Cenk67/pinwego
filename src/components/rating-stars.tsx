import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

export function RatingStars({
  rating,
  size = "sm",
}: {
  rating: number
  size?: "sm" | "md"
}) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} yıldız`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.min(1, Math.max(0, rating - i))
        return (
          <span
            key={i}
            className={cn("relative", size === "sm" ? "size-3.5" : "size-4")}
          >
            <Star className="absolute inset-0 text-border" strokeWidth={1.5} />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star
                className={cn(
                  size === "sm" ? "size-3.5" : "size-4",
                  "fill-amber-500 text-amber-500"
                )}
                strokeWidth={1.5}
              />
            </span>
          </span>
        )
      })}
    </span>
  )
}
