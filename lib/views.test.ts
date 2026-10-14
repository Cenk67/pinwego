import assert from "node:assert/strict"
import { registerInStore } from "./account-record"
import { accountStore } from "./account-kv"
import { loginFlow } from "./account-flow"
import { openAdminSession } from "./admin-gate"
import { ilanPostFlow } from "./listings-flow"
import { businessCode } from "./qr"
import { gorunumGetFlow, gorunumPostFlow } from "./views-flow"
import { viewBookKey, viewIndexKey } from "./views"

const holder = globalThis as typeof globalThis & { __pinwegoAccounts?: Map<string, unknown> }
holder.__pinwegoAccounts = new Map()
const store = await accountStore()
assert.ok(store)

const businessBody = {
  role: "isletme",
  email: "isletme@pinwego.test",
  password: "sifre1234",
  name: "Ada Isletme",
  phone: "05551234567",
  business: { owner: "Ada Yilmaz", taxId: "0100000007", taxOffice: "Merkez", city: "Zonguldak", address: "Uzun cadde 12" },
}
const customerBody = {
  role: "musteri",
  email: "musteri@pinwego.test",
  password: "sifre1234",
  name: "Ada Musteri",
  phone: "05551234567",
  customer: { nationalId: "10000000146", birthDate: "1990-05-05" },
}
assert.equal((await registerInStore(store, businessBody)).ok, true)
assert.equal((await registerInStore(store, customerBody)).ok, true)

function call(path: string, body?: unknown, extra: Record<string, string> = {}) {
  const headers = new Headers({
    origin: "http://127.0.0.1:43123",
    "content-type": "application/json",
    "user-agent": "Mozilla/5.0",
    "cf-connecting-ip": extra.ip || "203.0.113.10",
  })
  if (extra.cookie) headers.set("cookie", extra.cookie)
  if (extra["user-agent"]) headers.set("user-agent", extra["user-agent"])
  if (extra["sec-purpose"]) headers.set("sec-purpose", extra["sec-purpose"])
  return new Request(`http://127.0.0.1:43123${path}`, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

async function sign(email: string, password: string) {
  const response = await loginFlow(call("/api/giris", { email, password }, { ip: "203.0.113.8" }))
  const cookie = (response.headers.get("set-cookie") ?? "").split(";")[0] ?? ""
  return cookie
}

const ownerCookie = await sign(businessBody.email, businessBody.password)
const customerCookie = await sign(customerBody.email, customerBody.password)
const adminToken = await openAdminSession(store)
const adminCookie = `pinwego_admin=${encodeURIComponent(adminToken)}`

const morning = Date.UTC(2026, 9, 14, 7, 0)
const later = morning + 31 * 60 * 1000
const nextDay = Date.UTC(2026, 9, 15, 7, 0)
const code = businessCode("balikci-mehmet", "business")

const first = await gorunumPostFlow(call("/api/gorunum", { slug: "balikci-mehmet", search: `?kart=${code}`, total: 99999, views: 40 }, { ip: "203.0.113.21" }), morning)
const firstBody = (await first.json()) as { ok?: boolean; counted?: boolean; total?: number; today?: number; sources?: unknown }
assert.equal(first.status, 200)
assert.equal(firstBody.ok, true)
assert.equal(firstBody.counted, true)
assert.equal(firstBody.total, 1)
assert.equal(firstBody.today, 1)
assert.equal(firstBody.sources, undefined)
const viewCookie = (first.headers.get("set-cookie") ?? "").split(";")[0] ?? ""
assert.equal(viewCookie.startsWith("pinwego_gorunum="), true)
assert.equal((first.headers.get("set-cookie") ?? "").includes("HttpOnly"), true)

const reload = await gorunumPostFlow(call("/api/gorunum", { slug: "balikci-mehmet", total: 99999 }, { ip: "203.0.113.21", cookie: viewCookie }), morning + 10 * 60 * 1000)
const reloadBody = (await reload.json()) as { counted?: boolean; total?: number }
assert.equal(reloadBody.counted, false)
assert.equal(reloadBody.total, 1)

const again = await gorunumPostFlow(call("/api/gorunum", { slug: "balikci-mehmet" }, { ip: "203.0.113.21", cookie: viewCookie }), later)
assert.equal(((await again.json()) as { counted?: boolean; total?: number }).total, 2)

const tomorrow = await gorunumPostFlow(call("/api/gorunum", { slug: "balikci-mehmet" }, { ip: "203.0.113.21", cookie: viewCookie }), nextDay)
assert.equal(((await tomorrow.json()) as { total?: number; last30?: number }).total, 3)

const search = await gorunumPostFlow(call("/api/gorunum", { slug: "balikci-mehmet", from: "http://127.0.0.1:43123/ara?q=balik" }, { ip: "203.0.113.22" }), nextDay)
assert.equal(((await search.json()) as { total?: number }).total, 4)

const outside = await gorunumPostFlow(call("/api/gorunum", { slug: "balikci-mehmet", from: "https://example.com/post" }, { ip: "203.0.113.23" }), nextDay)
assert.equal(((await outside.json()) as { total?: number }).total, 5)

const shared = await gorunumPostFlow(call("/api/gorunum", { op: "paylas", slug: "balikci-mehmet", total: 10 }, { ip: "203.0.113.21", cookie: viewCookie }), nextDay)
const sharedBody = (await shared.json()) as { counted?: boolean; shares?: number; total?: number }
assert.equal(sharedBody.counted, true)
assert.equal(sharedBody.shares, 1)
assert.equal(sharedBody.total, 5)
const sharedAgain = await gorunumPostFlow(call("/api/gorunum", { op: "paylas", slug: "balikci-mehmet" }, { ip: "203.0.113.21", cookie: viewCookie }), nextDay + 1000)
assert.equal(((await sharedAgain.json()) as { shares?: number; counted?: boolean }).counted, false)

const bot = await gorunumPostFlow(call("/api/gorunum", { slug: "balikci-mehmet" }, { ip: "203.0.113.30", "user-agent": "curl/8.0" }), nextDay)
const botBody = (await bot.json()) as { counted?: boolean; total?: number }
assert.equal(botBody.counted, false)
assert.equal(botBody.total, 5)
const botAgain = await gorunumPostFlow(call("/api/gorunum", { slug: "balikci-mehmet" }, { ip: "203.0.113.31", "user-agent": "WhatsApp/2.23.1" }), nextDay)
assert.equal(((await botAgain.json()) as { counted?: boolean }).counted, false)
const inApp = await gorunumPostFlow(call("/api/gorunum", { slug: "balikci-mehmet", search: "?kaynak=paylas" }, { ip: "203.0.113.32", "user-agent": "Mozilla/5.0 (iPhone) WhatsApp/23.0" }), nextDay)
const inAppBody = (await inApp.json()) as { counted?: boolean; total?: number }
assert.equal(inAppBody.counted, true)
assert.equal(inAppBody.total, 6)

const preview = await gorunumPostFlow(call("/api/gorunum", { slug: "balikci-mehmet" }, { ip: "203.0.113.33", "sec-purpose": "prefetch" }), nextDay)
assert.equal(((await preview.json()) as { counted?: boolean }).counted, false)

const anonReport = await gorunumGetFlow(call("/api/gorunum?slug=balikci-mehmet&rapor=1"), nextDay)
assert.equal(anonReport.status, 401)
const customerReport = await gorunumGetFlow(call("/api/gorunum?slug=balikci-mehmet&rapor=1", undefined, { cookie: customerCookie }), nextDay)
assert.equal(customerReport.status, 403)
const adminReport = await gorunumGetFlow(call("/api/gorunum?slug=balikci-mehmet&rapor=1&from=2026-10-14&to=2026-10-15", undefined, { cookie: adminCookie }), nextDay)
const adminBody = (await adminReport.json()) as { ok?: boolean; report?: { rangeViews: number; uniques: number | null; shares: number; sources: { id: string; count: number }[]; series: { day: string }[]; seen?: unknown } }
assert.equal(adminReport.status, 200)
assert.equal(adminBody.report?.rangeViews, 6)
assert.equal(adminBody.report?.shares, 1)
assert.equal(adminBody.report?.uniques, 4)
assert.equal(adminBody.report?.seen, undefined)
assert.equal(adminBody.report?.sources.find((item) => item.id === "qr")?.count, 1)
assert.equal(adminBody.report?.sources.find((item) => item.id === "arama")?.count, 1)
assert.equal(adminBody.report?.sources.find((item) => item.id === "dis")?.count, 1)
assert.equal(adminBody.report?.sources.find((item) => item.id === "paylas")?.count, 1)

const adminView = await gorunumPostFlow(call("/api/gorunum", { slug: "balikci-mehmet" }, { ip: "203.0.113.40", cookie: adminCookie }), nextDay)
const adminViewBody = (await adminView.json()) as { counted?: boolean; total?: number }
assert.equal(adminViewBody.counted, false)
assert.equal(adminViewBody.total, 6)

const board = await gorunumGetFlow(call("/api/gorunum?liste=1&from=2026-10-14&to=2026-10-15", undefined, { cookie: adminCookie }), nextDay)
const boardBody = (await board.json()) as { rows?: { slug: string; rangeViews: number }[] }
assert.equal(board.status, 200)
assert.equal(boardBody.rows?.[0]?.slug, "balikci-mehmet")
assert.equal(boardBody.rows?.[0]?.rangeViews, 6)
const guestBoard = await gorunumGetFlow(call("/api/gorunum?liste=1", undefined, { cookie: ownerCookie }), nextDay)
assert.equal(guestBoard.status, 403)

const draft = {
  op: "create",
  name: "Yeşil Çınar",
  category: "yeme",
  subcategory: "Yeme-İçme",
  city: "Zonguldak",
  district: "Kozlu",
  address: "Kozlu, Zonguldak",
  lat: 41.45,
  lng: 31.74,
  phone: "0372 000 00 00",
  summary: "Kozlu'da ev yemeği ve kahvaltı servisi.",
  photo: "data:image/png;base64,aaaa",
}
const created = await ilanPostFlow(call("/api/ilan", draft, { cookie: ownerCookie, ip: "203.0.113.50" }), morning)
const createdBody = (await created.json()) as { listing?: { slug: string; id: string } }
const slug = createdBody.listing?.slug ?? ""
assert.equal(slug.length > 2, true)
const guestOpen = await gorunumPostFlow(call("/api/gorunum", { slug }, { ip: "203.0.113.51" }), morning)
assert.equal(((await guestOpen.json()) as { counted?: boolean; total?: number }).total, 1)
const ownerOpen = await gorunumPostFlow(call("/api/gorunum", { slug }, { ip: "203.0.113.52", cookie: ownerCookie }), morning)
const ownerOpenBody = (await ownerOpen.json()) as { counted?: boolean; total?: number }
assert.equal(ownerOpenBody.counted, false)
assert.equal(ownerOpenBody.total, 1)
const ownerShare = await gorunumPostFlow(call("/api/gorunum", { op: "paylas", slug }, { ip: "203.0.113.52", cookie: ownerCookie }), morning)
const ownerShareBody = (await ownerShare.json()) as { counted?: boolean; shares?: number; total?: number }
assert.equal(ownerShareBody.counted, true)
assert.equal(ownerShareBody.total, 1)
const ownerReport = await gorunumGetFlow(call(`/api/gorunum?slug=${slug}&rapor=1`, undefined, { cookie: ownerCookie }), morning)
assert.equal(ownerReport.status, 200)
const otherReport = await gorunumGetFlow(call(`/api/gorunum?slug=${slug}&rapor=1`, undefined, { cookie: customerCookie }), morning)
assert.equal(otherReport.status, 403)

const hidden = await ilanPostFlow(call("/api/ilan", { op: "flags", id: slug, hidden: true }, { cookie: adminCookie, ip: "203.0.113.53" }), morning)
assert.equal(hidden.ok, true)
const hiddenView = await gorunumPostFlow(call("/api/gorunum", { slug }, { ip: "203.0.113.54" }), morning)
assert.equal(hiddenView.status, 404)

let blocked = 0
for (let index = 0; index < 9; index += 1) {
  const response = await gorunumPostFlow(call("/api/gorunum", { slug: "marmara-kahvesi" }, { ip: "203.0.113.70" }), morning)
  const body = (await response.json()) as { counted?: boolean }
  if (!body.counted) blocked += 1
}
assert.equal(blocked >= 1, true)

const raw = await store.get(viewBookKey("balikci-mehmet"))
assert.equal(typeof raw, "string")
await store.put(viewBookKey("balikci-mehmet"), "{")
const broken = await gorunumPostFlow(call("/api/gorunum", { slug: "balikci-mehmet" }, { ip: "203.0.113.60" }), nextDay)
assert.equal(broken.status, 500)
assert.equal(await store.get(viewBookKey("balikci-mehmet")), "{")
const indexBefore = await store.get(viewIndexKey)
await store.put(viewIndexKey, "{")
const brokenIndex = await gorunumPostFlow(call("/api/gorunum", { slug: "nisanta-dent" }, { ip: "203.0.113.61" }), nextDay)
assert.equal(brokenIndex.status, 500)
assert.equal(await store.get(viewIndexKey), "{")
assert.equal(indexBefore !== "{", true)
