"use client"

import Link from "next/link"
import type { GuideHit } from "@/lib/blog"
import { useLocale } from "@/lib/use-locale"

export function GuideList({ hits, onOpen }: { hits: GuideHit[]; onOpen?: () => void }) {
  const { t } = useLocale()
  if (!hits.length) return null
  return (
    <div className="mt-3 grid gap-2">
      <p className="text-xs font-medium text-muted-foreground">{t("assist.guides")}</p>
      {hits.map((hit) => (
        <Link
          key={hit.id}
          href={hit.href}
          onClick={onOpen}
          className="rounded-2xl bg-card px-3 py-2 ring-1 ring-foreground/10"
        >
          <span className="block font-medium">{hit.title}</span>
          {hit.description ? <span className="mt-1 block text-xs leading-5 text-muted-foreground">{hit.description}</span> : null}
        </Link>
      ))}
    </div>
  )
}
