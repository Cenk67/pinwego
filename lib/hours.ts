import type { Business, DayHours, DayPlan, HourBook, ManualMark, Presence, SpecialDay, TimeRange } from "@/lib/types"

export const WEEKDAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"] as const

export type ManualAction = {
  mode: "open" | "closed" | "auto"
  span: "2h" | "today" | "until"
  until?: string
}

const weekName: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }

export function istanbulParts(ms: number) {
  const bag: Record<string, string> = {}
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms))) {
    bag[part.type] = part.value
  }
  let hour = Number(bag.hour)
  if (hour === 24) hour = 0
  const month = bag.month ?? "01"
  const day = bag.day ?? "01"
  return {
    year: Number(bag.year),
    month: Number(month),
    day: Number(day),
    hour,
    minute: Number(bag.minute),
    weekday: weekName[bag.weekday ?? ""] ?? 0,
    date: `${bag.year}-${month}-${day}`,
    minutes: hour * 60 + Number(bag.minute),
  }
}

function offsetMs(ms: number) {
  const part = istanbulParts(ms)
  const wall = Date.UTC(part.year, part.month - 1, part.day, part.hour, part.minute)
  return wall - Math.floor(ms / 60000) * 60000
}

export function endOfIstanbulDay(ms: number) {
  const part = istanbulParts(ms)
  return Date.UTC(part.year, part.month - 1, part.day + 1) - offsetMs(ms)
}

export function istanbulTime(date: string, time: string, now: number) {
  const [year, month, day] = date.split("-").map(Number)
  const [hour, minute] = time.split(":").map(Number)
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return 0
  return Date.UTC(year, month - 1, day, hour, minute) - offsetMs(now)
}

function shiftDate(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

function weekdayOf(date: string) {
  const [year, month, day] = date.split("-").map(Number)
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7
}

function clock(value: string, end = false) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  if (!match) return null
  const minute = Number(match[1]) * 60 + Number(match[2])
  if (end && minute === 23 * 60 + 59) return 1440
  return minute
}

function stamp(minute: number) {
  const capped = Math.min(minute, 23 * 60 + 59)
  return `${String(Math.floor(capped / 60)).padStart(2, "0")}:${String(capped % 60).padStart(2, "0")}`
}

function plain(value: string, max: number) {
  const text = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim()
  if (text.includes("<") || text.includes(">")) return null
  return text.slice(0, max)
}

function rangePair(start: string, end: string): TimeRange | null {
  const open = clock(start)
  const close = clock(end, true)
  if (open === null || close === null || open === close) return null
  return { start: stamp(open), end: close === 1440 ? "23:59" : stamp(close) }
}

function parseRanges(value: string): TimeRange[] | null {
  const text = value.trim()
  if (!text || /^kapal[ıi]$/i.test(text)) return []
  const parts = text.split(/\s*(?:,|;| ve )\s*/i).map((item) => item.trim()).filter(Boolean)
  const ranges: TimeRange[] = []
  for (const part of parts) {
    const match = part.match(/(\d{1,2})[.:](\d{2})\s*[–—-]\s*(\d{1,2})[.:](\d{2})/)
    if (!match) return null
    const range = rangePair(
      `${match[1].padStart(2, "0")}:${match[2]}`,
      `${match[3].padStart(2, "0")}:${match[4]}`,
    )
    if (!range) return null
    ranges.push(range)
  }
  return ranges.slice(0, 3)
}

function closedDay(): DayPlan {
  return { closed: true, ranges: [] }
}

export function bookFromHours(days: DayHours[]): HourBook {
  const week = WEEKDAYS.map((name) => {
    const row = days.find((item) => item.day === name)
    const ranges = row ? parseRanges(row.hours) : []
    if (!ranges || !ranges.length) return closedDay()
    return { closed: false, ranges }
  })
  return { week, specials: [], manual: null }
}

export function hoursKnown(days: DayHours[], book?: HourBook | null) {
  if (book) return true
  return days.some((day) => day.hours.trim().length > 0)
}

export function hoursFromBook(book: HourBook): DayHours[] {
  return book.week.map((day, index) => ({
    day: WEEKDAYS[index] ?? "",
    hours: day.closed || !day.ranges.length
      ? "Kapalı"
      : day.ranges.map((range) => `${range.start}–${range.end}`).join(", "),
  }))
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function spans(ranges: TimeRange[]) {
  const pieces: [number, number][] = []
  for (const range of ranges) {
    const start = clock(range.start)
    const end = clock(range.end, true)
    if (start === null || end === null || start === end) return null
    if (end > start) pieces.push([start, end])
    else {
      pieces.push([start, 1440])
      if (end > 0) pieces.push([0, end])
    }
  }
  pieces.sort((a, b) => a[0] - b[0])
  for (let index = 1; index < pieces.length; index += 1) {
    if (pieces[index][0] < pieces[index - 1][1]) return null
  }
  return pieces
}

function cleanRanges(value: unknown): TimeRange[] | null {
  if (!Array.isArray(value) || value.length > 3) return null
  const ranges: TimeRange[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") return null
    const row = item as Partial<TimeRange>
    if (typeof row.start !== "string" || typeof row.end !== "string") return null
    const range = rangePair(row.start, row.end)
    if (!range) return null
    ranges.push(range)
  }
  if (!spans(ranges)) return null
  return ranges
}

function cleanDay(value: unknown): DayPlan | null {
  if (!value || typeof value !== "object") return null
  const row = value as Partial<DayPlan>
  if (row.closed === true) return closedDay()
  const ranges = cleanRanges(row.ranges)
  if (!ranges || !ranges.length) return null
  return { closed: false, ranges }
}

export function storedBook(value: unknown): HourBook | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Partial<HourBook>
  if (!Array.isArray(row.week) || row.week.length !== 7) return null
  const week: DayPlan[] = []
  for (const day of row.week) {
    const clean = cleanDay(day)
    if (!clean) return null
    week.push(clean)
  }
  if (!Array.isArray(row.specials) || row.specials.length > 16) return null
  const seen = new Set<string>()
  const specials: SpecialDay[] = []
  for (const item of row.specials) {
    if (!item || typeof item !== "object") return null
    const special = item as Partial<SpecialDay>
    if (typeof special.date !== "string" || !validDate(special.date) || seen.has(special.date)) return null
    const note = plain(typeof special.note === "string" ? special.note : "", 80)
    if (note === null) return null
    seen.add(special.date)
    if (special.closed === true) {
      specials.push({ date: special.date, closed: true, ranges: [], note })
      continue
    }
    const ranges = cleanRanges(special.ranges)
    if (!ranges || !ranges.length) return null
    specials.push({ date: special.date, closed: false, ranges, note })
  }
  let manual: ManualMark | null = null
  if (row.manual) {
    if (typeof row.manual !== "object") return null
    const mark = row.manual as Partial<ManualMark>
    if (mark.mode !== "open" && mark.mode !== "closed") return null
    if (typeof mark.until !== "string" || typeof mark.at !== "string") return null
    const until = Date.parse(mark.until)
    const at = Date.parse(mark.at)
    if (!Number.isFinite(until) || !Number.isFinite(at)) return null
    const by = typeof mark.by === "string" ? mark.by.replace(/[^\w.-]/g, "").slice(0, 40) : ""
    manual = { mode: mark.mode, until: new Date(until).toISOString(), at: new Date(at).toISOString(), ...(by ? { by } : {}) }
  }
  return { week, specials, manual }
}

export function weekError(book: HourBook) {
  if (book.specials.some((item) => !item.date)) return "Özel günün tarihi eksik."
  if (!storedBook({ ...book, manual: null })) return "Saat aralıkları çakışıyor veya eksik."
  return ""
}

export function publicBook(book: HourBook): HourBook {
  if (!book.manual) return book
  return { ...book, manual: { mode: book.manual.mode, until: book.manual.until, at: book.manual.at } }
}

function planOn(book: HourBook, date: string) {
  const special = book.specials.find((item) => item.date === date)
  if (special) return { ...special, special: true }
  return { ...book.week[weekdayOf(date)], note: "", special: false }
}

function intervalsOn(book: HourBook, date: string) {
  const own = planOn(book, date)
  const result: [number, number][] = []
  if (!own.closed) {
    for (const range of own.ranges) {
      const start = clock(range.start) ?? 0
      const end = clock(range.end, true) ?? 0
      if (end > start) result.push([start, end])
      else if (end < start) result.push([start, 1440])
    }
  }
  if (!own.special) {
    const prev = planOn(book, shiftDate(date, -1))
    if (!prev.closed) {
      for (const range of prev.ranges) {
        const start = clock(range.start) ?? 0
        const end = clock(range.end, true) ?? 0
        if (end < start) result.push([0, end])
      }
    }
  }
  return result.sort((a, b) => a[0] - b[0])
}

function clockLabel(date: string, minute: number, today: string) {
  const time = minute >= 1440 ? "00:00" : stamp(minute)
  if (date === today) return time
  const [, month, day] = date.split("-")
  return `${day}.${month} ${time}`
}

function nextClose(book: HourBook, date: string, minute: number) {
  const own = intervalsOn(book, date).find((item) => minute >= item[0] && minute < item[1])
  if (!own) return ""
  let end = own[1]
  let when = date
  if (end === 1440) {
    const next = shiftDate(date, 1)
    const spill = intervalsOn(book, next).find((item) => item[0] === 0)
    if (spill) {
      end = spill[1]
      when = next
    }
  }
  return clockLabel(when, end, date)
}

function nextOpen(book: HourBook, date: string, minute: number) {
  for (let step = 0; step < 8; step += 1) {
    const when = shiftDate(date, step)
    const hit = intervalsOn(book, when).find((item) => (step === 0 ? item[0] > minute : true))
    if (hit) return clockLabel(when, hit[0], date)
  }
  return ""
}

export function statusAt(book: HourBook, now: number, known = true): Presence {
  const part = istanbulParts(now)
  const todayPlan = planOn(book, part.date)
  const base: Presence = {
    state: "unknown",
    source: "unknown",
    labelKey: "hours.unknown",
    detailKey: "",
    time: "",
    note: todayPlan.note,
    today: part.weekday,
    until: "",
  }
  if (!known) return base
  const manual = book.manual && Date.parse(book.manual.until) > now ? book.manual : null
  if (todayPlan.special && todayPlan.closed) {
    const time = nextOpen(book, part.date, part.minutes)
    return { ...base, state: "closed", source: "special", labelKey: "hours.closed", detailKey: time ? "hours.nextOpen" : "", time, note: todayPlan.note || "Özel kapanış" }
  }
  if (manual?.mode === "closed") {
    return {
      ...base,
      state: "closed",
      source: "manual",
      labelKey: "hours.manualClosed",
      until: manual.until,
      note: todayPlan.special ? todayPlan.note : "",
    }
  }
  if (manual?.mode === "open") {
    return {
      ...base,
      state: "open",
      source: "manual",
      labelKey: "hours.manualOpen",
      until: manual.until,
      note: todayPlan.special ? todayPlan.note : "",
    }
  }
  const open = intervalsOn(book, part.date).some((item) => part.minutes >= item[0] && part.minutes < item[1])
  const time = open ? nextClose(book, part.date, part.minutes) : nextOpen(book, part.date, part.minutes)
  return {
    ...base,
    state: open ? "open" : "closed",
    source: todayPlan.special ? "special" : "week",
    labelKey: open ? "hours.open" : "hours.closed",
    detailKey: time ? (open ? "hours.nextClose" : "hours.nextOpen") : "",
    time,
  }
}

export function applyManual(book: HourBook, action: ManualAction, now: number, by = ""): HourBook | null {
  if (action.mode === "auto") return { ...book, manual: null }
  if (action.mode !== "open" && action.mode !== "closed") return null
  const part = istanbulParts(now)
  const today = planOn(book, part.date)
  if (action.mode === "open" && today.special && today.closed) return null
  let until = 0
  if (action.span === "2h") until = now + 2 * 60 * 60 * 1000
  else if (action.span === "today") until = endOfIstanbulDay(now)
  else if (action.span === "until" && action.until && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(action.until)) {
    const [date, time] = action.until.split("T")
    if (!validDate(date)) return null
    until = istanbulTime(date, time, now)
  }
  if (until <= now + 60 * 1000 || until > now + 14 * 24 * 60 * 60 * 1000) return null
  const actor = by.replace(/[^\w.-]/g, "").slice(0, 40)
  const manual: ManualMark = {
    mode: action.mode,
    until: new Date(until).toISOString(),
    at: new Date(now).toISOString(),
    ...(actor ? { by: actor } : {}),
  }
  return { ...book, manual }
}

export function liveBusiness<T extends Business>(business: T, now: number): T {
  if (!now) return business
  const known = hoursKnown(business.hours, business.hourBook)
  const book = business.hourBook ?? bookFromHours(business.hours)
  const presence = statusAt(book, now, known)
  return {
    ...business,
    openNow: presence.state === "open",
    hours: business.hourBook ? hoursFromBook(book) : business.hours,
    presence,
  }
}

export function liveList<T extends Business>(businesses: T[], now: number) {
  return businesses.map((business) => liveBusiness(business, now))
}
