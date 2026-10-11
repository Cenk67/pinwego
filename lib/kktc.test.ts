import assert from "node:assert/strict"
import { applyNorthernCyprus, isNorthernCyprus, KKTC_CODE, KKTC_NAME, kktcDistrict, kktcDistricts } from "./kktc"

assert.equal(kktcDistricts.length, 6)
assert.deepEqual(
  kktcDistricts.map((item) => item.name),
  ["Lefkoşa", "Girne", "Gazimağusa", "Güzelyurt", "İskele", "Lefke"],
)
const girne = kktcDistrict("Girne")
assert.ok(girne)
assert.ok(girne.towns.some((item) => item.name === "Lapta-Alsancak-Çamlıbel"))
assert.equal(kktcDistrict("Gazimağusa")?.towns.some((item) => item.name === "Tatlısu"), true)
assert.equal(isNorthernCyprus("Kuzey Kıbrıs", "cy"), true)
assert.equal(isNorthernCyprus("Kıbrıs", "cy"), false)

const placed = applyNorthernCyprus(
  {
    country: "Kuzey Kıbrıs",
    countryCode: "cy",
    region: "",
    province: "",
    district: "Girne Belediyesi",
    neighborhood: "",
  },
  {
    country: "Kuzey Kıbrıs",
    country_code: "cy",
    district: "Girne ilçesi",
    municipality: "Lapta-Alsancak-Çamlıbel Belediyesi",
    town: "Alsancak",
  },
)
assert.equal(placed.country, KKTC_NAME)
assert.equal(placed.countryCode, KKTC_CODE)
assert.equal(placed.region, "Kuzey Kıbrıs")
assert.equal(placed.province, "Girne")
assert.equal(placed.district, "Lapta-Alsancak-Çamlıbel")
assert.equal(placed.neighborhood, "Alsancak")

console.log("kuzey kıbrıs il ve belediyeleri geçti")
