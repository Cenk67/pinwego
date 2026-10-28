"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { pinPath, type PinQuery } from "@/lib/business-pin"
import { useLocale } from "@/lib/use-locale"

export function PinLookupNote({
  query,
  count,
  filters,
}: {
  query: PinQuery
  count: number
  filters: boolean
}) {
  const { t } = useLocale()
  const title = !query.valid ? t("pin.badTitle") : count === 0 ? t("pin.missTitle") : t("pin.hitTitle")
  const body = !query.valid ? t("pin.badBody") : count === 0 ? t("pin.missBody") : ""

  return (
    <section className="mb-4 rounded-3xl bg-card px-5 py-5 ring-1 ring-foreground/10">
      <h2 className="font-heading text-2xl text-balance">{title}</h2>
      {query.valid ? <p className="mt-2 font-heading text-xl tracking-wide">{query.display}</p> : null}
      {body ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p> : null}
      {query.valid && filters ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("pin.filters")}</p> : null}
      {query.valid && count === 1 ? (
        <Button className="mt-4 h-11 rounded-full" nativeButton={false} render={<Link href={pinPath(query.pin)} />}>
          {t("pin.open")}
        </Button>
      ) : null}
    </section>
  )
}
