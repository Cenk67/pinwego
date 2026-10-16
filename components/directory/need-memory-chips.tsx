"use client"

import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { forgetNeeds, setNeedConsent, useNeedMemory } from "@/lib/need-memory"
import { useLocale } from "@/lib/use-locale"

/** Opt-in list of the visitor's own recent needs. Nothing is shown or stored without the checkbox. */
export function NeedMemoryChips({ className = "" }: { className?: string }) {
  const { t } = useLocale()
  const memory = useNeedMemory()
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Label className="gap-2 text-sm">
          <Checkbox checked={memory.consent} onCheckedChange={(checked) => setNeedConsent(checked === true)} />
          {t("need.memoryOn")}
        </Label>
        {memory.consent && memory.items.length ? (
          <button type="button" className="text-xs text-primary" onClick={forgetNeeds}>
            {t("need.memoryClear")}
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t("need.memoryHint")}</p>
      {memory.consent && memory.items.length ? (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label={t("need.memoryTitle")}>
          {memory.items.map((item) => (
            <Link
              key={item.q}
              href={`/ara?q=${encodeURIComponent(item.q)}`}
              className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-sm"
            >
              {item.q}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}
