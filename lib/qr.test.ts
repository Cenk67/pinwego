import assert from "node:assert/strict"
import { businesses } from "./catalog.ts"
import { seedCampaigns } from "./campaigns.ts"
import {
  allowQrBurst,
  allowQrEvent,
  buildVCard,
  businessCode,
  campaignCode,
  qrToken,
  resolveQr,
  resolveQrBook,
  summarizeQr,
  topQrBusinesses,
  vcardFilename,
  vcardText,
  seedQrEvents,
} from "./qr.ts"

const yok = businessCode("yokustepe-kahvalti-waffle", "business")
const card = businessCode("yokustepe-kahvalti-waffle", "vcard")
assert.equal(yok.length, 10)
assert.notEqual(yok, card)
assert.equal(qrToken("business:yokustepe-kahvalti-waffle"), yok)
assert.equal(yok.includes("yokustepe"), false)
assert.equal(/^\d+$/.test(yok), false)

const seen = new Set<string>()
for (const business of businesses) {
  for (const kind of ["business", "vcard"] as const) {
    const code = businessCode(business.id, kind)
    assert.equal(seen.has(code), false, code)
    seen.add(code)
    const hit = resolveQr(code)
    assert.equal(hit?.businessId, business.id)
    assert.equal(hit?.kind, kind)
  }
}
for (const campaign of seedCampaigns) {
  const hit = resolveQr(campaignCode(campaign.id))
  assert.equal(hit?.kind, "campaign")
  assert.equal(hit?.campaignId, campaign.id)
  assert.equal(hit?.businessId, campaign.businessId)
}
assert.equal(resolveQr("nope"), null)
assert.equal(resolveQr("../admin12"), null)
assert.equal(resolveQr(yok.toUpperCase())?.businessId, "yokustepe-kahvalti-waffle")

const freshId = "online-sigortalar-yonetici"
const fresh = businessCode(freshId, "business")
assert.equal(resolveQr(fresh), null)
assert.equal(resolveQrBook(fresh, [{ id: freshId }])?.kind, "business")
assert.equal(resolveQrBook(fresh, [{ id: freshId }])?.businessId, freshId)
assert.equal(resolveQrBook(businessCode(freshId, "vcard"), [{ id: freshId }])?.kind, "vcard")
assert.equal(resolveQrBook(fresh, [{ id: freshId, hidden: true }]), null)
assert.equal(resolveQrBook(yok, [])?.businessId, "yokustepe-kahvalti-waffle")

const hostile = businesses[0]
const cardBody = buildVCard({
  ...hostile,
  name: "Satır\nBir;İki,Üç",
  address: "No: 1\r\nKat",
  phone: "+90 372 502 3687",
  website: "https://ornek.example",
})
assert.match(cardBody, /BEGIN:VCARD\r\nVERSION:3\.0/)
assert.match(cardBody, /FN:Satır\\nBir\\;İki\\,Üç/)
assert.match(cardBody, /END:VCARD\r\n$/)
assert.equal(cardBody.includes("\nBir"), false)
assert.match(cardBody, new RegExp(`URL:https://pinwego.com/isletme/${hostile.slug}`))
assert.equal(vcardText("a;b,c\\d\n"), "a\\;b\\,c\\\\d\\n")
assert.equal(vcardFilename("Yokuş Tepe!"), "pinwego-yokutepe.vcf")
assert.equal(vcardFilename("../../etc"), "pinwego-etc.vcf")

assert.equal(allowQrEvent(0, 1999), false)
assert.equal(allowQrEvent(0, 2000), true)
const burst = allowQrBurst([0, 1000], 2000, 2, 60_000)
assert.equal(burst.ok, false)
assert.equal(allowQrBurst([0], 61_000, 1, 60_000).ok, true)

const summary = summarizeQr(seedQrEvents, new Date("2026-10-12T12:00:00.000Z"))
assert.ok(summary.scan >= 4)
assert.ok(summary.week >= 3)
assert.ok(summary.month >= summary.week)
assert.equal(summary.vcard > 0, true)
const top = topQrBusinesses(seedQrEvents)
assert.equal(top[0]?.[0], "yokustepe-kahvalti-waffle")
