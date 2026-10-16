import { businesses } from "./catalog"
import { fold } from "./format"
import { searchDirectory, defaultFilters, parseQuery } from "./match"
import assert from "node:assert/strict"

const cases: [string, string][] = [
  ["Kadıköy'de çocukla gidilecek akşam yemeği", "sofra-42"],
  ["Beşiktaş'ta bugün gelebilen boya ustası", "kumsal-boya"],
  ["Nişantaşı diş temizliği, uygun fiyat", "nisanta-dent"],
  ["Kaleiçi'nde deniz manzaralı butik otel", "han-konagi"],
  ["Çankaya'da ofis temizliği", "baskent-ofis-temizlik"],
  ["Kadıköy'de oto servis", "kadikoy-oto-servis"],
  ["Levent'te avukat", "levent-hukuk"],
  ["Moda'da kreş", "moda-kres"],
]

let failed = 0
for (const [query, expected] of cases) {
  const top = searchDirectory(businesses, query, { ...defaultFilters, sehir: "hepsi" }).slice(0, 3)
  const slugs = top.map((item) => `${item.business.slug} (${item.score.toFixed(1)})`).join(", ")
  const ok = top[0]?.business.slug === expected
  console.log(`${ok ? "OK" : "FAIL"} ${query}\n  -> ${slugs}`)
  if (!ok) failed += 1
}

assert.equal(failed, 0, `${failed} eşleştirme yanlış`)

const dentist = searchDirectory(businesses, "diş hekimi", { ...defaultFilters, sehir: "hepsi" })
assert.ok(dentist.length > 0)
assert.ok(dentist.every((item) => fold(item.business.subcategory).includes("dis")))
assert.equal(dentist.some((item) => item.business.subcategory === "Eczane"), false)

const service = searchDirectory(businesses, "Kadıköy oto servis", { ...defaultFilters, sehir: "hepsi" })
assert.ok(service.length > 0)
assert.ok(service.every((item) => item.business.category === "oto"))

const cleaning = searchDirectory(businesses, "Çankaya ofis temizliği", { ...defaultFilters, sehir: "hepsi" })
assert.equal(cleaning[0]?.business.slug, "baskent-ofis-temizlik")
assert.ok(cleaning.every((item) => item.business.category === "temizlik"))
assert.equal(parseQuery("Çankaya ofis temizliği", businesses).category, "temizlik")

const heat = parseQuery("Kışın evim sıcak olmuyor", businesses)
assert.equal(heat.category, "enerji")
const heatHits = searchDirectory(businesses, "Kışın evim sıcak olmuyor", { ...defaultFilters, sehir: "hepsi" })
assert.ok(heatHits.length > 0)
assert.ok(heatHits.every((item) => item.business.category === "enerji"))
assert.equal(heatHits[0]?.business.slug, "bornova-kombi")

assert.equal(parseQuery("sigrota ariyorum", businesses).category, "finans")
assert.equal(parseQuery("Evimin su tesisatı patladı", businesses).category, "usta")
assert.equal(parseQuery("Kadıköy'de çocukla gidilecek akşam yemeği", businesses).category, "yeme")

console.log("tüm örnek aramalar beklenen kaydı seçti")
