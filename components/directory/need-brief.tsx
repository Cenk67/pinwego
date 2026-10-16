"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CITIES, type ParsedQuery } from "@/lib/match"
import { trackNeed } from "@/lib/need-client"
import { alternativeCategories, isFinancialNeed, needDetails, needIntent, type NeedDetails, type NeedIntent } from "@/lib/need"
import { sectorCopy } from "@/lib/sector-copy"
import type { Business, CategoryId, Sector } from "@/lib/types"
import { useLocale } from "@/lib/use-locale"

/** Service work where "how soon" changes the answer; other needs are not asked. */
const TIMED_CATEGORIES = new Set(["usta", "enerji", "temizlik", "ev", "cekici", "nakliye", "ilaclama", "cam", "cati"])
/** Needs where the price band is a real decision, so the budget chips are worth the space. */
const PRICED_CATEGORIES = new Set(["yeme", "konaklama", "guzellik", "turizm", "dekor", "teknoloji", "dugun", "egitim"])

export type NeedPrompt = "city" | "urgency" | "budget" | null

export function needPrompt({
  parsed,
  details,
  hasPlace,
  count,
  widened,
}: {
  parsed: ParsedQuery
  details: NeedDetails
  hasPlace: boolean
  count: number
  widened: boolean
}): NeedPrompt {
  if (!parsed.raw.trim()) return null
  if (!hasPlace && (count === 0 || widened)) return "city"
  if (!details.urgent && !details.timing && parsed.categories.some((id) => TIMED_CATEGORIES.has(id)) && count > 1) return "urgency"
  if (!details.budget && parsed.categories.some((id) => PRICED_CATEGORIES.has(id)) && count > 3) return "budget"
  return null
}

function chip(active = false) {
  return active
    ? "rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground"
    : "rounded-full bg-secondary px-3 py-1 text-xs"
}

export function NeedBrief({
  parsed,
  sectors,
  count,
  widened,
  hasPlace,
  onPatch,
}: {
  parsed: ParsedQuery
  sectors: Sector[]
  count: number
  widened: boolean
  hasPlace: boolean
  onPatch: (patch: Record<string, string | null>) => void
}) {
  const { locale, t } = useLocale()
  if (!parsed.raw.trim()) return null
  const details = needDetails(parsed.text)
  const intent: NeedIntent = needIntent(parsed.text)
  const prompt = needPrompt({ parsed, details, hasPlace, count, widened })
  const labels = parsed.categories
    .map((id) => sectors.find((item) => item.id === id))
    .filter((item): item is Sector => Boolean(item))
    .map((item) => sectorCopy(locale, item).label)
  const place = parsed.district ?? parsed.city
  const facts = [
    ...labels,
    place,
    details.urgent ? t("need.urgent") : null,
    details.budget === "ekonomik" ? t("need.budgetLow") : details.budget === "luks" ? t("need.budgetHigh") : null,
    details.timing === "bugun" ? t("need.today") : details.timing === "haftasonu" ? t("need.weekend") : details.timing === "aksam" ? t("need.evening") : null,
  ].filter((item): item is string => Boolean(item))
  const finance = isFinancialNeed(parsed.categories, parsed.focus)
  const append = (words: string) => onPatch({ q: `${parsed.raw.trim()} ${words}`.trim() })

  if (!facts.length && !parsed.changes.length && !prompt && !finance && intent !== "bilgi") return null

  return (
    <section className="mt-4 grid gap-3 rounded-3xl bg-card px-4 py-4 ring-1 ring-foreground/10" aria-label={t("need.briefTitle")}>
      {facts.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{t("need.briefTitle")}</span>
          {facts.map((item) => (
            <span key={item} className={chip(true)}>
              {item}
            </span>
          ))}
        </div>
      ) : null}
      {parsed.changes.length ? (
        <p className="text-xs text-muted-foreground">
          {parsed.changes.map((change) => t("need.corrected", { from: change.from, to: change.to })).join(" · ")}
        </p>
      ) : null}
      {intent === "bilgi" ? (
        <div>
          <p className="text-sm font-medium">{t("need.infoTitle")}</p>
          <p className="text-xs leading-5 text-muted-foreground">{t("need.infoBody")}</p>
        </div>
      ) : null}
      {prompt === "city" ? (
        <div>
          <p className="text-sm font-medium">{t("need.askCity")}</p>
          <p className="text-xs leading-5 text-muted-foreground">{t("need.askCityBody")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CITIES.map((city) => (
              <button key={city} type="button" className={chip()} onClick={() => onPatch({ sehir: city })}>
                {city}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {prompt === "urgency" ? (
        <div>
          <p className="text-sm font-medium">{t("need.askUrgency")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={chip()} onClick={() => append("acil bugün")}>
              {t("need.urgentNow")}
            </button>
            <button type="button" className={chip()} onClick={() => append("bu hafta")}>
              {t("need.urgentLater")}
            </button>
          </div>
        </div>
      ) : null}
      {prompt === "budget" ? (
        <div>
          <p className="text-sm font-medium">{t("need.askBudget")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={chip()} onClick={() => append("uygun fiyat")}>
              {t("need.budgetLow")}
            </button>
            <button type="button" className={chip()} onClick={() => append("lüks")}>
              {t("need.budgetHigh")}
            </button>
          </div>
        </div>
      ) : null}
      {finance ? (
        <div className="rounded-2xl bg-secondary/60 px-3 py-3">
          <p className="text-sm font-medium">{t("need.financeTitle")}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("need.financeBody")}</p>
          <Button variant="outline" className="mt-2 h-9 rounded-full" nativeButton={false} render={<Link href="/talep" />}>
            {t("need.financeAction")}
          </Button>
        </div>
      ) : null}
    </section>
  )
}

/** Neighbouring categories with a live count, shown when the match is thin or empty. */
export function NeedAlternatives({
  parsed,
  sectors,
  catalog,
  city,
  active,
  onPick,
}: {
  parsed: ParsedQuery
  sectors: Sector[]
  catalog: Business[]
  city: string | null
  active: CategoryId | "hepsi"
  onPick: (id: CategoryId) => void
}) {
  const { locale, t } = useLocale()
  const ids = alternativeCategories(parsed.categories)
  const rows = ids
    .map((id) => {
      const sector = sectors.find((item) => item.id === id)
      if (!sector) return null
      const count = catalog.filter((business) => business.category === id && (!city || city === "hepsi" || business.city === city)).length
      return count ? { id, label: sectorCopy(locale, sector).label, count } : null
    })
    .filter((row): row is { id: CategoryId; label: string; count: number } => Boolean(row))
  if (!rows.length) return null
  return (
    <div className="my-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">{t("need.alternatives")}</span>
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          className={chip(active === row.id)}
          onClick={() => {
            trackNeed({ kind: "alternative", q: parsed.raw, category: row.id, target: row.id })
            onPick(row.id)
          }}
        >
          {row.label} ({row.count})
        </button>
      ))}
    </div>
  )
}

export function NeedFeedback({ query, category, city }: { query: string; category: string; city: string }) {
  const { t } = useLocale()
  const [sent, setSent] = useState<"up" | "down" | null>(null)
  if (!query.trim()) return null
  const answer = (target: "up" | "down") => {
    setSent(target)
    trackNeed({ kind: "feedback", q: query, category, city, target }, `feedback.${query}`)
  }
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10">
      {sent ? (
        <span className="text-muted-foreground">{t("need.feedbackThanks")}</span>
      ) : (
        <>
          <span>{t("need.feedbackTitle")}</span>
          <button type="button" className={chip()} onClick={() => answer("up")}>
            {t("need.feedbackYes")}
          </button>
          <button type="button" className={chip()} onClick={() => answer("down")}>
            {t("need.feedbackNo")}
          </button>
        </>
      )}
    </div>
  )
}
