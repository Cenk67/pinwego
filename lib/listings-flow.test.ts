import assert from "node:assert/strict"
import { registerInStore } from "./account-record"
import { accountStore } from "./account-kv"
import { loginFlow } from "./account-flow"
import { openAdminSession } from "./admin-gate"
import { ilanGetFlow, ilanPostFlow } from "./listings-flow"
import { listingsKey } from "./listings"

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

function call(path: string, body?: unknown, cookie = "") {
  return new Request(`http://127.0.0.1:43123${path}`, {
    method: body ? "POST" : "GET",
    headers: { origin: "http://127.0.0.1:43123", "content-type": "application/json", cookie },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const signed = await loginFlow(call("/api/giris", { email: businessBody.email, password: businessBody.password }))
const signedBody = (await signed.json()) as { ok?: boolean; account?: { id: string } }
assert.equal(signedBody.ok, true)
const cookieHeader = signed.headers.get("set-cookie") ?? ""
assert.equal(cookieHeader.includes("pinwego_acct="), true)
assert.equal(cookieHeader.includes("HttpOnly"), true)
const cookie = cookieHeader.split(";")[0] ?? ""

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
  verified: true,
  premium: true,
  ownerAccountId: "baskasi",
  nationalId: "10000000146",
  taxId: "0100000007",
}

const anonymous = await ilanPostFlow(call("/api/ilan", draft))
assert.equal(anonymous.status, 401)
const customerLogin = await loginFlow(call("/api/giris", { email: customerBody.email, password: customerBody.password }))
const customerCookie = (customerLogin.headers.get("set-cookie") ?? "").split(";")[0] ?? ""
const customer = await ilanPostFlow(call("/api/ilan", draft, customerCookie))
assert.equal(customer.status, 403)

const created = await ilanPostFlow(call("/api/ilan", draft, cookie))
const createdBody = (await created.json()) as { ok?: boolean; listing?: { slug: string; verified: boolean; premium: boolean; photo: string; ownerAccountId?: string } }
assert.equal(createdBody.ok, true)
assert.equal(createdBody.listing?.verified, false)
assert.equal(createdBody.listing?.premium, false)
assert.equal(createdBody.listing?.photo, "/photos/office.jpg")
assert.equal(createdBody.listing?.ownerAccountId, signedBody.account?.id)
assert.equal(createdBody.listing?.slug.includes("yesil-cinar"), true)
const saved = await store.get(listingsKey)
assert.equal(saved?.includes("10000000146"), false)
assert.equal(saved?.includes("0100000007"), false)
assert.equal(saved?.includes("baskasi"), false)

const again = await ilanPostFlow(call("/api/ilan", { ...draft, summary: "Kozlu'da güncellenmiş ev yemeği servisi." }, cookie))
const againBody = (await again.json()) as { listing?: { slug: string; summary: string; verified: boolean } }
assert.equal(againBody.listing?.slug, createdBody.listing?.slug)
assert.equal(againBody.listing?.summary, "Kozlu'da güncellenmiş ev yemeği servisi.")
const book = JSON.parse((await store.get(listingsKey)) ?? "{}") as { listings: unknown[] }
assert.equal(book.listings.length, 1)

const flags = await ilanPostFlow(call("/api/ilan", { op: "flags", id: createdBody.listing?.slug, verified: true }, cookie))
assert.equal(flags.status, 403)

const token = await openAdminSession(store)
const adminCookie = `pinwego_admin=${encodeURIComponent(token)}`
const approved = await ilanPostFlow(call("/api/ilan", { op: "flags", id: createdBody.listing?.slug, verified: true, premium: true }, adminCookie))
const approvedBody = (await approved.json()) as { listing?: { verified: boolean; premium: boolean } }
assert.equal(approvedBody.listing?.verified, true)
assert.equal(approvedBody.listing?.premium, true)

const kept = await ilanPostFlow(call("/api/ilan", draft, cookie))
const keptBody = (await kept.json()) as { listing?: { verified: boolean; premium: boolean } }
assert.equal(keptBody.listing?.verified, true)
assert.equal(keptBody.listing?.premium, true)

await ilanPostFlow(call("/api/ilan", { op: "flags", id: createdBody.listing?.slug, hidden: true }, adminCookie))
const hiddenPublic = (await (await ilanGetFlow(call("/api/ilan"))).json()) as { listings: { slug: string }[] }
assert.equal(hiddenPublic.listings.some((item) => item.slug === createdBody.listing?.slug), false)
const hiddenAdmin = (await (await ilanGetFlow(call("/api/ilan", undefined, adminCookie))).json()) as { listings: { slug: string }[]; hiddenIds: string[] }
assert.equal(hiddenAdmin.listings.some((item) => item.slug === createdBody.listing?.slug), true)
assert.equal(hiddenAdmin.hiddenIds.includes(createdBody.listing?.slug ?? ""), true)

const before = await store.get(listingsKey)
await store.put(listingsKey, "{")
const broken = await ilanPostFlow(call("/api/ilan", draft, cookie))
assert.equal(broken.status, 500)
assert.equal(await store.get(listingsKey), "{")
await store.put(listingsKey, before ?? "")

const foreign = await ilanPostFlow(new Request("http://127.0.0.1:43123/api/ilan", {
  method: "POST",
  headers: { origin: "https://evil.example", "content-type": "application/json", cookie },
  body: JSON.stringify(draft),
}))
assert.equal(foreign.status, 400)

const sheet = [
  "ad;kategori;sehir;semt;telefon;ozet;one cikan",
  "Papatya Lokanta;Yeme-İçme;Zonguldak;Merkez;03720000011;Merkezde ev yemeği ve ızgara.;evet",
  "Kırık Satır;yokboyle;Zonguldak;Merkez;03720000012;Bu kategori yok ve satır atlanır.",
  "Mavi Oda;konaklama;Zonguldak;Kozlu;03720000013;Kozlu'da sakin bir konaklama.",
].join("\n")
const denied = await ilanPostFlow(call("/api/ilan", { op: "toplu", text: sheet }, cookie))
assert.equal(denied.status, 403)
const guest = await ilanPostFlow(call("/api/ilan", { op: "toplu", text: sheet }))
assert.equal(guest.status, 401)
const blocked = await ilanPostFlow(call("/api/ilan", { op: "toplu", text: sheet }, adminCookie))
assert.equal(blocked.status, 400)
const looked = await ilanPostFlow(call("/api/ilan", { op: "onizle", text: sheet }, adminCookie))
const lookedBody = (await looked.json()) as { ok?: boolean; counts?: { yeni: number; hata: number } }
assert.equal(lookedBody.ok, true)
assert.equal(lookedBody.counts?.yeni, 2)
assert.equal(lookedBody.counts?.hata, 1)
const imported = await ilanPostFlow(call("/api/ilan", { op: "toplu", text: sheet, confirm: true, publish: "yayinda" }, adminCookie))
const importedBody = (await imported.json()) as {
  ok?: boolean
  added?: number
  updated?: number
  actor?: string
  listings?: { name: string; premium: boolean; verified: boolean; lat: number }[]
}
assert.equal(importedBody.ok, true)
assert.equal(importedBody.added, 2)
assert.equal(importedBody.updated, 0)
assert.equal(importedBody.actor, "yonetici")
assert.equal(importedBody.listings?.find((item) => item.name === "Papatya Lokanta")?.premium, true)
assert.equal(importedBody.listings?.find((item) => item.name === "Papatya Lokanta")?.verified, true)
assert.equal(importedBody.listings?.find((item) => item.name === "Mavi Oda")?.lat, 41.453)
const afterImport = JSON.parse((await store.get(listingsKey)) ?? "{}") as { listings: { name: string }[] }
assert.equal(afterImport.listings.length, 3)
const againSheet = sheet.replace("Merkezde ev yemeği ve ızgara.", "Merkezde güncellenmiş ev yemeği servisi.")
const refreshed = await ilanPostFlow(call("/api/ilan", { op: "toplu", text: againSheet, confirm: true, publish: "yayinda" }, adminCookie))
const refreshedBody = (await refreshed.json()) as { added?: number; updated?: number }
assert.equal(refreshedBody.added, 0)
assert.equal(refreshedBody.updated, 0)
const afterRefresh = JSON.parse((await store.get(listingsKey)) ?? "{}") as { listings: { name: string; summary: string }[] }
assert.equal(afterRefresh.listings.length, 3)
assert.equal(afterRefresh.listings.some((item) => item.summary === "Merkezde ev yemeği ve ızgara."), true)
const revised = await ilanPostFlow(call("/api/ilan", { op: "toplu", text: againSheet, confirm: true, publish: "yayinda", updates: [2] }, adminCookie))
const revisedBody = (await revised.json()) as { updated?: number }
assert.equal(revisedBody.updated, 1)
const afterApproved = JSON.parse((await store.get(listingsKey)) ?? "{}") as { listings: { summary: string }[] }
assert.equal(afterApproved.listings.some((item) => item.summary === "Merkezde güncellenmiş ev yemeği servisi."), true)
