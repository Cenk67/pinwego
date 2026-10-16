import assert from "node:assert/strict"
import {
  NEED_QUERY_CAP,
  emptyNeedStats,
  needReport,
  normalizeNeedQuery,
  noteNeedEvent,
  parseNeedStats,
  readNeedEvent,
} from "./need-analytics.ts"
import { reportDay, shiftDay } from "./stats.ts"

// Normalization strips identifiers and caps length.
assert.equal(normalizeNeedQuery("Kadıköy'de Tesisatçı 0532 123 45 67"), "kadikoy de tesisatci")
assert.equal(normalizeNeedQuery("2 kisilik 3 gun otel"), "2 kisilik 3 gun otel")
assert.equal(normalizeNeedQuery("ali@example.com kombi"), "kombi")
assert.equal(normalizeNeedQuery("a".repeat(100)).length, 60)
assert.equal(normalizeNeedQuery("  "), "")

// Body validation.
assert.equal(readNeedEvent(null), null)
assert.equal(readNeedEvent({ kind: "bilinmeyen", q: "kombi" }), null)
assert.equal(readNeedEvent({ kind: "search" }), null)
const search = readNeedEvent({ kind: "search", q: "Kışın evim sıcak olmuyor", category: "enerji", city: "İzmir", count: 1, voice: true, stage: "direct", intent: "isletme" })
assert.ok(search)
assert.equal(search.q, "kisin evim sicak olmuyor")
assert.equal(search.category, "enerji")
assert.equal(search.city, "İzmir")
assert.equal(search.count, 1)
assert.equal(search.voice, true)
assert.equal(readNeedEvent({ kind: "search", q: "x", count: 99999999 })?.count, 10_000)
assert.equal(readNeedEvent({ kind: "search", q: "x", stage: "yanlis" })?.stage, undefined)
assert.equal(readNeedEvent({ kind: "external", q: "x", target: "Video" })?.target, "video")

// Counters.
const now = Date.UTC(2026, 9, 16, 9, 0, 0)
const today = reportDay(now)
let state = emptyNeedStats()
state = noteNeedEvent(state, { kind: "search", q: "kombi", category: "enerji", count: 1, stage: "direct" }, now)
state = noteNeedEvent(state, { kind: "search", q: "kombi", category: "enerji", count: 1, voice: true }, now)
state = noteNeedEvent(state, { kind: "search", q: "uzay gemisi tamiri", category: "", count: 0, stage: "zero" }, now)
state = noteNeedEvent(state, { kind: "search", q: "kombi nasil secilir", category: "enerji", count: 1, intent: "bilgi" }, now)
state = noteNeedEvent(state, { kind: "external", q: "uzay gemisi tamiri", target: "web" }, now)
state = noteNeedEvent(state, { kind: "external", q: "uzay gemisi tamiri", target: "video" }, now)
state = noteNeedEvent(state, { kind: "external", q: "uzay gemisi tamiri", target: "bilinmeyen" }, now)
state = noteNeedEvent(state, { kind: "guide", q: "kombi nasil secilir", target: "edit-kombi" }, now)
state = noteNeedEvent(state, { kind: "contact", q: "kombi", category: "enerji", target: "telefon" }, now)
state = noteNeedEvent(state, { kind: "feedback", q: "kombi", target: "up" }, now)
state = noteNeedEvent(state, { kind: "feedback", q: "uzay gemisi tamiri", target: "down" }, now)
state = noteNeedEvent(state, { kind: "alternative", q: "uzay gemisi tamiri", target: "usta" }, now)
state = noteNeedEvent(state, { kind: "register", q: "", target: "" }, now)

const day = state.days[today]
assert.equal(day.searches, 4)
assert.equal(day.zero, 1)
assert.equal(day.matched, 3)
assert.equal(day.voice, 1)
assert.equal(day.info, 1)
assert.equal(day.web, 2, "unknown external kinds count as web")
assert.equal(day.video, 1)
assert.equal(day.guides, 1)
assert.equal(day.contacts, 1)
assert.equal(day.up, 1)
assert.equal(day.down, 1)
assert.equal(day.alternatives, 1)
assert.equal(day.register, 1)
assert.equal(state.queries.kombi.count, 2)
assert.equal(state.queries.kombi.contacts, 1)
assert.equal(state.queries["uzay gemisi tamiri"].zero, 1)
assert.equal(state.queries["uzay gemisi tamiri"].external, 3)
assert.equal(state.categories.enerji.searches, 3)
assert.equal(state.categories.enerji.contacts, 1)
assert.equal(state.categories[""], undefined, "empty category is not a row")

// Immutability: the previous state is untouched.
const before = emptyNeedStats()
const after = noteNeedEvent(before, { kind: "search", q: "kombi", count: 1 }, now)
assert.equal(Object.keys(before.days).length, 0)
assert.equal(Object.keys(after.days).length, 1)

// Report and rates.
const report = needReport(state, shiftDay(today, -6), today)
assert.ok(report)
assert.equal(report.days, 7)
assert.equal(report.totals.searches, 4)
assert.equal(report.rates.match, 75)
assert.equal(report.rates.zero, 25)
assert.equal(report.rates.external, 75)
assert.equal(report.rates.contact, 25)
assert.equal(report.rates.satisfaction, 50)
assert.equal(report.topQueries[0].q, "kombi")
assert.deepEqual(report.zeroQueries.map((row) => row.q), ["uzay gemisi tamiri"])
assert.equal(report.topCategories[0].id, "enerji")
assert.equal(report.external.web, 2)
assert.equal(report.series.length, 7)
assert.equal(report.series.at(-1)?.searches, 4)
assert.equal(needReport(state, today, shiftDay(today, -1)), null)
assert.equal(needReport(emptyNeedStats(), today, today)?.rates.match, null)

// Round trip through JSON and tolerance for junk.
const parsed = parseNeedStats(JSON.stringify(state))
assert.ok(parsed)
assert.deepEqual(parsed, state)
assert.equal(parseNeedStats("{"), null)
assert.equal(parseNeedStats(JSON.stringify({ version: 2 })), null)
assert.deepEqual(parseNeedStats(null), emptyNeedStats())
const junk = parseNeedStats(JSON.stringify({ version: 1, days: { "bad-day": {}, "2026-10-01": { searches: -5, zero: "x" } }, queries: { a: { q: "", count: 1 }, b: { q: "kombi", count: 3.7 } }, categories: { "": {}, enerji: { searches: 2 } } }))
assert.ok(junk)
assert.deepEqual(Object.keys(junk.days), ["2026-10-01"])
assert.equal(junk.days["2026-10-01"].searches, 0)
assert.deepEqual(Object.keys(junk.queries), ["kombi"])
assert.equal(junk.queries.kombi.count, 3)
assert.deepEqual(Object.keys(junk.categories), ["enerji"])

// The query table stays bounded; the rarest rows leave first.
let crowded = emptyNeedStats()
for (let index = 0; index < NEED_QUERY_CAP + 25; index += 1) {
  crowded = noteNeedEvent(crowded, { kind: "search", q: `ihtiyac ${index}`, count: 1 }, now)
}
crowded = noteNeedEvent(crowded, { kind: "search", q: "kombi", count: 1 }, now)
crowded = noteNeedEvent(crowded, { kind: "search", q: "kombi", count: 1 }, now)
assert.ok(Object.keys(crowded.queries).length <= NEED_QUERY_CAP)
assert.equal(crowded.queries.kombi.count, 2)

console.log("ihtiyaç analitiği testleri geçti")
