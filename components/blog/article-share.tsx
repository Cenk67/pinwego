"use client"

import { ShareMenu } from "@/components/share-menu"
import { useLocale } from "@/lib/use-locale"

export function ArticleShare({ title, text, path }: { title: string; text: string; path: string }) {
  const { t } = useLocale()
  const origin = typeof window === "undefined" ? "" : window.location.origin
  const url = `${origin}${path}`
  return (
    <ShareMenu
      title={title}
      text={text}
      url={url}
      lead={t("blog.shareLead")}
      compact={false}
      ariaLabel={t("views.share")}
    />
  )
}
