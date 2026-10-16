"use client"

import { normalizeNeedQuery, type NeedEventInput } from "@/lib/need-analytics"

const CONTEXT_KEY = "pinwego.need.context.v1"
const CONTEXT_TTL = 30 * 60 * 1000

export type NeedContext = { q: string; category: string; city: string; at: number }

function session() {
  try {
    if (typeof sessionStorage !== "undefined") return sessionStorage
  } catch {
    /* storage can be blocked */
  }
  return null
}

/**
 * Send one anonymous need event. `once` dedupes within the tab for the current day so a re-render or
 * a back-navigation does not count a second search.
 */
export function trackNeed(event: NeedEventInput, once?: string) {
  if (typeof window === "undefined") return false
  if (once) {
    const mark = `pinwego.need.once.${once}.${new Date().toISOString().slice(0, 10)}`
    const box = session()
    if (box) {
      if (box.getItem(mark)) return false
      try {
        box.setItem(mark, "1")
      } catch {
        return false
      }
    }
  }
  void fetch("/api/ihtiyac", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    keepalive: true,
    body: JSON.stringify({ ...event, q: normalizeNeedQuery(event.q) }),
  }).catch(() => undefined)
  return true
}

export function rememberNeedContext(q: string, category: string, city: string) {
  const box = session()
  if (!box) return
  const normalized = normalizeNeedQuery(q)
  if (!normalized) return
  try {
    box.setItem(CONTEXT_KEY, JSON.stringify({ q: normalized, category, city, at: Date.now() } satisfies NeedContext))
  } catch {
    /* the search still works without attribution */
  }
}

export function readNeedContext(): NeedContext | null {
  const box = session()
  if (!box) return null
  try {
    const raw = box.getItem(CONTEXT_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<NeedContext>
    if (typeof data.q !== "string" || typeof data.at !== "number") return null
    if (Date.now() - data.at > CONTEXT_TTL) return null
    return { q: data.q, category: typeof data.category === "string" ? data.category : "", city: typeof data.city === "string" ? data.city : "", at: data.at }
  } catch {
    return null
  }
}

/** A contact action counts as a conversion only when a need search happened in the last half hour. */
export function trackNeedContact(target: "telefon" | "whatsapp" | "mesaj" | "randevu") {
  const context = readNeedContext()
  if (!context) return false
  return trackNeed({ kind: "contact", q: context.q, category: context.category, city: context.city, target }, `contact.${target}.${context.q}`)
}
