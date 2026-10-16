const zone = "Europe/Istanbul"

export type DayStat = {
  views: number
  sessions: number
  uniques: number
  newCustomers: number
  newBusinesses: number
  verifiedCustomers: number
  verifiedBusinesses: number
  customerLogins: number
  businessLogins: number
  customerActive: number
  businessActive: number
  customerSeen: string[]
  businessSeen: string[]
  sources: Record<string, number>
}

export type StatsState = {
  version: 1
  customers: number
  businesses: number
  verifiedCustomers: number
  verifiedBusinesses: number
  customerLogins: number
  businessLogins: number
  lastCustomerLogin: string
  lastBusinessLogin: string
  registered: string[]
  verified: string[]
  days: Record<string, DayStat>
  seen: string[]
}

export type StatsReport = {
  from: string
  to: string
  days: number
  series: { day: string; views: number; sessions: number; newCustomers: number; newBusinesses: number; customerLogins: number; businessLogins: number }[]
  chart: { label: string; views: number; newCustomers: number; newBusinesses: number }[]
  totals: {
    views: number
    sessions: number
    uniques: number
    newCustomers: number
    newBusinesses: number
    customerLogins: number
    businessLogins: number
    customerActive: number
    businessActive: number
  }
  lifetime: {
    customers: number
    businesses: number
    verifiedCustomers: number
    verifiedBusinesses: number
    customerLogins: number
    businessLogins: number
    lastCustomerLogin: string
    lastBusinessLogin: string
    customerVerify: number | null
    businessVerify: number | null
  }
  previous: { views: number; sessions: number; newCustomers: number; newBusinesses: number; customerLogins: number; businessLogins: number }
  change: { views: number | null; sessions: number | null; newCustomers: number | null; newBusinesses: number | null; customerLogins: number | null; businessLogins: number | null }
  averages: { views: number; sessions: number }
  sources: { host: string; count: number }[]
  activePartial: boolean
  approvals: { pending: number; approved: number; rejected: number; late: number }
}

const dayPattern = /^(\d{4})-(\d{2})-(\d{2})$/
const botPattern = /bot|crawl|spider|slurp|headless|wget|curl|python-|go-http|bytespider|petalbot|semrush|ahrefs|facebookexternal|whatsapp|telegrambot/i

export function emptyDay(): DayStat {
  return {
    views: 0,
    sessions: 0,
    uniques: 0,
    newCustomers: 0,
    newBusinesses: 0,
    verifiedCustomers: 0,
    verifiedBusinesses: 0,
    customerLogins: 0,
    businessLogins: 0,
    customerActive: 0,
    businessActive: 0,
    customerSeen: [],
    businessSeen: [],
    sources: {},
  }
}

export function emptyStats(): StatsState {
  return {
    version: 1,
    customers: 0,
    businesses: 0,
    verifiedCustomers: 0,
    verifiedBusinesses: 0,
    customerLogins: 0,
    businessLogins: 0,
    lastCustomerLogin: "",
    lastBusinessLogin: "",
    registered: [],
    verified: [],
    days: {},
    seen: [],
  }
}

function count(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.min(1_000_000, Math.floor(value)) : 0
}

function idList(value: unknown, max: number) {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string" && item.length > 0 && item.length <= 40).slice(-max)
}

function sources(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const next: Record<string, number> = {}
  for (const [host, total] of Object.entries(value).slice(0, 8)) {
    const name = host.slice(0, 40)
    const amount = count(total)
    if (name && amount) next[name] = amount
  }
  return next
}

function dayStat(value: unknown): DayStat {
  const row = value && typeof value === "object" ? (value as Partial<DayStat>) : {}
  return {
    views: count(row.views),
    sessions: count(row.sessions),
    uniques: count(row.uniques),
    newCustomers: count(row.newCustomers),
    newBusinesses: count(row.newBusinesses),
    verifiedCustomers: count(row.verifiedCustomers),
    verifiedBusinesses: count(row.verifiedBusinesses),
    customerLogins: count(row.customerLogins),
    businessLogins: count(row.businessLogins),
    customerActive: count(row.customerActive),
    businessActive: count(row.businessActive),
    customerSeen: idList(row.customerSeen, 100),
    businessSeen: idList(row.businessSeen, 100),
    sources: sources(row.sources),
  }
}

export function parseStats(raw: string | null): StatsState | null {
  if (raw === null) return emptyStats()
  try {
    const data = JSON.parse(raw) as Partial<StatsState>
    if (!data || data.version !== 1 || !data.days || typeof data.days !== "object" || Array.isArray(data.days)) return null
    const days: Record<string, DayStat> = {}
    for (const [day, value] of Object.entries(data.days).slice(0, 400)) {
      if (dayPattern.test(day)) days[day] = dayStat(value)
    }
    return {
      version: 1,
      customers: count(data.customers),
      businesses: count(data.businesses),
      verifiedCustomers: count(data.verifiedCustomers),
      verifiedBusinesses: count(data.verifiedBusinesses),
      customerLogins: count(data.customerLogins),
      businessLogins: count(data.businessLogins),
      lastCustomerLogin: typeof data.lastCustomerLogin === "string" ? data.lastCustomerLogin.slice(0, 40) : "",
      lastBusinessLogin: typeof data.lastBusinessLogin === "string" ? data.lastBusinessLogin.slice(0, 40) : "",
      registered: idList(data.registered, 500),
      verified: idList(data.verified, 500),
      days,
      seen: Array.isArray(data.seen) ? data.seen.filter((item): item is string => typeof item === "string" && item.length <= 140).slice(-800) : [],
    }
  } catch {
    return null
  }
}

export function reportDay(value: string | number) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date)
}

export function reportHour(value: number) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value))
  return Number(parts.find((part) => part.type === "hour")?.value ?? "0")
}

export function isMonday(value: number) {
  return new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short" }).format(new Date(value)) === "Mon"
}

export function shiftDay(day: string, count: number) {
  const match = dayPattern.exec(day)
  if (!match) return ""
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}

export function isoWeek(day: string) {
  const match = dayPattern.exec(day)
  if (!match) return ""
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
}

export function eachDay(from: string, to: string) {
  const days: string[] = []
  let cursor = from
  while (cursor && cursor <= to && days.length < 400) {
    days.push(cursor)
    cursor = shiftDay(cursor, 1)
  }
  return days
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 100)
}

export function botUserAgent(value: string | null) {
  return botPattern.test(value || "")
}

export function sourceHost(referrer: string | null) {
  if (!referrer) return "doğrudan"
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "")
    if (!host || host === "pinwego.com" || host === "localhost" || host === "127.0.0.1") return "doğrudan"
    return host.slice(0, 40)
  } catch {
    return "doğrudan"
  }
}

export function visitPath(value: unknown) {
  if (typeof value !== "string") return ""
  const path = value.split("?")[0]?.split("#")[0] ?? ""
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("..") || path.startsWith("/api")) return ""
  return path.slice(0, 80)
}

function ensure(state: StatsState, day: string) {
  if (!state.days[day]) state.days[day] = emptyDay()
  return state.days[day]
}

function trim(state: StatsState, today: string) {
  for (const day of Object.keys(state.days)) {
    if (day < shiftDay(today, -400)) delete state.days[day]
    else if (day < shiftDay(today, -45)) {
      state.days[day].customerSeen = []
      state.days[day].businessSeen = []
    }
  }
  const oldest = shiftDay(today, -14)
  state.seen = state.seen.filter((key) => key.slice(0, 10) >= oldest).slice(-800)
}

function foldSources(bucket: DayStat) {
  const hosts = Object.entries(bucket.sources).sort((left, right) => right[1] - left[1])
  if (hosts.length <= 8) return
  const keep = hosts.slice(0, 7)
  const rest = hosts.slice(7).reduce((sum, item) => sum + item[1], 0)
  bucket.sources = Object.fromEntries(keep)
  bucket.sources["diğer"] = (bucket.sources["diğer"] || 0) + rest
}

export function noteVisit(state: StatsState, input: { at: number; session: string; path: string; source: string }) {
  const day = reportDay(input.at)
  const session = input.session.toLowerCase().replace(/[^a-f0-9]/g, "").slice(0, 24)
  const path = visitPath(input.path)
  if (!day || !session || !path) return { state, fresh: false }
  const viewKey = `${day}|${session}|${path}`
  const sessionKey = `${day}|${session}|*`
  if (state.seen.includes(viewKey)) return { state, fresh: false }
  const next = structuredClone(state)
  const bucket = ensure(next, day)
  bucket.views += 1
  if (!next.seen.includes(sessionKey)) {
    bucket.sessions += 1
    bucket.uniques += 1
    next.seen.push(sessionKey)
  }
  const source = (input.source || "doğrudan").slice(0, 40)
  bucket.sources[source] = (bucket.sources[source] || 0) + 1
  foldSources(bucket)
  next.seen.push(viewKey)
  trim(next, day)
  return { state: next, fresh: true }
}

export function noteAccount(state: StatsState, input: { at: number; role: "musteri" | "isletme"; kind: "kayit" | "dogrula" | "giris"; id: string }) {
  const day = reportDay(input.at)
  const id = input.id.slice(0, 40)
  if (!day || !id) return state
  if (input.kind === "kayit" && state.registered.includes(id)) return state
  if (input.kind === "dogrula" && state.verified.includes(id)) return state
  const next = structuredClone(state)
  const bucket = ensure(next, day)
  const business = input.role === "isletme"
  if (input.kind === "kayit") {
    next.registered = [...next.registered, id].slice(-500)
    if (business) {
      next.businesses += 1
      bucket.newBusinesses += 1
    } else {
      next.customers += 1
      bucket.newCustomers += 1
    }
  }
  if (input.kind === "dogrula") {
    next.verified = [...next.verified, id].slice(-500)
    if (business) {
      next.verifiedBusinesses += 1
      bucket.verifiedBusinesses += 1
    } else {
      next.verifiedCustomers += 1
      bucket.verifiedCustomers += 1
    }
  }
  if (input.kind === "giris") {
    const stamp = new Date(input.at).toISOString()
    if (business) {
      next.businessLogins += 1
      next.lastBusinessLogin = stamp
      bucket.businessLogins += 1
      if (!bucket.businessSeen.includes(id) && bucket.businessSeen.length < 100) bucket.businessSeen.push(id)
      bucket.businessActive = Math.max(bucket.businessActive, bucket.businessSeen.length)
    } else {
      next.customerLogins += 1
      next.lastCustomerLogin = stamp
      bucket.customerLogins += 1
      if (!bucket.customerSeen.includes(id) && bucket.customerSeen.length < 100) bucket.customerSeen.push(id)
      bucket.customerActive = Math.max(bucket.customerActive, bucket.customerSeen.length)
    }
  }
  trim(next, day)
  return next
}

function sumDays(state: StatsState, days: string[]) {
  const totals = { views: 0, sessions: 0, uniques: 0, newCustomers: 0, newBusinesses: 0, customerLogins: 0, businessLogins: 0 }
  for (const day of days) {
    const bucket = state.days[day]
    if (!bucket) continue
    totals.views += bucket.views
    totals.sessions += bucket.sessions
    totals.uniques += bucket.uniques
    totals.newCustomers += bucket.newCustomers
    totals.newBusinesses += bucket.newBusinesses
    totals.customerLogins += bucket.customerLogins
    totals.businessLogins += bucket.businessLogins
  }
  return totals
}

function rate(part: number, whole: number) {
  if (whole <= 0) return null
  return Math.round((part / whole) * 100)
}

export function statsReport(state: StatsState, from: string, to: string): StatsReport | null {
  if (!dayPattern.test(from) || !dayPattern.test(to) || from > to) return null
  const days = eachDay(from, to)
  if (!days.length) return null
  const totals = sumDays(state, days)
  const prevTo = shiftDay(from, -1)
  const prevFrom = shiftDay(prevTo, -(days.length - 1))
  const previous = sumDays(state, eachDay(prevFrom, prevTo))
  const series = days.map((day) => {
    const bucket = state.days[day] ?? emptyDay()
    return {
      day,
      views: bucket.views,
      sessions: bucket.sessions,
      newCustomers: bucket.newCustomers,
      newBusinesses: bucket.newBusinesses,
      customerLogins: bucket.customerLogins,
      businessLogins: bucket.businessLogins,
    }
  })
  const grouped = new Map<string, { label: string; views: number; newCustomers: number; newBusinesses: number }>()
  for (const point of series) {
    const label = days.length > 62 ? point.day.slice(0, 7) : point.day.slice(5)
    const row = grouped.get(label) ?? { label, views: 0, newCustomers: 0, newBusinesses: 0 }
    row.views += point.views
    row.newCustomers += point.newCustomers
    row.newBusinesses += point.newBusinesses
    grouped.set(label, row)
  }
  const customers = new Set<string>()
  const businesses = new Set<string>()
  let activePartial = false
  const sourceTotals = new Map<string, number>()
  for (const day of days) {
    const bucket = state.days[day]
    if (!bucket) continue
    for (const id of bucket.customerSeen) customers.add(id)
    for (const id of bucket.businessSeen) businesses.add(id)
    if (bucket.customerActive > bucket.customerSeen.length || bucket.businessActive > bucket.businessSeen.length) activePartial = true
    for (const [host, amount] of Object.entries(bucket.sources)) sourceTotals.set(host, (sourceTotals.get(host) || 0) + amount)
  }
  return {
    from,
    to,
    days: days.length,
    series,
    chart: [...grouped.values()],
    totals: { ...totals, customerActive: customers.size, businessActive: businesses.size },
    lifetime: {
      customers: state.customers,
      businesses: state.businesses,
      verifiedCustomers: state.verifiedCustomers,
      verifiedBusinesses: state.verifiedBusinesses,
      customerLogins: state.customerLogins,
      businessLogins: state.businessLogins,
      lastCustomerLogin: state.lastCustomerLogin,
      lastBusinessLogin: state.lastBusinessLogin,
      customerVerify: rate(state.verifiedCustomers, state.customers),
      businessVerify: rate(state.verifiedBusinesses, state.businesses),
    },
    previous,
    change: {
      views: percentChange(totals.views, previous.views),
      sessions: percentChange(totals.sessions, previous.sessions),
      newCustomers: percentChange(totals.newCustomers, previous.newCustomers),
      newBusinesses: percentChange(totals.newBusinesses, previous.newBusinesses),
      customerLogins: percentChange(totals.customerLogins, previous.customerLogins),
      businessLogins: percentChange(totals.businessLogins, previous.businessLogins),
    },
    averages: { views: Math.round(totals.views / days.length), sessions: Math.round(totals.sessions / days.length) },
    sources: [...sourceTotals.entries()].sort((left, right) => right[1] - left[1]).slice(0, 6).map(([host, amount]) => ({ host, count: amount })),
    activePartial,
    approvals: { pending: 0, approved: 0, rejected: 0, late: 0 },
  }
}
