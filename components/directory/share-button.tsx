"use client"

import { ShareMenu } from "@/components/share-menu"
import { businessShare } from "@/lib/share"
import type { Business } from "@/lib/types"
import { useLocale } from "@/lib/use-locale"

function payload(business: Business) {
  const origin = typeof window === "undefined" ? "" : window.location.origin
  return businessShare(business, origin)
}

function recordShare(slug: string) {
  void fetch("/api/gorunum", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op: "paylas", slug }),
  }).catch(() => undefined)
}

export function ShareButton({
  business,
  className,
  compact = true,
}: {
  business: Business
  className?: string
  compact?: boolean
}) {
  const { t } = useLocale()
  const share = payload(business)
  return (
    <ShareMenu
      title={share.title}
      text={share.text}
      url={share.url}
      lead={t("views.shareLead")}
      compact={compact}
      className={className}
      ariaLabel={`${business.name} ${t("views.share")}`}
      onRecord={() => recordShare(business.slug)}
    />
  )
}
