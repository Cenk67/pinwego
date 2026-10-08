import assert from "node:assert/strict"
import { businessArea, openAddress, placeReady } from "./listing-location"
import type { Place } from "./place"

const istanbul: Place = {
  label: "Karaköy, İstanbul",
  country: "Türkiye",
  countryCode: "tr",
  region: "Marmara Bölgesi",
  province: "İstanbul",
  district: "Beyoğlu",
  neighborhood: "Karaköy",
  lat: 41.023,
  lng: 28.975,
  nearMe: false,
}

assert.deepEqual(businessArea(istanbul), { city: "İstanbul", district: "Karaköy" })
assert.equal(openAddress("Kemankeş Cad. No: 18", istanbul), "Kemankeş Cad. No: 18, Karaköy, Beyoğlu, İstanbul, Türkiye")
assert.equal(openAddress("Kemankeş Cad. No: 18, Karaköy, İstanbul", istanbul), "Kemankeş Cad. No: 18, Karaköy, İstanbul, Beyoğlu, Türkiye")
assert.equal(
  openAddress("Uzun Mehmet Caddesi 10", {
    ...istanbul,
    province: "Zonguldak",
    district: "Mithatpaşa Mahallesi",
    neighborhood: "Mithatpaşa",
    region: "Karadeniz Bölgesi",
  }),
  "Uzun Mehmet Caddesi 10, Mithatpaşa Mahallesi, Zonguldak, Türkiye",
)
assert.equal(placeReady(istanbul), true)
assert.equal(placeReady({ ...istanbul, province: "", district: "", neighborhood: "", lat: 0, lng: 0 }), false)
