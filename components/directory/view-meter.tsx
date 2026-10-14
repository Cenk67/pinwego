"use client"

import { Eye } from "lucide-react"
import { useEffect, useState } from "react"
import { ShareButton } from "@/components/directory/share-button"
import { useLocale } from "@/lib/use-locale"
import type { Business } from "@/lib/types"

type Summary = {
  ok?: boolean
  total: number
  today: number
  last7: number
  last30: number
  change: number | null
}

const loads = new Map<string, Promise<Summary>>()

function loadSummary(slug: string) {
  const cached = loads.get(slug)
  if (cached) return cached
  const promise = fetch("/api/gorunum", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      slug,
      search: window.location.search.slice(0, 180),
      from: document.referrer.slice(0, 240),
    }),
  })
    .then(async (response) => {
      const data = (await response.json()) as Summary
      if (!response.ok || !data.ok) throw new Error("read")
      return data
    })
    .catch((error: unknown) => {
      loads.delete(slug)
      throw error
    })
  loads.set(slug, promise)
  return promise
}

function formatCount(locale: string, value: number) {
  return new Intl.NumberFormat(locale).format(value)
}

export function ViewMeter({ business }: { business: Business }) {
  const { locale, t } = useLocale()
  const [state, setState] = useState<"load" | "error" | "ready">("load")
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    let cancel = false
    loadSummary(business.slug)
      .then((data) => {
        if (cancel) return
        setSummary(data)
        setState("ready")
      })
      .catch(() => {
        if (!cancel) setState("error")
      })
    return () => {
      cancel = true
    }
  }, [business.slug])

  function changeText() {
    if (!summary) return ""
    if (summary.change === null) return summary.last30 > 0 ? t("views.new") : ""
    return `${summary.change > 0 ? "+" : ""}${summary.change}%`
  }

  const figures = summary
    ? [
        [t("views.today"), summary.today],
        [t("views.days7"), summary.last7],
        [t("views.days30"), summary.last30],
      ]
    : []

  return (
    <section className="mt-4 rounded-3xl bg-card p-4 ring-1 ring-foreground/10" aria-busy={state === "load"}>
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Eye className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-heading text-3xl leading-none">
            {state === "ready" && summary ? formatCount(locale, summary.total) : state === "error" ? "—" : "…"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t("views.total")}</p>
        </div>
      </div>
      {state === "error" ? <p className="mt-3 text-sm text-muted-foreground">{t("views.error")}</p> : null}
      {state === "load" ? <p className="mt-3 text-sm text-muted-foreground">{t("views.loading")}</p> : null}
      {state === "ready" && summary ? (
        <dl className="mt-4 grid grid-cols-3 gap-2">
          {figures.map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl bg-secondary px-3 py-2">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 font-heading text-xl">
                {formatCount(locale, Number(value))}
                {label === t("views.days30") && changeText() ? (
                  <span className="ml-1 text-sm font-medium text-primary">{changeText()}</span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{t("views.note")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="h-11 rounded-xl bg-secondary px-4 text-sm"
          onClick={() => {
            const nodes = document.querySelectorAll<HTMLElement>("[data-kartvizit]")
            const visible = [...nodes].find((node) => node.getClientRects().length > 0)
            visible?.scrollIntoView({ behavior: "smooth", block: "center" })
          }}
        >
          {t("views.qr")}
        </button>
        <ShareButton business={business} compact={false} />
      </div>
    </section>
  )
}
