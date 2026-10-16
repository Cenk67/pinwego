import { businesses } from "@/lib/catalog"
import { eachDay, percentChange, reportDay, shiftDay } from "@/lib/stats"
import { businessCode, resolveQr } from "@/lib/qr"

export const viewQuietMs = 30 * 60 * 1000
export const viewCookie = "pinwego_gorunum"
export const viewBookKey = (id: string) => `views:${id}`
export const viewIndexKey = "views:index:v1"
export const viewGuardKey = "views:guard:v1"

const seenCap = 300
const seenKeepDays = 45
const dayKeep = 400
const guardCap = 40
const sources = ["dogrudan", "qr", "kampanya", "paylas", "arama", "dis"] as const

export type ViewSource = (typeof sources)[number]

export type ViewDay = {
  views: number
  uniques: number
  shares: number
  seen: string[]
  shared: string[]
  sources: Partial<Record<ViewSource, number>>
}

export type ViewBook = {
  version: 1
  id: string
  slug: string
  name: string
  total: number
  shares: number
  firstAt: string
  lastAt: string
  days: Record<string, ViewDay>
  recent: { id: string; at: number }[]
}

export type ViewIndex = {
  version: 1
  rows: {
    id: string
    slug: string
    name: string
    total: number
    shares: number
    firstAt: string
    lastAt: string
    days: Record<string, number>
  }[]
}

export type ViewGuard = { version: 1; day: string; counts: Record<string, number> }

export type PublicViews = {
  total: number
  today: number
  last7: number
  last30: number
  previous30: number
  change: number | null
}

const dayPattern = /^(\d{4})-(\d{2})-(\d{2})$/
const hashPattern = /^[a-f0-9]{16}$/
const robotAgent = /bot|crawl|spider|slurp|headless|wget|curl|python-|go-http|bytespider|semrush|ahrefs|facebookexternalhit|telegrambot|twitterbot|linkedinbot|slackbot|discordbot|pinterestbot|embedly|quora link preview|bingpreview|google-inspectiontool|applebot|petalbot|duckduckbot|yandexbot|baiduspider|ia_archiver|facebot|skypeuripreview|vkshare/i

export function skipViewAgent(value: string | null) {
  const agent = value || ""
  if (!agent) return false
  if (/^WhatsApp\//i.test(agent)) return true
  return robotAgent.test(agent)
}

function count(value: unknown, max = 1_000_000_000) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.min(max, Math.floor(value)) : 0
}

function hashes(value: unknown, max: number) {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string" && hashPattern.test(item)).slice(-max)
}

function dayRow(value: unknown): ViewDay {
  const row = value && typeof value === "object" ? (value as Partial<ViewDay>) : {}
  const next: Partial<Record<ViewSource, number>> = {}
  if (row.sources && typeof row.sources === "object" && !Array.isArray(row.sources)) {
    for (const source of sources) {
      const amount = count(row.sources[source])
      if (amount) next[source] = amount
    }
  }
  return {
    views: count(row.views),
    uniques: count(row.uniques),
    shares: count(row.shares),
    seen: hashes(row.seen, seenCap),
    shared: hashes(row.shared, seenCap),
    sources: next,
  }
}

export function emptyViewBook(subject: { id: string; slug: string; name: string }): ViewBook {
  return {
    version: 1,
    id: subject.id,
    slug: subject.slug,
    name: subject.name.slice(0, 80),
    total: 0,
    shares: 0,
    firstAt: "",
    lastAt: "",
    days: {},
    recent: [],
  }
}

export function parseViewBook(raw: string | null, subject: { id: string; slug: string; name: string }): ViewBook | null {
  if (raw === null) return emptyViewBook(subject)
  try {
    const data = JSON.parse(raw) as Partial<ViewBook>
    if (!data || data.version !== 1 || data.id !== subject.id || !data.days || typeof data.days !== "object" || Array.isArray(data.days)) return null
    const days: Record<string, ViewDay> = {}
    for (const [day, value] of Object.entries(data.days).slice(0, dayKeep)) {
      if (dayPattern.test(day)) days[day] = dayRow(value)
    }
    const recent = Array.isArray(data.recent)
      ? data.recent
          .filter((item): item is { id: string; at: number } => Boolean(item) && typeof item === "object" && hashPattern.test(String((item as { id?: string }).id)) && typeof (item as { at?: number }).at === "number")
          .slice(-80)
      : []
    return {
      version: 1,
      id: subject.id,
      slug: typeof data.slug === "string" && data.slug ? data.slug.slice(0, 80) : subject.slug,
      name: typeof data.name === "string" && data.name ? data.name.slice(0, 80) : subject.name.slice(0, 80),
      total: count(data.total),
      shares: count(data.shares),
      firstAt: typeof data.firstAt === "string" ? data.firstAt.slice(0, 40) : "",
      lastAt: typeof data.lastAt === "string" ? data.lastAt.slice(0, 40) : "",
      days,
      recent,
    }
  } catch {
    return null
  }
}

export function emptyIndex(): ViewIndex {
  return { version: 1, rows: [] }
}

export function parseIndex(raw: string | null): ViewIndex | null {
  if (raw === null) return emptyIndex()
  try {
    const data = JSON.parse(raw) as Partial<ViewIndex>
    if (!data || data.version !== 1 || !Array.isArray(data.rows)) return null
    const rows = data.rows.slice(0, 500).flatMap((item) => {
      if (!item || typeof item !== "object") return []
      const row = item as ViewIndex["rows"][number]
      if (typeof row.id !== "string" || typeof row.slug !== "string" || typeof row.name !== "string") return []
      const days: Record<string, number> = {}
      if (row.days && typeof row.days === "object" && !Array.isArray(row.days)) {
        for (const [day, value] of Object.entries(row.days).slice(0, dayKeep)) {
          if (dayPattern.test(day)) {
            const amount = count(value)
            if (amount) days[day] = amount
          }
        }
      }
      return [{
        id: row.id.slice(0, 80),
        slug: row.slug.slice(0, 80),
        name: row.name.slice(0, 80),
        total: count(row.total),
        shares: count(row.shares),
        firstAt: typeof row.firstAt === "string" ? row.firstAt.slice(0, 40) : "",
        lastAt: typeof row.lastAt === "string" ? row.lastAt.slice(0, 40) : "",
        days,
      }]
    })
    return { version: 1, rows }
  } catch {
    return null
  }
}

export function emptyGuard(day: string): ViewGuard {
  return { version: 1, day, counts: {} }
}

export function parseGuard(raw: string | null, day: string): ViewGuard | null {
  if (raw === null) return emptyGuard(day)
  try {
    const data = JSON.parse(raw) as Partial<ViewGuard>
    if (!data || data.version !== 1) return null
    if (data.day !== day) return emptyGuard(day)
    const counts: Record<string, number> = {}
    if (data.counts && typeof data.counts === "object" && !Array.isArray(data.counts)) {
      for (const [id, value] of Object.entries(data.counts).slice(0, 2000)) {
        if (hashPattern.test(id)) {
          const amount = count(value, guardCap)
          if (amount) counts[id] = amount
        }
      }
    }
    return { version: 1, day, counts }
  } catch {
    return null
  }
}

function trimBook(book: ViewBook, today: string) {
  const seenFrom = shiftDay(today, -(seenKeepDays - 1))
  const keepFrom = shiftDay(today, -(dayKeep - 1))
  for (const day of Object.keys(book.days)) {
    if (day < keepFrom) delete book.days[day]
    else if (day < seenFrom) {
      book.days[day].seen = []
      book.days[day].shared = []
    }
  }
  const recentFrom = Date.parse(`${shiftDay(today, -1)}T00:00:00Z`)
  book.recent = book.recent.filter((item) => item.at >= recentFrom - 36 * 60 * 60 * 1000).slice(-80)
}

function ensure(book: ViewBook, day: string) {
  if (!book.days[day]) book.days[day] = { views: 0, uniques: 0, shares: 0, seen: [], shared: [], sources: {} }
  return book.days[day]
}

export function noteView(book: ViewBook, input: { at: number; hash: string; source: ViewSource }) {
  const day = reportDay(input.at)
  if (!day || !hashPattern.test(input.hash)) return { book, counted: false }
  const quiet = book.recent.find((item) => item.id === input.hash)
  if (quiet && input.at - quiet.at < viewQuietMs) return { book, counted: false }
  const next = structuredClone(book)
  const row = ensure(next, day)
  row.views += 1
  next.total += 1
  const stamp = new Date(input.at).toISOString()
  if (!next.firstAt) next.firstAt = stamp
  next.lastAt = stamp
  if (!row.seen.includes(input.hash) && row.seen.length < seenCap) {
    row.seen.push(input.hash)
    row.uniques += 1
  }
  row.sources[input.source] = (row.sources[input.source] ?? 0) + 1
  next.recent = [...next.recent.filter((item) => item.id !== input.hash), { id: input.hash, at: input.at }].slice(-80)
  next.slug = book.slug
  next.name = book.name
  trimBook(next, day)
  return { book: next, counted: true }
}

export function noteShare(book: ViewBook, input: { at: number; hash: string }) {
  const day = reportDay(input.at)
  if (!day || !hashPattern.test(input.hash)) return { book, counted: false }
  const row = book.days[day]
  if (row?.shared.includes(input.hash)) return { book, counted: false }
  const next = structuredClone(book)
  const bucket = ensure(next, day)
  if (bucket.shared.length >= seenCap) return { book, counted: false }
  bucket.shared.push(input.hash)
  bucket.shares += 1
  next.shares += 1
  trimBook(next, day)
  return { book: next, counted: true }
}

export function guardAllows(guard: ViewGuard, hash: string) {
  return (guard.counts[hash] ?? 0) < guardCap
}

export function markGuard(guard: ViewGuard, hash: string) {
  const next = structuredClone(guard)
  next.counts[hash] = (next.counts[hash] ?? 0) + 1
  const entries = Object.entries(next.counts)
  if (entries.length > 2000) next.counts = Object.fromEntries(entries.slice(-2000))
  return next
}

export function putIndex(index: ViewIndex, book: ViewBook, day: string) {
  const days: Record<string, number> = {}
  for (const [key, row] of Object.entries(book.days)) {
    if (row.views) days[key] = row.views
  }
  const row = {
    id: book.id,
    slug: book.slug,
    name: book.name,
    total: book.total,
    shares: book.shares,
    firstAt: book.firstAt,
    lastAt: book.lastAt,
    days,
  }
  const rows = [row, ...index.rows.filter((item) => item.id !== book.id)].slice(0, 500)
  const keepFrom = shiftDay(day, -(dayKeep - 1))
  for (const item of rows) {
    for (const key of Object.keys(item.days)) if (key < keepFrom) delete item.days[key]
  }
  return { version: 1 as const, rows }
}

function sumDays(book: { days: Record<string, { views: number } | number> }, from: string, to: string) {
  let total = 0
  for (const day of eachDay(from, to)) {
    const row = book.days[day]
    total += typeof row === "number" ? row : row?.views ?? 0
  }
  return total
}

export function publicViews(book: ViewBook, now: number): PublicViews {
  const today = reportDay(now)
  const last30From = shiftDay(today, -29)
  const previousFrom = shiftDay(today, -59)
  const previousTo = shiftDay(today, -30)
  const last30 = sumDays(book, last30From, today)
  const previous30 = sumDays(book, previousFrom, previousTo)
  return {
    total: book.total,
    today: book.days[today]?.views ?? 0,
    last7: sumDays(book, shiftDay(today, -6), today),
    last30,
    previous30,
    change: percentChange(last30, previous30),
  }
}

export function rangeUniques(book: ViewBook, from: string, to: string, today: string) {
  const seenFrom = shiftDay(today, -(seenKeepDays - 1))
  const ids = new Set<string>()
  for (const day of eachDay(from, to)) {
    const row = book.days[day]
    if (!row || row.views === 0) continue
    if (day < seenFrom || row.seen.length >= seenCap || row.seen.length !== row.uniques) return null
    for (const id of row.seen) ids.add(id)
  }
  return ids.size
}

function weekStart(day: string) {
  const date = new Date(`${day}T00:00:00Z`)
  const dow = date.getUTCDay() || 7
  return shiftDay(day, 1 - dow)
}

function shortDay(day: string) {
  return `${day.slice(8, 10)}.${day.slice(5, 7)}`
}

function monthLabel(key: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(key)
  if (!match) return key
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1))
  return new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", month: "long", year: "numeric" }).format(date)
}

export function viewReport(book: ViewBook, from: string, to: string, now: number) {
  const today = reportDay(now)
  let start = from
  let end = to
  if (!dayPattern.test(start) || !dayPattern.test(end)) return null
  if (start > end) [start, end] = [end, start]
  if (shiftDay(start, dayKeep - 1) < end) start = shiftDay(end, -(dayKeep - 1))
  const days = eachDay(start, end)
  const series = days.map((day) => ({ day, views: book.days[day]?.views ?? 0 }))
  const weekMap = new Map<string, { from: string; to: string; views: number }>()
  const monthMap = new Map<string, number>()
  const sourceMap: Partial<Record<ViewSource, number>> = {}
  for (const day of days) {
    const row = book.days[day]
    const views = row?.views ?? 0
    const startDay = weekStart(day)
    const week = weekMap.get(startDay) ?? { from: day, to: day, views: 0 }
    week.to = day
    week.views += views
    weekMap.set(startDay, week)
    const month = day.slice(0, 7)
    monthMap.set(month, (monthMap.get(month) ?? 0) + views)
    if (row) {
      for (const source of sources) sourceMap[source] = (sourceMap[source] ?? 0) + (row.sources[source] ?? 0)
    }
  }
  const summary = publicViews(book, now)
  return {
    slug: book.slug,
    name: book.name,
    from: start,
    to: end,
    today,
    total: book.total,
    shares: book.shares,
    rangeViews: series.reduce((sum, item) => sum + item.views, 0),
    todayViews: summary.today,
    last7: summary.last7,
    last30: summary.last30,
    change: summary.change,
    firstAt: book.firstAt,
    lastAt: book.lastAt,
    uniques: rangeUniques(book, start, end, today),
    series,
    weeks: [...weekMap.values()].map((item) => ({ label: `${shortDay(item.from)}–${shortDay(item.to)}`, views: item.views })),
    months: [...monthMap.entries()].map(([key, views]) => ({ label: monthLabel(key), views })),
    sources: sources.flatMap((id) => {
      const countFor = sourceMap[id] ?? 0
      return countFor ? [{ id, count: countFor }] : []
    }),
  }
}

export function indexBoard(index: ViewIndex, from: string, to: string) {
  return index.rows
    .map((row) => ({
      slug: row.slug,
      name: row.name,
      total: row.total,
      shares: row.shares,
      lastAt: row.lastAt,
      rangeViews: sumDays(row, from, to),
      series: eachDay(from, to).map((day) => row.days[day] ?? 0),
    }))
    .sort((left, right) => right.rangeViews - left.rangeViews || right.total - left.total)
    .slice(0, 40)
}

export function viewSource(input: { search: string; from: string; businessId: string }): ViewSource {
  const search = input.search.slice(0, 200)
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  if (params.get("kaynak") === "paylas") return "paylas"
  const card = (params.get("kart") ?? "").trim().toLowerCase()
  const hit = resolveQr(card)
  if (hit && hit.businessId === input.businessId) return hit.kind === "campaign" ? "kampanya" : "qr"
  if (card === businessCode(input.businessId, "business") || card === businessCode(input.businessId, "vcard")) return "qr"
  try {
    const url = new URL(input.from)
    const host = url.hostname.toLowerCase().replace(/^www\./, "")
    if (host === "pinwego.com" || host === "localhost" || host === "127.0.0.1") {
      if (url.pathname.startsWith("/q/")) return "qr"
      if (url.pathname.startsWith("/kampanyalar")) return "kampanya"
      if (url.pathname === "/ara" || url.pathname === "/kesif") return "arama"
      return "dogrudan"
    }
    if (host) return "dis"
  } catch {
    return "dogrudan"
  }
  return "dogrudan"
}

export type ViewSubject = { id: string; slug: string; name: string; ownerAccountId: string; hidden: boolean }

export function catalogSubject(slug: string): ViewSubject | null {
  const clean = slug.trim().toLowerCase()
  if (!/^[a-z0-9-]{2,80}$/.test(clean)) return null
  const business = businesses.find((item) => item.slug === clean)
  if (!business) return null
  return { id: business.id, slug: business.slug, name: business.name, ownerAccountId: "", hidden: false }
}
