import { fold } from "@/lib/format"
import { reportDay, shiftDay } from "@/lib/stats"

export const needEventKinds = ["search", "external", "guide", "contact", "feedback", "register", "alternative"] as const
export type NeedEventKind = (typeof needEventKinds)[number]

export const needExternalKinds = ["web", "video", "maps", "places"] as const
export type NeedExternalKind = (typeof needExternalKinds)[number]

export const needStages = ["direct", "corrected", "nearby", "zero"] as const
export type NeedStage = (typeof needStages)[number]

export type NeedEventInput = {
  kind: NeedEventKind
  /** Normalized need sentence (see normalizeNeedQuery). */
  q: string
  category?: string
  city?: string
  /** Result count for a search. */
  count?: number
  voice?: boolean
  stage?: NeedStage
  intent?: "isletme" | "bilgi"
  /** External kind, contact kind, feedback vote or guide id. */
  target?: string
}

export type NeedDay = {
  searches: number
  zero: number
  matched: number
  voice: number
  info: number
  corrected: number
  nearby: number
  web: number
  video: number
  maps: number
  places: number
  guides: number
  contacts: number
  register: number
  up: number
  down: number
  alternatives: number
}

export type NeedQueryRow = {
  q: string
  count: number
  zero: number
  last: string
  category: string
  city: string
  contacts: number
  external: number
}

export type NeedCategoryRow = { searches: number; zero: number; contacts: number }

export type NeedState = {
  version: 1
  days: Record<string, NeedDay>
  queries: Record<string, NeedQueryRow>
  categories: Record<string, NeedCategoryRow>
}

export type NeedReport = {
  from: string
  to: string
  days: number
  totals: NeedDay
  rates: {
    match: number | null
    zero: number | null
    external: number | null
    contact: number | null
    guide: number | null
    satisfaction: number | null
  }
  series: { day: string; label: string; searches: number; zero: number; external: number; contacts: number }[]
  topQueries: NeedQueryRow[]
  zeroQueries: NeedQueryRow[]
  topCategories: ({ id: string } & NeedCategoryRow)[]
  external: Record<NeedExternalKind, number>
}

const dayPattern = /^(\d{4})-(\d{2})-(\d{2})$/
export const NEED_QUERY_CAP = 400
export const NEED_DAY_CAP = 400
export const NEED_QUERY_MAX = 60

export function emptyNeedDay(): NeedDay {
  return {
    searches: 0,
    zero: 0,
    matched: 0,
    voice: 0,
    info: 0,
    corrected: 0,
    nearby: 0,
    web: 0,
    video: 0,
    maps: 0,
    places: 0,
    guides: 0,
    contacts: 0,
    register: 0,
    up: 0,
    down: 0,
    alternatives: 0,
  }
}

export function emptyNeedStats(): NeedState {
  return { version: 1, days: {}, queries: {}, categories: {} }
}

function count(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.min(1_000_000, Math.floor(value)) : 0
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.slice(0, max) : ""
}

/**
 * Lowercase ASCII, single spaces, at most 60 characters. Long digit runs and e-mail style tokens are
 * dropped so a phone number or address never lands in the report.
 */
export function normalizeNeedQuery(value: string) {
  const folded = fold(value.replace(/\S+@\S+/g, " "))
  const digits = (folded.match(/\d/g) ?? []).length
  return folded
    .split(" ")
    .filter((token) => token && !/\d{4,}/.test(token) && !(digits >= 7 && /^\d+$/.test(token)))
    .join(" ")
    .slice(0, NEED_QUERY_MAX)
    .trim()
}

export function readNeedEvent(body: Record<string, unknown> | null): NeedEventInput | null {
  if (!body) return null
  const kind = body.kind
  if (typeof kind !== "string" || !needEventKinds.includes(kind as NeedEventKind)) return null
  const q = normalizeNeedQuery(text(body.q, 240))
  if (!q && kind !== "register") return null
  const stage = typeof body.stage === "string" && needStages.includes(body.stage as NeedStage) ? (body.stage as NeedStage) : undefined
  const intent = body.intent === "bilgi" ? "bilgi" : body.intent === "isletme" ? "isletme" : undefined
  return {
    kind: kind as NeedEventKind,
    q,
    category: fold(text(body.category, 40)).replace(/\s+/g, "-"),
    city: text(body.city, 40).replace(/[\u0000-\u001F\u007F]/g, "").trim(),
    count: typeof body.count === "number" && Number.isFinite(body.count) ? Math.max(0, Math.min(10_000, Math.floor(body.count))) : undefined,
    voice: body.voice === true,
    stage,
    intent,
    target: fold(text(body.target, 40)).replace(/\s+/g, "-"),
  }
}

function needDay(value: unknown): NeedDay {
  const raw = value && typeof value === "object" ? (value as Partial<NeedDay>) : {}
  const day = emptyNeedDay()
  for (const key of Object.keys(day) as (keyof NeedDay)[]) day[key] = count(raw[key])
  return day
}

function queryRow(value: unknown): NeedQueryRow | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Partial<NeedQueryRow>
  const q = normalizeNeedQuery(text(raw.q, NEED_QUERY_MAX))
  if (!q) return null
  return {
    q,
    count: count(raw.count),
    zero: count(raw.zero),
    last: dayPattern.test(text(raw.last, 10)) ? text(raw.last, 10) : "",
    category: text(raw.category, 40),
    city: text(raw.city, 40),
    contacts: count(raw.contacts),
    external: count(raw.external),
  }
}

export function parseNeedStats(raw: string | null): NeedState | null {
  if (raw === null) return emptyNeedStats()
  try {
    const data = JSON.parse(raw) as Partial<NeedState>
    if (!data || data.version !== 1) return null
    const days: Record<string, NeedDay> = {}
    for (const [day, value] of Object.entries(data.days && typeof data.days === "object" ? data.days : {}).slice(-NEED_DAY_CAP)) {
      if (dayPattern.test(day)) days[day] = needDay(value)
    }
    const queries: Record<string, NeedQueryRow> = {}
    for (const value of Object.values(data.queries && typeof data.queries === "object" ? data.queries : {}).slice(0, NEED_QUERY_CAP)) {
      const row = queryRow(value)
      if (row) queries[row.q] = row
    }
    const categories: Record<string, NeedCategoryRow> = {}
    for (const [id, value] of Object.entries(data.categories && typeof data.categories === "object" ? data.categories : {}).slice(0, 200)) {
      const raw = value && typeof value === "object" ? (value as Partial<NeedCategoryRow>) : {}
      if (id) categories[id.slice(0, 40)] = { searches: count(raw.searches), zero: count(raw.zero), contacts: count(raw.contacts) }
    }
    return { version: 1, days, queries, categories }
  } catch {
    return null
  }
}

function ensureDay(state: NeedState, day: string) {
  if (!state.days[day]) state.days[day] = emptyNeedDay()
  return state.days[day]
}

function ensureQuery(state: NeedState, event: NeedEventInput, day: string) {
  const current = state.queries[event.q]
  if (current) {
    current.last = day
    if (event.category) current.category = event.category
    if (event.city) current.city = event.city
    return current
  }
  const row: NeedQueryRow = { q: event.q, count: 0, zero: 0, last: day, category: event.category ?? "", city: event.city ?? "", contacts: 0, external: 0 }
  state.queries[event.q] = row
  return row
}

function ensureCategory(state: NeedState, id: string) {
  if (!state.categories[id]) state.categories[id] = { searches: 0, zero: 0, contacts: 0 }
  return state.categories[id]
}

function trim(state: NeedState, today: string) {
  const floor = shiftDay(today, -(NEED_DAY_CAP - 1))
  for (const day of Object.keys(state.days)) if (day < floor) delete state.days[day]
  const rows = Object.values(state.queries)
  if (rows.length > NEED_QUERY_CAP) {
    rows.sort((a, b) => a.count - b.count || a.last.localeCompare(b.last))
    for (const row of rows.slice(0, rows.length - NEED_QUERY_CAP)) delete state.queries[row.q]
  }
}

export function noteNeedEvent(state: NeedState, event: NeedEventInput, now: number): NeedState {
  const day = reportDay(now)
  if (!day) return state
  const next: NeedState = {
    version: 1,
    days: { ...state.days },
    queries: Object.fromEntries(Object.entries(state.queries).map(([key, row]) => [key, { ...row }])),
    categories: Object.fromEntries(Object.entries(state.categories).map(([key, row]) => [key, { ...row }])),
  }
  next.days[day] = { ...(next.days[day] ?? emptyNeedDay()) }
  const stat = ensureDay(next, day)
  if (event.kind === "search") {
    const zero = (event.count ?? 0) === 0
    stat.searches += 1
    if (zero) stat.zero += 1
    else stat.matched += 1
    if (event.voice) stat.voice += 1
    if (event.intent === "bilgi") stat.info += 1
    if (event.stage === "corrected") stat.corrected += 1
    if (event.stage === "nearby") stat.nearby += 1
    const row = ensureQuery(next, event, day)
    row.count += 1
    if (zero) row.zero += 1
    if (event.category) {
      const category = ensureCategory(next, event.category)
      category.searches += 1
      if (zero) category.zero += 1
    }
  } else if (event.kind === "external") {
    const target = event.target as NeedExternalKind
    if (needExternalKinds.includes(target)) stat[target] += 1
    else stat.web += 1
    ensureQuery(next, event, day).external += 1
  } else if (event.kind === "guide") {
    stat.guides += 1
  } else if (event.kind === "contact") {
    stat.contacts += 1
    ensureQuery(next, event, day).contacts += 1
    if (event.category) ensureCategory(next, event.category).contacts += 1
  } else if (event.kind === "feedback") {
    if (event.target === "up") stat.up += 1
    else if (event.target === "down") stat.down += 1
  } else if (event.kind === "register") {
    stat.register += 1
  } else if (event.kind === "alternative") {
    stat.alternatives += 1
  }
  trim(next, day)
  return next
}

function percent(part: number, whole: number) {
  if (!whole) return null
  return Math.round((part / whole) * 100)
}

function label(day: string) {
  const match = dayPattern.exec(day)
  return match ? `${match[3]}.${match[2]}` : day
}

export function needReport(state: NeedState, from: string, to: string): NeedReport | null {
  if (!dayPattern.test(from) || !dayPattern.test(to) || from > to) return null
  const totals = emptyNeedDay()
  const series: NeedReport["series"] = []
  let cursor = from
  let steps = 0
  while (cursor <= to && steps < NEED_DAY_CAP) {
    const stat = state.days[cursor] ?? emptyNeedDay()
    for (const key of Object.keys(totals) as (keyof NeedDay)[]) totals[key] += stat[key]
    series.push({
      day: cursor,
      label: label(cursor),
      searches: stat.searches,
      zero: stat.zero,
      external: stat.web + stat.video + stat.maps + stat.places,
      contacts: stat.contacts,
    })
    cursor = shiftDay(cursor, 1)
    steps += 1
  }
  const externalTotal = totals.web + totals.video + totals.maps + totals.places
  const rows = Object.values(state.queries)
  return {
    from,
    to,
    days: series.length,
    totals,
    rates: {
      match: percent(totals.matched, totals.searches),
      zero: percent(totals.zero, totals.searches),
      external: percent(externalTotal, totals.searches),
      contact: percent(totals.contacts, totals.searches),
      guide: percent(totals.guides, totals.searches),
      satisfaction: percent(totals.up, totals.up + totals.down),
    },
    series,
    topQueries: [...rows].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last)).slice(0, 15),
    zeroQueries: rows.filter((row) => row.zero > 0).sort((a, b) => b.zero - a.zero || b.last.localeCompare(a.last)).slice(0, 15),
    topCategories: Object.entries(state.categories)
      .map(([id, row]) => ({ id, ...row }))
      .sort((a, b) => b.searches - a.searches || b.contacts - a.contacts)
      .slice(0, 12),
    external: { web: totals.web, video: totals.video, maps: totals.maps, places: totals.places },
  }
}
