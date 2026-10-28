"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { businessPin, displayPin, pinPath, pinUrl } from "@/lib/business-pin"
import { useLocale } from "@/lib/use-locale"

export function PinBadge({
  business,
  compact = false,
}: {
  business: { id: string; pin?: string }
  compact?: boolean
}) {
  const { t } = useLocale()
  const pin = businessPin(business)
  const [note, setNote] = useState("")

  async function copy() {
    try {
      await navigator.clipboard.writeText(pin)
      setNote(t("pin.copied"))
    } catch {
      setNote(pin)
    }
  }

  return (
    <div className={compact ? "mt-2" : "mt-4 rounded-2xl bg-secondary/50 px-3 py-3 ring-1 ring-foreground/10"}>
      <p className="text-xs font-medium text-muted-foreground">{t("pin.kicker")}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <Link href={pinPath(pin)} className="font-heading text-xl tracking-wide text-foreground">
          {displayPin(pin)}
        </Link>
        <Button type="button" variant="outline" className="h-8 rounded-full px-3" onClick={() => void copy()}>
          {t("pin.copy")}
        </Button>
      </div>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
      {compact ? null : (
        <>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("pin.hint")}</p>
          <p className="mt-1 break-all text-xs text-muted-foreground">{pinUrl(pin)}</p>
        </>
      )}
    </div>
  )
}
