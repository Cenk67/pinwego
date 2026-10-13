import assert from "node:assert/strict"
import type { PublicAccount } from "./account-record"
import { accountStore } from "./account-kv"
import { openAdminSession } from "./admin-gate"
import { clearDevMail, readDevMail } from "./mailer"
import { emptySettings } from "./admin-notify"
import { analitikGetFlow, bildirimGetFlow, bildirimPostFlow, noteRegistered, notifyDigestSweep, readStats, visitFlow } from "./notify-flow"

const holder = globalThis as typeof globalThis & { __pinwegoAccounts?: Map<string, unknown> }
holder.__pinwegoAccounts = new Map()
clearDevMail()
process.env.ADMIN_LOGIN = "a@pinwego.test"
process.env.ADMIN_PASSWORD_SALT = "salt"
process.env.ADMIN_PASSWORD_HASH = "hash"
process.env.ADMIN_OTP_TO = "yonetici@pinwego.test"

const now = Date.parse("2026-10-13T05:00:00Z")
const account: PublicAccount = {
  id: "hesap-1",
  role: "musteri",
  email: "gizli@ornek.com",
  name: "Gizli Kisi",
  phone: "05550000000",
  createdAt: "2026-10-13T05:00:00.000Z",
  customer: { nationalId: "10000000146", birthDate: "1990-01-01" },
  emailVerified: false,
  credentialVersion: 1,
}

function call(path: string, body?: unknown, cookie = "") {
  return new Request(`http://127.0.0.1:43123${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      origin: "http://127.0.0.1:43123",
      "content-type": "application/json",
      cookie,
      "user-agent": "Mozilla/5.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const store = await accountStore()
assert.ok(store)
await noteRegistered(store, account, now, "http://127.0.0.1:43123")
await noteRegistered(store, account, now + 1000, "http://127.0.0.1:43123")
const saved = await store.get("notify:v1")
assert.equal(saved?.includes("gizli@ornek.com"), false)
assert.equal(saved?.includes("10000000146"), false)
assert.equal(saved?.includes("Gizli"), false)
const notices = readDevMail().filter((item) => item.purpose === "notice")
assert.equal(notices.length, 1)
assert.equal(notices[0]?.text.includes("gizli@ornek.com"), false)
assert.equal(notices[0]?.text.includes("hesap-1"), true)
const stats = await readStats(store)
assert.equal(stats?.customers, 1)
assert.equal(stats?.businesses, 0)

await store.put("notify:v1", "{")
await noteRegistered(store, { ...account, id: "hesap-2", role: "isletme" }, now, "http://127.0.0.1:43123")
assert.equal(await store.get("notify:v1"), "{")
const afterCorrupt = await readStats(store)
assert.equal(afterCorrupt?.businesses, 1)

holder.__pinwegoAccounts = new Map()
clearDevMail()
const fresh = await accountStore()
assert.ok(fresh)
const denied = await bildirimGetFlow(call("/api/bildirim"))
assert.equal(denied.status, 401)
const token = await openAdminSession(fresh)
const cookie = `pinwego_admin=${encodeURIComponent(token)}`
const opened = await bildirimGetFlow(call("/api/bildirim", undefined, cookie))
assert.equal(opened.status, 200)
const invalid = await bildirimPostFlow(call("/api/bildirim", { op: "settings.save", settings: { ...emptySettings(), recipients: ["yanlis"] } }, cookie), now)
const invalidBody = (await invalid.json()) as { ok?: boolean }
assert.equal(invalidBody.ok, false)
const guest = await analitikGetFlow(call("/api/analitik"))
assert.equal(guest.status, 401)

const monday = Date.parse("2026-10-12T05:00:00Z")
await bildirimPostFlow(call("/api/bildirim", { op: "settings.save", settings: { ...emptySettings(), gunluk: true, haftalik: true } }, cookie), monday)
await notifyDigestSweep(Date.parse("2026-10-12T12:00:00Z"))
assert.equal(readDevMail().filter((item) => item.purpose === "notice").length, 0)
await notifyDigestSweep(monday)
const digest = readDevMail().filter((item) => item.purpose === "notice")
assert.equal(digest.length, 2)
await notifyDigestSweep(monday)
assert.equal(readDevMail().filter((item) => item.purpose === "notice").length, 2)
assert.equal(digest.some((item) => item.text.includes("10000000146")), false)

function visit(path: string, cookieHeader = "", ua = "Mozilla/5.0") {
  return visitFlow(new Request("http://127.0.0.1:43123/api/olay", {
    method: "POST",
    headers: { origin: "http://127.0.0.1:43123", "content-type": "application/json", "user-agent": ua, cookie: cookieHeader },
    body: JSON.stringify({ path }),
  }), now)
}

const firstVisit = await visit("/ara")
const setCookie = firstVisit.headers.get("set-cookie") ?? ""
const visitCookie = setCookie.split(";")[0] ?? ""
await visit("/ara", visitCookie)
await visit("/kesif", visitCookie)
await visit("/ara", visitCookie, "curl/8.0")
const viewed = await readStats(fresh)
assert.equal(viewed?.days["2026-10-13"].views, 2)
assert.equal(viewed?.days["2026-10-13"].sessions, 1)
assert.equal(viewed?.customers, 0)

const report = await analitikGetFlow(call("/api/analitik?from=2026-10-13&to=2026-10-13", undefined, cookie), now)
const body = (await report.json()) as { report: { totals: { views: number }; lifetime: { customers: number }; approvals: { pending: number } } }
assert.equal(body.report.totals.views, 2)
assert.equal(body.report.lifetime.customers, 0)
assert.equal(body.report.approvals.pending, 0)

delete process.env.ADMIN_LOGIN
delete process.env.ADMIN_PASSWORD_SALT
delete process.env.ADMIN_PASSWORD_HASH
delete process.env.ADMIN_OTP_TO
console.log("bildirim kaydı, yetki ve özet tekilliği doğrulandı")
