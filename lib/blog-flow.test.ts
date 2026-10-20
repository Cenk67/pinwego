import assert from "node:assert/strict"
import { registerInStore } from "./account-record"
import { accountStore } from "./account-kv"
import { loginFlow } from "./account-flow"
import { openAdminSession } from "./admin-gate"
import { emptyBlogState, type BlogState } from "./blog"
import { blogDeskPostFlow, blogStateGetFlow, blogStatePutFlow, readDeskBusinesses, type BlogIo } from "./blog-flow"
import { listingsKey } from "./listings"

const holder = globalThis as typeof globalThis & { __pinwegoAccounts?: Map<string, unknown> }
holder.__pinwegoAccounts = new Map()

const store = await accountStore()
assert.ok(store)
const now = Date.parse("2026-10-20T09:00:00Z")
let state: BlogState = emptyBlogState()
const io: BlogIo = {
  readState: async () => state,
  writeState: async (next) => {
    state = next
    return next
  },
  businesses: readDeskBusinesses,
  now,
}

const businessBody = {
  role: "isletme",
  email: "haber@pinwego.test",
  password: "sifre1234",
  name: "Ada Isletme",
  phone: "05551234567",
  business: { owner: "Ada Yilmaz", taxId: "0100000007", taxOffice: "Merkez", city: "Zonguldak", address: "Uzun cadde 12" },
}
const customerBody = {
  role: "musteri",
  email: "okur@pinwego.test",
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
    headers: {
      origin: "http://127.0.0.1:43123",
      "content-type": "application/json",
      cookie,
      "cf-connecting-ip": "203.0.113.40",
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const signed = await loginFlow(call("/api/giris", { email: businessBody.email, password: businessBody.password }))
const signedBody = (await signed.json()) as { ok?: boolean; account?: { id: string } }
assert.equal(signedBody.ok, true)
const cookie = (signed.headers.get("set-cookie") ?? "").split(";")[0] ?? ""
const ownerId = signedBody.account?.id ?? ""
await store.put(
  listingsKey,
  JSON.stringify({
    listings: [
      {
        id: "kayit-1",
        slug: "yesil-cinar",
        name: "Yeşil Çınar",
        ownerAccountId: ownerId,
        city: "Zonguldak",
        lat: 41.45,
        lng: 31.74,
      },
    ],
  }),
)

const post = {
  businessId: "kayit-1",
  title: "Yeni yaz menümüz açıldı",
  description: "Zonguldak Kozlu'da yeni yaz menüsü ve sabah rezervasyonu başladı.",
  body: "Yeşil Çınar'ın yaz mutfağı bu hafta açılıyor. Menüde peynir, zeytin ve günlük ekmek var. Cumartesi sabahı rezervasyon açılır.",
  image: "data:image/png;base64,aaaa",
  imageAlt: "Yaz kahvaltı tabağı",
  tags: "menü",
}

const anonymous = await blogDeskPostFlow(call("/api/blog/yazi", { op: "save", post }), io)
assert.equal(anonymous.status, 401)
const customerLogin = await loginFlow(call("/api/giris", { email: customerBody.email, password: customerBody.password }))
const customerCookie = (customerLogin.headers.get("set-cookie") ?? "").split(";")[0] ?? ""
const customer = await blogDeskPostFlow(call("/api/blog/yazi", { op: "save", post }, customerCookie), io)
assert.equal(customer.status, 403)

const saved = await blogDeskPostFlow(call("/api/blog/yazi", { op: "save", post }, cookie), io)
const savedBody = (await saved.json()) as { ok?: boolean; post?: { id: string; ownerAccountId?: string; published?: boolean } }
assert.equal(saved.status, 200)
assert.equal(savedBody.ok, true)
assert.equal(savedBody.post?.published, false)
assert.equal(savedBody.post?.ownerAccountId, ownerId)

const stolen = await blogDeskPostFlow(
  call("/api/blog/yazi", { op: "save", post: { ...post, id: savedBody.post?.id, businessId: "baskasi" } }, customerCookie),
  io,
)
assert.equal(stolen.status, 403)

const submitted = await blogDeskPostFlow(call("/api/blog/yazi", { op: "submit", id: savedBody.post?.id }, cookie), io)
assert.equal(submitted.status, 200)
const leaked = await blogStateGetFlow(call("/api/blog"), io)
const leakedBody = (await leaked.json()) as BlogState
assert.equal(leakedBody.customPosts.length, 0)
assert.equal(leakedBody.audit.length, 0)

const token = await openAdminSession(store)
const adminCookie = `pinwego_admin=${encodeURIComponent(token)}`
const approved = await blogDeskPostFlow(call("/api/blog/yazi", { op: "approve", id: savedBody.post?.id }, adminCookie), io)
assert.equal(approved.status, 200)
const visible = await blogStateGetFlow(call("/api/blog"), io)
const visibleBody = (await visible.json()) as BlogState
assert.equal(visibleBody.customPosts[0]?.title, post.title)
assert.equal(visibleBody.customPosts[0]?.ownerAccountId, undefined)
assert.equal(visibleBody.audit.length, 0)

const wiped = await blogStatePutFlow(call("/api/blog", { state: emptyBlogState() }, adminCookie), io)
assert.equal(wiped.status, 200)
const kept = (await wiped.json()) as { state: BlogState }
assert.equal(kept.state.customPosts.length, 1)
assert.equal(kept.state.customPosts[0]?.title, post.title)
