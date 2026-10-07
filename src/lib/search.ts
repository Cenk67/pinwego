import { BUSINESSES } from "./businesses"
import { CATEGORIES, CITIES, USER_LOCATION } from "./categories"
import type { Business, CategoryId, PriceLevel, SearchIntent, SearchResult } from "./types"

const CATEGORY_ALIASES: Array<{ keys: string[]; id: CategoryId }> = [
  { id: "restoranlar", keys: ["restoran", "yemek", "kebap", "pizza", "sushi", "omakase", "ocakbaşı", "ocakbasi", "akşam yemeği", "aksam yemegi", "lokanta", "meze"] },
  { id: "kafeler", keys: ["kafe", "kahve", "filtre", "fırın", "firin", "kahvaltı", "kahvalti", "espresso"] },
  { id: "guzellik", keys: ["kuaför", "kuafor", "berber", "saç", "sac", "spa", "hamam", "masaj", "güzellik", "guzellik", "randevu al"] },
  { id: "ev-hizmetleri", keys: ["tesisat", "tesisatçı", "tesisatci", "boya", "tadilat", "temizlik", "usta", "peyzaj", "bahçe", "bahce", "kombi", "ev hizmet"] },
  { id: "saglik", keys: ["diş", "dis", "doktor", "klinik", "fizik", "sağlık", "saglik", "gym", "spor salonu"] },
  { id: "b2b", keys: ["ihracat", "ithalat", "b2b", "firma", "sanayi", "imalat", "ticaret", "tedarikçi", "tedarikci"] },
  { id: "konaklama", keys: ["otel", "konak", "pansiyon", "oda", "tatil", "seyahat"] },
  { id: "profesyonel", keys: ["avukat", "hukuk", "mali müşavir", "mali musavir", "muhasebe", "vergi"] },
  { id: "alisveris", keys: ["mobilya", "dekor", "iç mimar", "ic mimar", "showroom", "mutfak"] },
  { id: "otomotiv", keys: ["oto", "servis", "yağ", "yag", "fren", "araba", "otomobil"] },
]

const DISTRICT_ALIASES: Record<string, string> = {
  kadıköy: "Kadıköy",
  kadikoy: "Kadıköy",
  moda: "Kadıköy",
  beşiktaş: "Beşiktaş",
  besiktas: "Beşiktaş",
  levent: "Beşiktaş",
  şişli: "Şişli",
  sisli: "Şişli",
  nişantaşı: "Şişli",
  nisantasi: "Şişli",
  beyoğlu: "Beyoğlu",
  beyoglu: "Beyoğlu",
  karaköy: "Beyoğlu",
  karakoy: "Beyoğlu",
  üsküdar: "Üsküdar",
  uskudar: "Üsküdar",
  ataşehir: "Ataşehir",
  atasehir: "Ataşehir",
  çankaya: "Çankaya",
  cankaya: "Çankaya",
  kızılay: "Çankaya",
  alsancak: "Konak",
  karşıyaka: "Karşıyaka",
  karsiyaka: "Karşıyaka",
  kaleiçi: "Muratpaşa",
  lara: "Muratpaşa",
}

const AMENITY_KEYS: Array<{ keys: string[]; amenity: string }> = [
  { keys: ["teras"], amenity: "teras" },
  { keys: ["deniz", "manzara"], amenity: "deniz manzarası" },
  { keys: ["otopark", "vale"], amenity: "otopark" },
  { keys: ["vegan"], amenity: "vegan seçenek" },
  { keys: ["wifi", "laptop", "çalış"], amenity: "wifi" },
  { keys: ["çocuk", "aile"], amenity: "aile" },
  { keys: ["gluten"], amenity: "gluten-free" },
]

function includesAny(hay: string, keys: string[]) {
  return keys.some((k) => hay.includes(k))
}

function haversine(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export function parseIntent(
  query: string,
  extras?: Partial<SearchIntent>
): SearchIntent {
  const q = query.trim().toLocaleLowerCase("tr")
  const intent: SearchIntent = {
    query,
    tags: [],
    amenities: [],
    sort: extras?.sort ?? "relevance",
    ...extras,
  }

  if (!intent.category) {
    const hit = CATEGORY_ALIASES.find((c) => includesAny(q, c.keys))
    if (hit) intent.category = hit.id
  }

  if (!intent.city) {
    const city = CITIES.find(
      (c) => q.includes(c.label.toLocaleLowerCase("tr")) || q.includes(c.slug)
    )
    if (city) intent.city = city.slug
  }

  if (!intent.district) {
    for (const [key, district] of Object.entries(DISTRICT_ALIASES)) {
      if (q.includes(key)) {
        intent.district = district
        if (!intent.city) {
          if (["Çankaya"].includes(district)) intent.city = "ankara"
          else if (["Konak", "Karşıyaka"].includes(district)) intent.city = "izmir"
          else if (["Muratpaşa"].includes(district)) intent.city = "antalya"
          else intent.city = "istanbul"
        }
        break
      }
    }
  }

  if (includesAny(q, ["lüks", "luks", "pahalı", "pahali", "omakase"])) {
    intent.priceMin = 3
  } else if (includesAny(q, ["ucuz", "ekonomik", "uygun fiyat"])) {
    intent.priceMax = 2
  } else if (includesAny(q, ["orta fiyat", "makul"])) {
    intent.priceMin = 2
    intent.priceMax = 3
  }

  for (const row of AMENITY_KEYS) {
    if (includesAny(q, row.keys) && !intent.amenities.includes(row.amenity)) {
      intent.amenities.push(row.amenity)
    }
  }

  if (includesAny(q, ["açık", "acik", "şimdi", "simdi"])) intent.openNow = true
  if (includesAny(q, ["bu akşam", "aksam", "akşam", "tonight"])) intent.tonight = true
  if (includesAny(q, ["yakınımda", "yakinimda", "near me", "civarda"])) {
    intent.nearMe = true
    if (!intent.city) intent.city = USER_LOCATION.citySlug
  }
  if (includesAny(q, ["randevu", "rezervasyon", "slot"])) intent.wantsBooking = true
  if (includesAny(q, ["teklif", "usta", "keşif", "kesif", "fiyat al"])) intent.wantsQuote = true

  const party = q.match(/(\d+)\s*(kişi|kisilik|kişilik)/)
  if (party) intent.partySize = Number(party[1])

  return intent
}

function scoreBusiness(b: Business, intent: SearchIntent, origin: { lat: number; lng: number }) {
  let score = b.rating * 12 + Math.log10(b.reviewCount + 1) * 8
  if (b.verified) score += 6
  if (b.premium) score += 4
  if (intent.category && b.category === intent.category) score += 28
  if (intent.city && b.citySlug === intent.city) score += 18
  if (intent.district && b.district === intent.district) score += 16

  const qTokens = intent.query
    .toLocaleLowerCase("tr")
    .split(/\s+/)
    .filter((t) => t.length > 2)
  const blob = `${b.name} ${b.subcategory} ${b.description} ${b.tags.join(" ")} ${b.amenities.join(" ")}`.toLocaleLowerCase("tr")
  for (const token of qTokens) {
    if (blob.includes(token)) score += 5
  }

  for (const amenity of intent.amenities) {
    if (b.amenities.some((a) => a.includes(amenity) || amenity.includes(a))) score += 10
    else score -= 8
  }

  if (intent.priceMax && b.priceLevel > intent.priceMax) score -= 14
  if (intent.priceMin && b.priceLevel < intent.priceMin) score -= 10
  if (intent.wantsBooking && b.services?.length) score += 12
  if (intent.wantsQuote && b.quoteEnabled) score += 14

  const distanceKm = haversine(origin.lat, origin.lng, b.lat, b.lng)
  if (intent.nearMe || intent.sort === "distance") {
    score += Math.max(0, 22 - distanceKm * 2.4)
  }

  return { score, distanceKm }
}

export function searchBusinesses(
  catalog: Business[],
  intent: SearchIntent,
  origin = USER_LOCATION
): SearchResult {
  const ranked = catalog
    .map((b) => {
      const { score, distanceKm } = scoreBusiness(b, intent, origin)
      return { ...b, score, distanceKm }
    })
    .filter((b) => {
      if (intent.category && b.category !== intent.category) {
        if (!intent.query.trim()) return false
        if (b.score < 20) return false
      }
      if (intent.city && b.citySlug !== intent.city) return false
      if (intent.district && b.district !== intent.district) return false
      if (intent.priceMax && b.priceLevel > intent.priceMax) return false
      if (intent.priceMin && b.priceLevel < intent.priceMin) return false
      return true
    })
    .sort((a, b) => {
      if (intent.sort === "rating") return b.rating - a.rating
      if (intent.sort === "reviews") return b.reviewCount - a.reviewCount
      if (intent.sort === "distance") return (a.distanceKm ?? 0) - (b.distanceKm ?? 0)
      return b.score - a.score
    })

  const chips: string[] = []
  if (intent.category) {
    chips.push(CATEGORIES.find((c) => c.id === intent.category)?.label ?? intent.category)
  }
  if (intent.city) chips.push(CITIES.find((c) => c.slug === intent.city)?.label ?? intent.city)
  if (intent.district) chips.push(intent.district)
  for (const a of intent.amenities) chips.push(a)
  if (intent.priceMax === 2) chips.push("Ekonomik")
  if (intent.priceMin === 3) chips.push("Üst segment")
  if (intent.nearMe) chips.push("Yakınımda")
  if (intent.wantsBooking) chips.push("Randevu")
  if (intent.wantsQuote) chips.push("Teklif")
  if (intent.partySize) chips.push(`${intent.partySize} kişilik`)

  const cityLabel = CITIES.find((c) => c.slug === intent.city)?.label
  const catLabel = CATEGORIES.find((c) => c.id === intent.category)?.label?.toLocaleLowerCase("tr")
  const where = [intent.district, cityLabel].filter(Boolean).join(", ")
  const extras = intent.amenities.length ? `${intent.amenities.join(", ")} özellikli` : "uygun"
  const explanation = intent.query.trim()
    ? `“${intent.query.trim()}” isteğini ${extras}${catLabel ? ` ${catLabel}` : " işletme"} olarak okudum${where ? ` · ${where}` : ""}. ${ranked.length} kayıt eşleşti; puan, yorum hacmi ve mesafe birlikte sıralandı.`
    : `${where || "Tüm şehirler"} içinde ${ranked.length} işletme listeleniyor.`

  return { intent, explanation, chips, businesses: ranked }
}

export function runSearch(
  query: string,
  extras?: Partial<SearchIntent>,
  catalog: Business[] = BUSINESSES
) {
  return searchBusinesses(catalog, parseIntent(query, extras))
}

export function priceLabel(level: PriceLevel) {
  return "₺".repeat(level)
}

export function formatRating(n: number) {
  return n.toFixed(1).replace(".", ",")
}
