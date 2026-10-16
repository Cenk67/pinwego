"use client"

import { Landmark } from "lucide-react"
import { useLocale } from "@/lib/use-locale"
import type { Business } from "@/lib/types"
import { cn } from "cn"

const PROVIDER_KEYS = {
  usta: "kind.usta",
  ulasim: "kind.ulasim",
  icerik: "kind.icerik",
  serbest: "kind.serbest",
  diger: "kind.diger",
} as const

/** Public (kamu) and provider-kind chips; nothing renders for a plain private business. */
export function ClassBadges({ business, className, size = "sm" }: { business: Business; className?: string; size?: "sm" | "md" }) {
  const { t } = useLocale()
  const kind = business.providerKind && business.providerKind in PROVIDER_KEYS ? PROVIDER_KEYS[business.providerKind as keyof typeof PROVIDER_KEYS] : null
  const kamu = business.orgKind === "kamu"
  if (!kamu && !kind) return null
  const chip = size === "md" ? "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs" : "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
  return (
    <span className={cn("flex flex-wrap gap-1.5", className)}>
      {kamu ? (
        <span className={cn(chip, business.orgVerified ? "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100" : "bg-secondary text-muted-foreground")}>
          <Landmark className="size-3" />
          {business.orgVerified ? t("kind.kamu") : t("kind.kamuClaim")}
        </span>
      ) : null}
      {kind ? <span className={cn(chip, "bg-secondary")}>{t(kind)}</span> : null}
    </span>
  )
}
