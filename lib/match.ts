import { cityCenter } from "@/lib/catalog"
import {
  bookingLabel,
  distanceKm,
  fold,
  formatDistance,
  formatRating,
  formatResponse,
} from "@/lib/format"
import { allSectors } from "@/lib/sectors"
import type { Business, CategoryId, Filters } from "@/lib/types"

export type RankedBusiness = {
  business: Business
  score: number
  distanceKm: number
  reason: string
}

export const defaultFilters: Filters = {
  sehir: "hepsi",
  kategori: "hepsi",
  minRating: 0,
  maxPrice: 4,
  openNow: false,
  verified: false,
  premium: false,
  sort: "ilgili",
}

function categoryPhrases() {
  return allSectors().map((item) => ({
    id: item.id,
    phrases: [...new Set([...item.phrases, fold(item.label)])],
  }))
}

const TAG_RULES: { tag: string; phrases: string[] }[] = [
  { tag: "aile", phrases: ["aile", "cocuk", "cocuklu", "bebekli"] },
  { tag: "manzara", phrases: ["manzara", "manzarali", "deniz", "sahil"] },
  { tag: "kahvalti", phrases: ["kahvalti", "brunch"] },
  { tag: "aksam", phrases: ["aksam yemegi", "aksam"] },
  { tag: "ekonomik", phrases: ["ucuz", "ekonomik", "uygun", "butce"] },
  { tag: "luks", phrases: ["luks", "premium", "fine"] },
  { tag: "acil", phrases: ["acil", "hemen", "bugun"] },
  { tag: "ofis", phrases: ["ofis"] },
  { tag: "butik", phrases: ["butik"] },
  { tag: "vegan", phrases: ["vegan"] },
]

const STOPWORDS = new Set([
  "bir",
  "bu",
  "su",
  "ve",
  "ile",
  "icin",
  "gibi",
  "da",
  "de",
  "ta",
  "te",
  "mi",
  "mu",
  "ne",
  "en",
  "cok",
  "var",
  "olan",
  "lazim",
  "istiyorum",
  "isterim",
  "lutfen",
  "bana",
  "yakinda",
  "yakinimda",
  "yakin",
  "gidilecek",
  "diye",
  "kadar",
  "sonra",
  "once",
  "icin",
  "olan",
  "fiyat",
  "nde",
  "nda",
  "dan",
  "den",
])

const CITIES = ["İstanbul", "Ankara", "İzmir", "Antalya", "Bursa", "Zonguldak"]

export type ParsedQuery = {
  raw: string
  category?: CategoryId
  city?: string
  district?: string
  minRating?: number
  openNow: boolean
  tags: string[]
  terms: string[]
}

function hasPhrase(text: string, phrase: string) {
  if (phrase.includes(" ")) return text.includes(phrase)
  return text.split(" ").some((token) => token === phrase || token.startsWith(phrase))
}

function knownPlaces(list: Business[]) {
  const map = new Map<string, { name: string; city: string }>()
  for (const business of list) {
    map.set(`${fold(business.district)}|${fold(business.city)}`, {
      name: business.district,
      city: business.city,
    })
  }
  return [...map.values()].sort((a, b) => fold(b.name).length - fold(a.name).length)
}

export function parseQuery(query: string, list: Business[] = []): ParsedQuery {
  const raw = query.trim()
  const text = fold(raw)
  const tokens = text.split(" ").filter(Boolean)
  const places = knownPlaces(list)

  let district: string | undefined
  let city: string | undefined

  for (const place of places) {
    const folded = fold(place.name)
    if (tokens.some((token) => token === folded || token.startsWith(folded))) {
      district = place.name
      city = place.city
      break
    }
  }

  for (const name of CITIES) {
    const folded = fold(name)
    if (tokens.some((token) => token === folded || token.startsWith(folded))) {
      if (!district) city = name
      break
    }
  }

  const phrases = categoryPhrases()
  let category: CategoryId | undefined
  let categoryScore = 0
  for (const group of phrases) {
    let score = 0
    for (const phrase of group.phrases) {
      if (hasPhrase(text, phrase)) score += phrase.split(" ").length + 1
    }
    if (score > categoryScore) {
      category = group.id
      categoryScore = score
    }
  }

  const tags = TAG_RULES.filter((rule) =>
    rule.phrases.some((phrase) => hasPhrase(text, phrase)),
  ).map((rule) => rule.tag)

  let minRating: number | undefined
  const star = text.match(/(\d)\s*yildiz/)
  if (star) minRating = Number(star[1])
  else if (text.includes("en iyi")) minRating = 4.5
  else if (text.includes("yuksek puan")) minRating = 4.2

  const openNow =
    text.includes("su an") || text.includes("acik olan") || text.includes("hala acik")

  const consumed = new Set<string>(STOPWORDS)
  if (city) consumed.add(fold(city))
  if (district) consumed.add(fold(district))
  for (const group of phrases) {
    for (const phrase of group.phrases) phrase.split(" ").forEach((part) => consumed.add(part))
  }
  for (const rule of TAG_RULES) {
    for (const phrase of rule.phrases) phrase.split(" ").forEach((part) => consumed.add(part))
  }

  const terms = tokens
    .filter((token) => token.length > 2 && !consumed.has(token))
    .slice(0, 8)

  return { raw, category, city, district, minRating, openNow, tags, terms }
}

function haystack(business: Business) {
  return fold(
    [
      business.name,
      business.subcategory,
      business.summary,
      business.about,
      business.district,
      business.city,
      business.tags.join(" "),
      business.services.map((service) => service.name).join(" "),
      business.amenities.join(" "),
    ].join(" "),
  )
}

function termHit(hay: string, term: string) {
  return hay.split(" ").some((token) => {
    if (token === term) return true
    if (token.startsWith(term)) return true
    return term.startsWith(token) && token.length >= 4
  })
}

function explain(business: Business, parsed: ParsedQuery, km: number) {
  const parts: string[] = []
  if (parsed.district && fold(business.district) === fold(parsed.district)) {
    parts.push(business.district)
  } else if (parsed.city && fold(business.city) === fold(parsed.city)) {
    parts.push(business.city)
  } else {
    parts.push(`${business.district}, ${business.city}`)
  }
  parts.push(business.subcategory)
  if (parsed.tags.includes("aile") && business.tags.includes("aile")) parts.push("aile için uygun")
  if (parsed.tags.includes("manzara") && business.tags.includes("manzara")) {
    parts.push("manzara kaydı var")
  }
  if (parsed.tags.includes("ekonomik") && business.priceLevel <= 2) {
    parts.push("fiyatı uygun segmentte")
  }
  if (parsed.tags.includes("luks") && business.priceLevel >= 3) parts.push("üst segment")
  if (parsed.tags.includes("butik") && business.tags.includes("butik")) parts.push("butik kayıt")
  if (parsed.tags.includes("ofis") && business.tags.includes("ofis")) parts.push("ofis işi alıyor")
  if (parsed.tags.includes("acil")) parts.push(`dönüş ${formatResponse(business.responseMinutes)}`)
  if (parsed.openNow && business.openNow) parts.push("şu an açık")
  parts.push(formatDistance(km))
  parts.push(business.reviewCount ? `${formatRating(business)} puan` : "yeni kayıt")
  return parts.join(" · ")
}

export function searchDirectory(
  list: Business[],
  query: string,
  filters: Filters,
  origin = cityCenter(filters.sehir === "hepsi" ? "İstanbul" : filters.sehir),
): RankedBusiness[] {
  const parsed = parseQuery(query, list)
  const distanceOrigin = parsed.city ? cityCenter(parsed.city) : origin
  const filtered = list.filter((business) => {
    if (filters.sehir !== "hepsi" && fold(business.city) !== fold(filters.sehir)) return false
    if (filters.kategori !== "hepsi" && business.category !== filters.kategori) return false
    if (filters.minRating && business.rating < filters.minRating) return false
    if (filters.maxPrice < 4 && business.priceLevel > filters.maxPrice) return false
    if (filters.openNow && !business.openNow) return false
    if (filters.verified && !business.verified) return false
    if (filters.premium && !business.premium) return false
    return true
  })

  const ranked = filtered.map((business) => {
    const km = distanceKm(distanceOrigin, business)
    let score = business.rating / 5
    const hasIntent = Boolean(query.trim())

    if (hasIntent) {
      if (parsed.category && parsed.category === business.category) score += 8
      if (parsed.city) {
        score += fold(business.city) === fold(parsed.city) ? 6 : -4
      }
      if (parsed.district) {
        score += fold(business.district) === fold(parsed.district) ? 8 : -2
      }
      for (const tag of parsed.tags) {
        if (business.tags.includes(tag)) score += 3
      }
      if (parsed.tags.includes("ekonomik")) score += business.priceLevel <= 2 ? 4 : -3
      if (parsed.tags.includes("luks")) score += business.priceLevel >= 3 ? 4 : -2
      if (parsed.tags.includes("acil")) {
        score += Math.max(0, 5 - business.responseMinutes / 20)
      }
      if (parsed.minRating && business.rating >= parsed.minRating) score += 2
      if (parsed.openNow && business.openNow) score += 3
      const hay = haystack(business)
      for (const term of parsed.terms) {
        if (termHit(hay, term)) score += 1.5
      }
      score -= Math.min(km, parsed.city || parsed.district ? 30 : 80) * (parsed.city ? 0.12 : 0.02)
    } else {
      score -= Math.min(km, 40) * 0.04
    }

    if (business.premium) score += 0.35
    if (business.verified) score += 0.15
    score += Math.min(business.reviewCount, 400) / 400

    return {
      business,
      score,
      distanceKm: km,
      reason: explain(business, parsed, km),
    }
  })

  const sorters: Record<Filters["sort"], (a: RankedBusiness, b: RankedBusiness) => number> = {
    ilgili: (a, b) => b.score - a.score,
    puan: (a, b) => b.business.rating - a.business.rating || b.score - a.score,
    yorum: (a, b) => b.business.reviewCount - a.business.reviewCount || b.score - a.score,
    mesafe: (a, b) => a.distanceKm - b.distanceKm,
    yanit: (a, b) => a.business.responseMinutes - b.business.responseMinutes,
    fiyat: (a, b) => a.business.priceLevel - b.business.priceLevel || b.score - a.score,
  }

  return ranked.sort(sorters[filters.sort])
}

export function concierge(
  query: string,
  list: Business[],
  originName = "İstanbul",
  origin = cityCenter(originName),
) {
  const folded = fold(query)
  if (!folded || folded.length < 2) {
    return {
      text: "Semt, kategori ya da bir iş yaz. Örneğin: Üsküdar’da bugün gelebilen elektrikçi.",
      results: [] as RankedBusiness[],
    }
  }
  if (["merhaba", "selam", "hey", "selamlar", "nasilsin"].includes(folded)) {
    return {
      text: "Selam. Katalogdaki kayıtlarda semt, fiyat ve aciliyete göre eşleştirme yapıyorum. Ne aradığını yazman yeterli.",
      results: [] as RankedBusiness[],
    }
  }

  const results = searchDirectory(
    list,
    query,
    { ...defaultFilters, sehir: "hepsi" },
    origin,
  ).slice(0, 3)

  if (!results.length || results[0].score < 3) {
    return {
      text: "Bu tarife yakın kayıt zayıf. Semti ya da işi biraz daha açık yazar mısın?",
      results: results.filter((item) => item.score > 1),
    }
  }

  const top = results[0]
  return {
    text: `${top.business.name} öne çıkıyor: ${top.reason}. Karttan profile geçip ${bookingLabel(top.business.booking).toLocaleLowerCase("tr-TR")} yapabilirsin.`,
    results,
  }
}

export function aiBrief(business: Business) {
  const lead = business.reviews[0]
  const voice = lead ? ` Son yorumlardan biri: “${lead.text}”` : ""
  if (business.source === "google") {
    return `${business.summary} Google Haritalar bağlantılı kayıt. Puan ve yorum bu sayfaya kopyalanmadı.`
  }
  const trust = business.verified ? "Doğrulanmış profil." : "Doğrulama henüz tamamlanmamış."
  return `${business.summary} ${trust} Ortalama dönüş ${formatResponse(business.responseMinutes)}.${voice}`
}
