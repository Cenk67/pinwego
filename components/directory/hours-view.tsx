"use client"

import { useSyncExternalStore } from "react"
import { istanbulParts, liveBusiness } from "@/lib/hours"
import { useLocale } from "@/lib/use-locale"
import type { Business } from "@/lib/types"

let clock = 0
let timer: ReturnType<typeof setInterval> | null = null
let kick: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<() => void>()

function emit() {
  clock = Date.now()
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    timer = setInterval(emit, 30000)
    kick = setTimeout(emit, 0)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size) return
    if (timer) clearInterval(timer)
    if (kick) clearTimeout(kick)
    timer = null
    kick = null
    clock = 0
  }
}

export function useMinute() {
  return useSyncExternalStore(subscribe, () => clock, () => 0)
}

function untilText(iso: string) {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return ""
  const part = istanbulParts(ms)
  return `${String(part.day).padStart(2, "0")}.${String(part.month).padStart(2, "0")} ${String(part.hour).padStart(2, "0")}:${String(part.minute).padStart(2, "0")}`
}

export function HoursStatus({ business }: { business: Business }) {
  const now = useMinute()
  const { t } = useLocale()
  const presence = now ? liveBusiness(business, now).presence : undefined
  if (!presence) return null
  const open = presence.state === "open"
  const unknown = presence.state === "unknown"
  const tone = open
    ? "bg-emerald-700/10 text-emerald-800"
    : unknown
      ? "bg-secondary text-muted-foreground"
      : "bg-rose-700/10 text-rose-800"
  return (
    <div className={`rounded-2xl px-3 py-2 text-sm ${tone}`} role="status">
      <p className="flex items-center gap-2 font-medium">
        <span className="size-2 rounded-full bg-current" aria-hidden />
        {t(presence.labelKey)}
      </p>
      {presence.detailKey ? <p className="mt-1 text-xs">{t(presence.detailKey, { time: presence.time })}</p> : null}
      {presence.until ? <p className="mt-1 text-xs">{t("hours.until", { time: untilText(presence.until) })}</p> : null}
      {presence.note ? <p className="mt-1 text-xs">{presence.note}</p> : null}
    </div>
  )
}

export function HoursWeek({ business }: { business: Business }) {
  const now = useMinute()
  const { t } = useLocale()
  const live = liveBusiness(business, now)
  const today = live.presence?.today ?? -1
  return (
    <ul className="mt-2 grid gap-1 text-sm">
      {live.hours.map((day, index) => (
        <li
          key={day.day}
          aria-current={index === today ? "date" : undefined}
          className={index === today ? "flex justify-between gap-3 rounded-xl bg-primary/15 px-2 py-1.5 font-medium" : "flex justify-between gap-3 px-2 py-1"}
        >
          <span className={index === today ? "text-foreground" : "text-muted-foreground"}>
            {day.day}
            {index === today ? <span className="ml-2 text-xs font-medium text-primary">{t("hours.today")}</span> : null}
          </span>
          <span>{day.hours}</span>
        </li>
      ))}
    </ul>
  )
}
