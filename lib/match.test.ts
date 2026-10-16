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

// The five need sentences from the brief resolve to a Pinwego listing.
const briefCases: [string, string][] = [
  ["Evimin su tesisatı patladı", "hizli-tesisat"],
  ["Aracım için uygun sigorta arıyorum", "levent-sigorta"],
  ["İşletmeme web sitesi yaptırmak istiyorum", "maslak-yazilim"],
  ["Kışın evim sıcak olmuyor", "bornova-kombi"],
]
for (const [query, expected] of briefCases) {
  const top = searchDirectory(businesses, query, { ...defaultFilters, sehir: "hepsi" })
  assert.equal(top[0]?.business.slug, expected, `${query} -> ${top[0]?.business.slug}`)
}
const weekend = parseQuery("Bu hafta sonu çocuklarla gidebileceğim bir yer arıyorum", businesses)
assert.deepEqual(weekend.categories, ["eglence", "cocuk", "yeme"])
assert.ok(weekend.tags.includes("aile"))
const weekendHits = searchDirectory(businesses, "Bu hafta sonu çocuklarla gidebileceğim bir yer arıyorum", { ...defaultFilters, sehir: "hepsi" })
assert.ok(weekendHits.length > 0)
assert.ok(weekendHits[0].business.tags.includes("aile"), "aile etiketi önde olmalı")

// Typo repair and synonyms reach the same listings; place names stay intact.
const typo = parseQuery("Kadıköy de tesisart", businesses)
assert.equal(typo.district, "Kadıköy")
assert.deepEqual(typo.changes.map((item) => `${item.from}>${item.to}`), ["tesisart>tesisat"])
assert.equal(searchDirectory(businesses, "elektirikçi lazım", { ...defaultFilters, sehir: "hepsi" })[0]?.business.slug, "volt-elektrik")
assert.equal(searchDirectory(businesses, "muslukçu", { ...defaultFilters, sehir: "hepsi" })[0]?.business.slug, "hizli-tesisat")
assert.equal(parseQuery("Kozlu eczane", businesses).district, "Kozlu")

// "Sigorta attı" is an electrical fault, not insurance.
assert.equal(parseQuery("sigorta attı elektrik yok", businesses).category, "usta")
assert.equal(searchDirectory(businesses, "sigorta attı elektrik yok", { ...defaultFilters, sehir: "hepsi" })[0]?.business.slug, "volt-elektrik")

// A sponsored listing never jumps ahead of an organic match in another trade.
const sponsorPool = businesses.map((item) => (item.category === "usta" ? { ...item, premium: false } : { ...item, premium: true }))
const sponsored = searchDirectory(sponsorPool, "Evimin su tesisatı patladı", { ...defaultFilters, sehir: "hepsi" })
assert.equal(sponsored[0]?.business.slug, "hizli-tesisat")
assert.ok(sponsored.every((item) => item.business.category === "usta"))

console.log("tüm örnek aramalar beklenen kaydı seçti")

// A sentence with no readable signal is a real zero result, not the whole catalog by rating.
assert.equal(searchDirectory(businesses, "lorem ipsum dolor sit", { ...defaultFilters, sehir: "hepsi" }).length, 0)
assert.equal(searchDirectory(businesses, "xqzv plorf", { ...defaultFilters, sehir: "hepsi" }).length, 0)
assert.equal(searchDirectory(businesses, "Hızlı Tesisat", { ...defaultFilters, sehir: "hepsi" })[0]?.business.slug, "hizli-tesisat")
assert.ok(searchDirectory(businesses, "", { ...defaultFilters, sehir: "hepsi" }).length > 100, "empty query still lists the catalog")
