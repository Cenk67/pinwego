import assert from "node:assert/strict"
import { businesses } from "./catalog.ts"
import { defaultFilters, searchDirectory } from "./match.ts"
import {
  matchPhoneLine,
  parsePhoneQuery,
  phoneMapsUrl,
  phoneRegisterPath,
  phoneWebUrl,
} from "./phone-lookup.ts"
import type { Business } from "./types.ts"

const filters = { ...defaultFilters, sehir: "hepsi" as const }

assert.equal(parsePhoneQuery("Kadıköy tesisatçı"), null)
assert.equal(parsePhoneQuery("kombi 0532 111 22 33"), null)
assert.equal(parsePhoneQuery("1234"), null)
assert.equal(parsePhoneQuery("12 34 56"), null)

const mobile = parsePhoneQuery("0532 555 04 15")
assert.ok(mobile?.complete)
assert.equal(mobile?.e164, "+905325550415")
assert.equal(mobile?.display, "0532 555 04 15")
assert.equal(parsePhoneQuery("+90 532 555 04 15")?.national, mobile?.national)
assert.equal(parsePhoneQuery("00905325550415")?.national, "5325550415")
assert.equal(parsePhoneQuery("GSM 0532 555 04 15")?.complete, true)

const partial = parsePhoneQuery("0532 555")
assert.equal(partial?.complete, false)
assert.equal(parsePhoneQuery("0532 555 04 1")?.complete, false)
assert.equal(phoneMapsUrl(partial!), "")
assert.equal(searchDirectory(businesses, "0532 555", filters).length, 0)

const boya = searchDirectory(businesses, "0532 555 04 15", { ...filters, sehir: "Ankara" })
assert.equal(boya.length, 1)
assert.equal(boya[0]?.business.slug, "kumsal-boya")
assert.match(boya[0]?.reason ?? "", /GSM|telefon/)

const landline = searchDirectory(businesses, "0212 555 01 09", filters)
assert.equal(landline[0]?.business.slug, "marmara-kahvesi")
assert.equal(searchDirectory(businesses, "+90 212 555 01 09", filters)[0]?.business.slug, "marmara-kahvesi")

const market = searchDirectory(businesses, "444 10 00", filters)
assert.equal(market[0]?.business.slug, "carrefour-market")
assert.equal(searchDirectory(businesses, "4441000", filters).some((item) => item.business.slug === "carrefour-market"), true)

const marmara = businesses.find((item) => item.slug === "marmara-kahvesi")
assert.ok(marmara)
const decoy: Business = {
  ...marmara,
  id: "decoy",
  slug: "decoy",
  name: "Yanlış Kart",
  phone: "0212 000 00 00",
  about: "Metinde 0212 555 01 09 geçiyor ama bu işletmenin numarası değil.",
}
const exact = searchDirectory([marmara, decoy], "0212 555 01 09", filters)
assert.deepEqual(exact.map((item) => item.business.slug), ["marmara-kahvesi"])

const shared = marmara
const hidden: Business = { ...shared, id: "a", slug: "a", name: "Açık Usta", verified: false, phone: "0532 111 22 33" }
const trusted: Business = { ...shared, id: "b", slug: "b", name: "Onaylı Usta", verified: true, phone: "+90 532 111 22 33" }
const both = searchDirectory([hidden, trusted], "05321112233", filters)
assert.deepEqual(both.map((item) => item.business.slug), ["b", "a"])

const whatsapp: Business = {
  ...shared,
  id: "wa",
  slug: "wa",
  phone: "",
  contacts: { landline: "", mobile: "", whatsapp: "0532 111 22 33" },
}
assert.equal(matchPhoneLine(whatsapp, parsePhoneQuery("0532 111 22 33")!), "whatsapp")
assert.equal(searchDirectory([whatsapp], "0532 111 22 33", filters)[0]?.reason.includes("WhatsApp"), true)

const combined: Business = { ...shared, id: "mix", slug: "mix", phone: "4444467; +90 372 280 15 39" }
assert.equal(searchDirectory([combined], "0372 280 15 39", filters)[0]?.business.slug, "mix")
assert.equal(searchDirectory([combined], "444 44 67", filters)[0]?.business.slug, "mix")
assert.equal(searchDirectory([combined], "322 11 11", filters).length, 0)

const local: Business = { ...shared, id: "local", slug: "local", phone: "322 11 11" }
assert.equal(searchDirectory([local], "322 11 11", filters)[0]?.business.slug, "local")

const maps = phoneMapsUrl(mobile!)
assert.equal(maps.startsWith("https://www.google.com/maps/search/?api=1&query=%2B905325550415"), true)
assert.equal(phoneWebUrl(mobile!)?.startsWith("https://www.google.com/search?q="), true)
const draft = phoneRegisterPath(mobile!)
assert.equal(draft.startsWith("/listele?tel="), true)
assert.equal(draft.includes("<"), false)
assert.equal(parsePhoneQuery("javascript:alert(1)"), null)

console.log("phone-lookup ok")
