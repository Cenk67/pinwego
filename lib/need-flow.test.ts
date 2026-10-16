import assert from "node:assert/strict"
import { accountStore } from "./account-kv"
import { openAdminSession } from "./admin-gate"
import type { NeedReport } from "./need-analytics"
import { needEventFlow, needReportFlow } from "./need-flow"

const holder = globalThis as typeof globalThis & { __pinwegoAccounts?: Map<string, unknown> }
holder.__pinwegoAccounts = new Map()

const now = Date.parse("2026-10-16T09:00:00Z")

function call(path: string, body?: unknown, extra: Record<string, string> = {}) {
  return new Request(`http://127.0.0.1:43123${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      origin: "http://127.0.0.1:43123",
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0",
      "cf-connecting-ip": extra.ip ?? "203.0.113.10",
      ...(extra.cookie ? { cookie: extra.cookie } : {}),
      ...(extra.ua ? { "user-agent": extra.ua } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const store = await accountStore()
assert.ok(store)

// Events are accepted silently; the stored sentence is normalized and stripped of identifiers.
assert.equal((await needEventFlow(call("/api/ihtiyac", { kind: "search", q: "Kadıköy'de Tesisatçı 0532 123 45 67", category: "usta", city: "İstanbul", count: 3, stage: "direct" }), now)).status, 204)
assert.equal((await needEventFlow(call("/api/ihtiyac", { kind: "search", q: "uzay gemisi", count: 0, stage: "zero" }), now)).status, 204)
assert.equal((await needEventFlow(call("/api/ihtiyac", { kind: "external", q: "uzay gemisi", target: "video" }), now)).status, 204)
assert.equal((await needEventFlow(call("/api/ihtiyac", { kind: "contact", q: "kadikoy de tesisatci", category: "usta", target: "telefon" }), now)).status, 204)
const stored = await store.get("need:v1")
assert.ok(stored)
assert.equal(stored.includes("0532"), false)
assert.equal(stored.includes("kadikoy de tesisatci"), true)

// Junk bodies, bots and prefetches are ignored without an error status.
assert.equal((await needEventFlow(call("/api/ihtiyac", { kind: "bilinmeyen", q: "x" }), now)).status, 204)
assert.equal((await needEventFlow(call("/api/ihtiyac", { kind: "search", q: "bot aramasi", count: 0 }, { ua: "Googlebot/2.1" }), now)).status, 204)
assert.equal(((await store.get("need:v1")) ?? "").includes("bot aramasi"), false)

// Reading the report requires an admin session.
assert.equal((await needReportFlow(call("/api/ihtiyac"), now)).status, 401)
const token = await openAdminSession(store)
const cookie = `pinwego_admin=${encodeURIComponent(token)}`

// Admin sessions never count as searches.
assert.equal((await needEventFlow(call("/api/ihtiyac", { kind: "search", q: "yonetici denemesi", count: 1 }, { cookie }), now)).status, 204)
assert.equal(((await store.get("need:v1")) ?? "").includes("yonetici denemesi"), false)

const response = await needReportFlow(call("/api/ihtiyac", undefined, { cookie }), now)
assert.equal(response.status, 200)
const payload = (await response.json()) as { ok: boolean; today: string; report: NeedReport }
assert.equal(payload.ok, true)
assert.equal(payload.today, "2026-10-16")
assert.equal(payload.report.totals.searches, 2)
assert.equal(payload.report.totals.zero, 1)
assert.equal(payload.report.totals.video, 1)
assert.equal(payload.report.totals.contacts, 1)
assert.equal(payload.report.rates.match, 50)
assert.deepEqual(payload.report.zeroQueries.map((row) => row.q), ["uzay gemisi"])
assert.equal(payload.report.topCategories[0]?.id, "usta")

// Bad ranges are rejected; swapped ranges are tolerated.
assert.equal((await needReportFlow(call("/api/ihtiyac?from=dun&to=bugun", undefined, { cookie }), now)).status, 400)
const swapped = await needReportFlow(call("/api/ihtiyac?from=2026-10-16&to=2026-10-10", undefined, { cookie }), now)
assert.equal(swapped.status, 200)
assert.equal(((await swapped.json()) as { report: NeedReport }).report.days, 7)

// The per-IP limiter stops a flood without leaking an error to the page.
let accepted = 0
for (let index = 0; index < 120; index += 1) {
  const reply = await needEventFlow(call("/api/ihtiyac", { kind: "search", q: `sel ${index}`, count: 1 }, { ip: "198.51.100.7" }), now + index)
  if (reply.status === 204) accepted += 1
}
assert.equal(accepted, 120)
const flooded = (await needReportFlow(call("/api/ihtiyac", undefined, { cookie }), now)).json() as Promise<{ report: NeedReport }>
assert.equal((await flooded).report.totals.searches, 2 + 90, "at most 90 events per minute per address are stored")

console.log("ihtiyaç akışı testleri geçti")
