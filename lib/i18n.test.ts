import assert from "node:assert/strict"
import { fold } from "./format"
import { localeIds } from "./i18n-ids"
import { localeDir, resolveLocale, searchSuggestions } from "./i18n"
import { messages } from "./messages"
import { defaultFilters, parseQuery, searchDirectory } from "./match"
import { businesses } from "./catalog"
import { seedSectors } from "./sectors"
import { sectorCopy } from "./sector-copy"

const keys = Object.keys(messages.tr)
for (const locale of localeIds) {
  for (const key of keys) {
    const value = messages[locale][key as keyof typeof messages.tr]
    assert.equal(typeof value, "string", `${locale} ${key}`)
    assert.ok(value && value.trim().length > 0, `${locale} ${key} boş`)
  }
  if (locale !== "tr") assert.equal(searchSuggestions[locale].length, 6)
}

assert.equal(resolveLocale(null, ["en-US", "tr"]), "en")
assert.equal(resolveLocale(null, ["zh-CN"]), "zh")
assert.equal(resolveLocale("ar", ["en"]), "ar")
assert.equal(resolveLocale(null, ["sv-SE"]), "tr")
assert.equal(localeDir("ar"), "rtl")
assert.equal(localeDir("en"), "ltr")

assert.equal(fold("Diş hekimi"), "dis hekimi")
assert.equal(fold("牙医"), "牙医")
assert.equal(fold("стоматолог"), "стоматолог")
assert.equal(fold("صيدلية"), "صيدلية")

for (const sector of seedSectors) {
  const copy = sectorCopy("en", sector)
  assert.ok(copy.label.length > 1, sector.id)
  assert.ok(copy.blurb.length > 1, sector.id)
}
assert.equal(sectorCopy("de", seedSectors[0]).label, "Essen & Trinken")
assert.equal(sectorCopy("tr", seedSectors[0]).label, seedSectors[0].label)

function only(query: string, check: (item: { business: { category: string; subcategory: string } }) => boolean) {
  const found = searchDirectory(businesses, query, { ...defaultFilters, sehir: "hepsi" })
  assert.ok(found.length > 0, query)
  assert.ok(found.every(check), `${query} -> ${found.map((item) => item.business.subcategory).join(", ")}`)
}

only("dentist", (item) => fold(item.business.subcategory).includes("dis"))
only("Zahnarzt", (item) => fold(item.business.subcategory).includes("dis"))
only("牙医", (item) => fold(item.business.subcategory).includes("dis"))
only("pharmacy", (item) => item.business.category === "eczane")
only("restaurant", (item) => item.business.category === "yeme")
only("lawyer", (item) => item.business.category === "hukuk")
only("plumber", (item) => fold(item.business.subcategory).includes("tesisat"))
only("diş hekimi", (item) => fold(item.business.subcategory).includes("dis"))
assert.equal(parseQuery("open now dentist", businesses).openNow, true)
assert.equal(parseQuery("dentist", businesses).category, "saglik")
