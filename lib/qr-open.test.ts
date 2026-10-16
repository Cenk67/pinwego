import assert from "node:assert/strict"
import { accountStore } from "./account-kv.ts"
import { listingsKey } from "./listings.ts"
import { businessCode } from "./qr.ts"
import { openQr } from "./qr-open.ts"

const holder = globalThis as typeof globalThis & { __pinwegoAccounts?: Map<string, { value: string }> }
holder.__pinwegoAccounts = new Map()
const store = await accountStore()
assert.ok(store)

const id = "yeni-isletme-kaydi"
await store.put(
  listingsKey,
  JSON.stringify({
    listings: [
      {
        id,
        slug: id,
        name: "Yeni Isletme",
        ownerAccountId: "yonetici",
        city: "Zonguldak",
        district: "Merkez",
        lat: 41.45,
        lng: 31.79,
        summary: "Yeni kayit ozeti burada.",
        phone: "05551234567",
      },
      {
        id: "gizli-kayit",
        slug: "gizli-kayit",
        name: "Gizli Kayit",
        ownerAccountId: "yonetici",
        city: "Zonguldak",
        lat: 41.45,
        lng: 31.79,
        hidden: true,
      },
    ],
  }),
)

const opened = await openQr(businessCode(id, "business"))
assert.equal(opened?.hit.kind, "business")
assert.equal(opened?.business.name, "Yeni Isletme")
assert.equal(opened?.business.slug, id)

const card = await openQr(businessCode(id, "vcard"))
assert.equal(card?.hit.kind, "vcard")
assert.equal(card?.business.id, id)

assert.equal(await openQr(businessCode("gizli-kayit", "business")), null)
assert.equal((await openQr(businessCode("balikci-mehmet", "business")))?.business.id, "balikci-mehmet")
assert.equal(await openQr("nope"), null)
