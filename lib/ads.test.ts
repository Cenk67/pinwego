import assert from "node:assert/strict"
import { adHref, adImage, adsFor, parseAds, SEED_ADS } from "./ads"

assert.equal(adHref("/ara?q=sigorta"), "/ara?q=sigorta")
assert.equal(adHref("https://ornek.com/kampanya"), "https://ornek.com/kampanya")
assert.equal(adHref("javascript:alert(1)"), null)
assert.equal(adHref("//evil.example"), null)
assert.equal(adHref(""), null)
assert.equal(adImage("/photos/cafe.jpg"), "/photos/cafe.jpg")
assert.equal(adImage("javascript:alert(1)"), null)

const seeded = parseAds(undefined)
assert.equal(seeded.length, SEED_ADS.length)
assert.equal(
  adsFor(seeded, "anasayfa-ust").some((ad) => ad.id === "reklam-eski-kampanya"),
  false,
)
assert.equal(adsFor(seeded, "anasayfa-ust").some((ad) => ad.id === "reklam-marmara-sigorta"), true)
assert.equal(adsFor(seeded, "isletme-yan")[0]?.id, "reklam-sahil-odeme")
assert.equal(adsFor(seeded, "isletme-icerik")[0]?.advertiser, "Pınar Temizlik")

assert.equal(parseAds([]).length, 0)

const dirty = parseAds([
  { id: "bozuk" },
  { ...SEED_ADS[0], placements: ["anasayfa-ust", "bogus"] },
])
assert.equal(dirty.length, 1)
assert.deepEqual(dirty[0]?.placements, ["anasayfa-ust"])

const emptySlot = parseAds([{ ...SEED_ADS[1], placements: ["bogus"], active: true }])
assert.equal(emptySlot.length, 1)
assert.deepEqual(emptySlot[0]?.placements, [])
assert.equal(adsFor(emptySlot, "anasayfa-orta").length, 0)

console.log("reklam yardımcıları beklenen sonucu verdi")
