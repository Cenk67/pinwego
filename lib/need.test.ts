import assert from "node:assert/strict"
import {
  alternativeCategories,
  correctNeedDetailed,
  correctNeedText,
  editDistance,
  isFinancialNeed,
  matchNeed,
  needDetails,
  needHints,
  needIntent,
  relatedCategories,
} from "./need.ts"
import { seedSectors } from "./sectors.ts"

// Every hint and neighbour must point at a real sector id.
const sectorIds = new Set(seedSectors.map((item) => item.id))
for (const item of needHints) {
  for (const id of item.categories) assert.ok(sectorIds.has(id), `bilinmeyen sektör: ${id}`)
  assert.equal(item.category, item.categories[0])
  for (const phrase of item.phrases) assert.equal(phrase, phrase.toLowerCase(), `katlanmamış ifade: ${phrase}`)
}
for (const [id, list] of Object.entries(relatedCategories)) {
  assert.ok(sectorIds.has(id), `bilinmeyen komşu anahtarı: ${id}`)
  for (const next of list) assert.ok(sectorIds.has(next), `bilinmeyen komşu: ${next}`)
}

// Known typos and fuzzy repair.
assert.equal(correctNeedText("sigrota ariyorum"), "sigorta ariyorum")
assert.equal(correctNeedText("tesisart patladi"), "tesisat patladi")
assert.equal(correctNeedText("elektirikci lazim"), "elektrikci lazim")
assert.equal(correctNeedText("kuafr ariyorum"), "kuafor ariyorum")
assert.equal(editDistance("sigrota", "sigorta"), 1)
assert.equal(editDistance("kombi", "kombi"), 0)
assert.ok(editDistance("kombi", "sinema") > 2)

// Protected words and place names never change.
assert.equal(correctNeedText("kisin evim sicak olmuyor"), "kisin evim sicak olmuyor")
assert.equal(correctNeedText("kozlu eczane", ["kozlu"]), "kozlu eczane")
assert.equal(correctNeedText("bornova kombi", ["bornova", "izmir"]), "bornova kombi")

// Synonyms with suffix stripping.
const synonym = correctNeedDetailed("aracim icin sigorta")
assert.equal(synonym.text, "oto icin sigorta")
assert.deepEqual(synonym.changes, [{ from: "aracim", to: "oto", kind: "esanlam" }])
assert.equal(correctNeedText("muslukcu lazim"), "tesisatci lazim")
assert.equal(correctNeedText("ehliyet almak istiyorum"), "surucu kursu almak istiyorum")

// Need sentences from the brief.
assert.equal(matchNeed("kisin evim sicak olmuyor")?.category, "enerji")
assert.equal(matchNeed("kisin evim sicak olmuyor")?.focus, "kombi")
assert.equal(matchNeed("evimin su tesisati patladi")?.category, "usta")
assert.equal(matchNeed("isletmeme web sitesi yaptirmak istiyorum")?.category, "teknoloji")
assert.deepEqual(matchNeed("bu hafta sonu cocuklarla gidebilecegim bir yer")?.categories, ["eglence", "cocuk", "yeme"])
assert.equal(matchNeed("aracim icin kasko yaptirmak istiyorum")?.category, "finans")
assert.equal(matchNeed("bugun hava guzel"), null)

// Priority hints override sector phrases.
assert.equal(matchNeed("sigorta atti elektrik yok", true)?.category, "usta")
assert.equal(matchNeed("sigorta atti elektrik yok", true)?.focus, "elektrik")
assert.equal(matchNeed("kasko yaptir", true), null)
assert.equal(matchNeed("internet sitesi yaptir", true)?.category, "teknoloji")

// Longest phrase wins.
assert.equal(matchNeed("nobetci eczane lazim")?.category, "eczane")
assert.equal(matchNeed("cilingir lazim kapida kaldim")?.focus, "kilit")

// Information vs business intent.
assert.equal(needIntent("kombi nasil secilir"), "bilgi")
assert.equal(needIntent("kahvalti yeri secerken nelere dikkat"), "bilgi")
assert.equal(needIntent("kombi tamiri"), "isletme")
assert.equal(needIntent("kadikoy e nasil giderim"), "isletme")
assert.equal(needIntent("evimin su tesisati patladi"), "isletme")

// Missing-detail reading.
assert.deepEqual(needDetails("evimin su tesisati patladi"), { urgent: true, budget: null, timing: null })
assert.deepEqual(needDetails("aracim icin uygun sigorta"), { urgent: false, budget: "ekonomik", timing: null })
assert.deepEqual(needDetails("bu hafta sonu cocuklarla gidecek yer"), { urgent: false, budget: null, timing: "haftasonu" })
assert.deepEqual(needDetails("bu aksam luks yemek"), { urgent: false, budget: "luks", timing: "aksam" })

// Neighbouring categories.
assert.deepEqual(alternativeCategories(["usta"]), ["ev", "enerji", "cam", "cati"])
assert.deepEqual(alternativeCategories(["usta", "ev"], 3), ["enerji", "cam", "cati"])
assert.deepEqual(alternativeCategories(["bilinmeyen"]), [])

// Financial needs.
assert.equal(isFinancialNeed(["finans"], ["sigorta"]), true)
assert.equal(isFinancialNeed(["finans"], []), true)
assert.equal(isFinancialNeed(["usta"], ["tesisat"]), false)

console.log("ihtiyaç motoru testleri geçti")
