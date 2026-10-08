import { businesses } from "./catalog"
import { searchDirectory, defaultFilters } from "./match"
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
console.log("tüm örnek aramalar beklenen kaydı seçti")
