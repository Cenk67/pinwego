import assert from "node:assert/strict"
import { registerInStore } from "./account-record"
import { accountStore } from "./account-kv"
import { loginFlow } from "./account-flow"
import { openAdminSession } from "./admin-gate"
import {
  applyManual,
  bookFromHours,
  hoursFromBook,
  hoursKnown,
  istanbulParts,
  liveBusiness,
  statusAt,
  storedBook,
  WEEKDAYS,
} from "./hours"
import { ilanGetFlow, ilanPostFlow } from "./listings-flow"
import { listingsKey } from "./listings"
import type { Business, HourBook } from "./types"

const at = (day: number, hour: number, minute = 0) => Date.UTC(2026, 9, day, hour - 3, minute)
const wednesday = at(14, 10)
assert.equal(istanbulParts(wednesday).date, "2026-10-14")
assert.equal(istanbulParts(wednesday).weekday, 2)

function week(spec: Record<number, string>): HourBook {
  return bookFromHours(WEEKDAYS.map((day, index) => ({ day, hours: spec[index] ?? "Kapalı" })))
}

const shop = week({ 0: "09:00–18:00", 1: "09:00–18:00", 2: "09:00–18:00", 3: "09:00–18:00", 4: "09:00–18:00" })
const openMorning = statusAt(shop, wednesday)
assert.equal(openMorning.state, "open")
assert.equal(openMorning.labelKey, "hours.open")
assert.equal(openMorning.time, "18:00")
assert.equal(statusAt(shop, at(14, 9)).state, "open")
assert.equal(statusAt(shop, at(14, 18)).state, "closed")
assert.equal(statusAt(shop, at(14, 18)).time, "15.10 09:00")

const split = week({ 2: "09:00–12:00, 13:00–18:00" })
assert.equal(statusAt(split, at(14, 12, 30)).state, "closed")
assert.equal(statusAt(split, at(14, 12, 30)).time, "13:00")
assert.equal(statusAt(split, at(14, 13)).state, "open")
assert.equal(storedBook({ ...split, specials: [{ date: "2026-10-14", closed: false, ranges: [{ start: "09:00", end: "12:00" }, { start: "11:00", end: "13:00" }], note: "" }] }), null)

const night = week({ 2: "22:00–02:00" })
assert.equal(statusAt(night, at(14, 23)).state, "open")
assert.equal(statusAt(night, at(14, 23)).time, "15.10 02:00")
assert.equal(statusAt(night, at(14, 21)).state, "closed")
assert.equal(statusAt(night, Date.UTC(2026, 9, 14, 21, 30)).state, "open")
assert.equal(statusAt(night, Date.UTC(2026, 9, 15, 0, 0)).state, "closed")

const holiday = storedBook({
  ...night,
  specials: [{ date: "2026-10-15", closed: true, ranges: [], note: "Bayram" }],
})
assert.ok(holiday)
assert.equal(statusAt(holiday, Date.UTC(2026, 9, 14, 21, 30)).state, "closed")
assert.equal(statusAt(holiday, Date.UTC(2026, 9, 14, 21, 30)).source, "special")
assert.equal(statusAt(holiday, at(14, 23)).state, "open")

const forced = { ...shop, manual: { mode: "open" as const, until: new Date(at(14, 12)).toISOString(), at: new Date(wednesday).toISOString(), by: "gizli" } }
const closedToday = storedBook({ ...holiday, manual: forced.manual })
assert.ok(closedToday)
assert.equal(statusAt(closedToday, Date.UTC(2026, 9, 14, 21, 30)).state, "closed")
assert.equal(applyManual(holiday, { mode: "open", span: "2h" }, Date.UTC(2026, 9, 14, 21, 30), "kisi"), null)

const paused = applyManual(shop, { mode: "closed", span: "2h" }, wednesday, "kisi")
assert.ok(paused)
assert.equal(statusAt(paused, wednesday).labelKey, "hours.manualClosed")
assert.equal(statusAt(paused, at(14, 13)).state, "open")
assert.equal(statusAt(paused, at(14, 11)).state, "closed")

const custom = storedBook({
  week: shop.week,
  specials: [{ date: "2026-10-14", closed: false, ranges: [{ start: "10:00", end: "14:00" }], note: "Kısa gün" }],
  manual: null,
})
assert.ok(custom)
assert.equal(statusAt(custom, at(14, 11)).note, "Kısa gün")
const ownerClosed = applyManual(custom, { mode: "closed", span: "today" }, at(14, 11), "kisi")
assert.ok(ownerClosed)
assert.equal(statusAt(ownerClosed, at(14, 11)).labelKey, "hours.manualClosed")
assert.equal(applyManual(shop, { mode: "open", span: "until", until: "2026-10-14T09:00" }, wednesday), null)
assert.ok(applyManual(shop, { mode: "closed", span: "until", until: "2026-10-14T20:00" }, wednesday))

assert.equal(hoursKnown([]), false)
assert.equal(statusAt(bookFromHours([]), wednesday, false).labelKey, "hours.unknown")
assert.equal(statusAt(bookFromHours(WEEKDAYS.map((day) => ({ day, hours: "Kapalı" }))), wednesday).state, "closed")
assert.equal(storedBook({ week: shop.week, specials: [{ date: "2026-10-20", closed: true, ranges: [], note: "<b>tatil</b>" }], manual: null }), null)
assert.equal(hoursFromBook(split)[2].hours, "09:00–12:00, 13:00–18:00")
assert.equal(statusAt(bookFromHours([{ day: "Çarşamba", hours: "00:00–23:59" }]), at(14, 23, 50)).state, "open")

const sample = {
  id: "balikci-mehmet",
  slug: "balikci-mehmet",
  name: "Balıkçı Mehmet",
  category: "yeme",
  subcategory: "Balık",
  city: "İstanbul",
  district: "Karaköy",
  address: "Karaköy",
  lat: 41,
  lng: 29,
  phone: "0212",
  rating: 4,
  reviewCount: 1,
  priceLevel: 2,
  openNow: true,
  summary: "Balık",
  about: "Balık",
  services: [],
  amenities: [],
  tags: [],
  reviews: [],
  premium: false,
  verified: true,
  responseMinutes: 30,
  founded: 1998,
  photo: "/photos/seafood.jpg",
  photoPosition: "center",
  booking: "rezervasyon",
  hours: WEEKDAYS.map((day) => ({ day, hours: "12:00–23:30" })),
  facts: [],
  source: "katalog",
} satisfies Business
assert.equal(liveBusiness(sample, at(14, 21)).openNow, true)
assert.equal(liveBusiness(sample, at(14, 23, 40)).openNow, false)
assert.equal(liveBusiness(sample, 0).openNow, true)

const holder = globalThis as typeof globalThis & { __pinwegoAccounts?: Map<string, unknown> }
holder.__pinwegoAccounts = new Map()
const store = await accountStore()
assert.ok(store)
const ownerBody = {
  role: "isletme",
  email: "saat.sahip@pinwego.test",
  password: "sifre1234",
  name: "Saat Sahip",
  phone: "05551234567",
  business: { owner: "Saat Sahip", taxId: "0100000007", taxOffice: "Merkez", city: "Zonguldak", address: "Uzun cadde 12" },
}
const otherBody = { ...ownerBody, email: "saat.baska@pinwego.test", name: "Baska Sahip" }
const customerBody = {
  role: "musteri",
  email: "saat.musteri@pinwego.test",
  password: "sifre1234",
  name: "Saat Musteri",
  phone: "05551234567",
  customer: { nationalId: "10000000146", birthDate: "1990-05-05" },
}
assert.equal((await registerInStore(store, ownerBody)).ok, true)
assert.equal((await registerInStore(store, otherBody)).ok, true)
assert.equal((await registerInStore(store, customerBody)).ok, true)

function call(path: string, body?: unknown, cookie = "") {
  return new Request(`http://127.0.0.1:43123${path}`, {
    method: body ? "POST" : "GET",
    headers: { origin: "http://127.0.0.1:43123", "content-type": "application/json", cookie },
    body: body ? JSON.stringify(body) : undefined,
  })
}
async function cookieFor(email: string) {
  const signed = await loginFlow(call("/api/giris", { email, password: "sifre1234" }))
  return (signed.headers.get("set-cookie") ?? "").split(";")[0] ?? ""
}
const ownerCookie = await cookieFor(ownerBody.email)
const otherCookie = await cookieFor(otherBody.email)
const customerCookie = await cookieFor(customerBody.email)
const draft = {
  op: "create",
  name: "Saat Firini",
  category: "yeme",
  subcategory: "Firin",
  city: "Zonguldak",
  district: "Merkez",
  address: "Merkez, Zonguldak",
  lat: 41.45,
  lng: 31.75,
  phone: "0372 000 00 01",
  summary: "Merkezde sicak ekmek ve pogaca.",
}
const NOW = wednesday
const created = await ilanPostFlow(call("/api/ilan", draft, ownerCookie), NOW)
const createdBody = (await created.json()) as { ok?: boolean; listing?: { slug: string } }
assert.equal(createdBody.ok, true)
const slug = createdBody.listing?.slug ?? ""
const anonymous = await ilanPostFlow(call("/api/ilan", { op: "saat", id: slug, week: shop.week, specials: [] }), NOW)
assert.equal(anonymous.status, 401)
const customer = await ilanPostFlow(call("/api/ilan", { op: "durum", id: slug, mode: "closed", span: "2h" }, customerCookie), NOW)
assert.equal(customer.status, 403)
const foreign = await ilanPostFlow(call("/api/ilan", { op: "saat", id: slug, week: shop.week, specials: [] }, otherCookie), NOW)
assert.equal(foreign.status, 403)

const saved = await ilanPostFlow(call("/api/ilan", { op: "saat", id: slug, week: split.week, specials: [] }, ownerCookie), NOW)
const savedBody = (await saved.json()) as { ok?: boolean; listing?: { hours: { hours: string }[]; hourBook?: { manual?: { by?: string } }; hourLog?: unknown } }
assert.equal(saved.ok, true)
assert.equal(savedBody.listing?.hours[2].hours, "09:00–12:00, 13:00–18:00")
assert.equal(savedBody.listing?.hourLog, undefined)
assert.equal(savedBody.listing?.hourBook?.manual, null)

const marked = await ilanPostFlow(call("/api/ilan", { op: "durum", id: slug, mode: "closed", span: "2h" }, ownerCookie), NOW)
const markedBody = (await marked.json()) as { listing?: { hourBook?: { manual?: { mode?: string; by?: string } }; hourLog?: unknown } }
assert.equal(markedBody.listing?.hourBook?.manual?.mode, "closed")
assert.equal(markedBody.listing?.hourBook?.manual?.by, undefined)
assert.equal(markedBody.listing?.hourLog, undefined)
const kept = await ilanPostFlow(call("/api/ilan", { op: "saat", id: slug, week: shop.week, specials: [] }, ownerCookie), NOW)
const keptBody = (await kept.json()) as { listing?: { hourBook?: { manual?: { mode?: string } } } }
assert.equal(keptBody.listing?.hourBook?.manual?.mode, "closed")

const raw = JSON.parse((await store.get(listingsKey)) ?? "{}") as { listings: { hourBook: HourBook; hourLog: { by: string }[] }[] }
assert.equal(raw.listings[0].hourLog[0].by.length > 0, true)
assert.equal(statusAt(raw.listings[0].hourBook, at(14, 11)).labelKey, "hours.manualClosed")
assert.equal(statusAt(raw.listings[0].hourBook, at(14, 13)).state, "open")

const date = istanbulParts(NOW).date
const feast = await ilanPostFlow(call("/api/ilan", {
  op: "saat",
  id: slug,
  week: shop.week,
  specials: [{ date, closed: true, ranges: [], note: "Bayram" }],
}, ownerCookie), NOW)
assert.equal(feast.ok, true)
const denied = await ilanPostFlow(call("/api/ilan", { op: "durum", id: slug, mode: "open", span: "2h" }, ownerCookie), NOW)
assert.equal(denied.status, 400)
assert.equal(((await denied.json()) as { reason?: string }).reason, "tatil")

const token = await openAdminSession(store)
const adminCookie = `pinwego_admin=${encodeURIComponent(token)}`
const adminView = (await (await ilanGetFlow(call("/api/ilan", undefined, adminCookie))).json()) as { listings: { hourLog?: { action: string }[] }[] }
assert.equal(adminView.listings[0].hourLog?.[0].action, "program")
const publicView = (await (await ilanGetFlow(call("/api/ilan"))).json()) as { listings: { hourLog?: unknown; hourBook?: { manual?: { by?: string } } }[] }
assert.equal(publicView.listings[0].hourLog, undefined)
assert.equal(publicView.listings[0].hourBook?.manual?.by, undefined)

const before = await store.get(listingsKey)
await store.put(listingsKey, "{")
const broken = await ilanPostFlow(call("/api/ilan", { op: "saat", id: slug, week: shop.week, specials: [] }, ownerCookie), NOW)
assert.equal(broken.status, 500)
assert.equal(await store.get(listingsKey), "{")
await store.put(listingsKey, before ?? "")
