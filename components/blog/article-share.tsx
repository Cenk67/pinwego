"use client"

import { ShareMenu } from "@/components/share-menu"
import { useLocale } from "@/lib/use-locale"

function recordShare(slug: string) {
  void fetch("/api/gorunum", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op: "paylas", slug }),
  }).catch(() => undefined)
}

export function ArticleShare({
  title,
  text,
  path,
  businessSlug,
  compact = false,
}: {
  title: string
  text: string
  path: string
  businessSlug?: string
  compact?: boolean
}) {
  const { t } = useLocale()
  const origin = typeof window === "undefined" ? "" : window.location.origin
  const url = `${origin}${path}?kaynak=paylas`
  return (
    <ShareMenu
      title={`${title} · pinwego`}
      text={text}
      url={url}
      lead={t("blog.shareLead")}
      compact={compact}
      ariaLabel={compact ? `${title} ${t("views.share")}` : t("views.share")}
      onRecord={businessSlug ? () => recordShare(businessSlug) : undefined}
    />
  )
}
