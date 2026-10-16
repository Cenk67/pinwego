import { cityCenter } from "@/lib/catalog"
import { getLocale, translate } from "@/lib/i18n"
import {
  bookingLabel,
  distanceKm,
  fold,
  formatDistance,
  formatRating,
  formatResponse,
} from "@/lib/format"
import { allSectors } from "@/lib/sectors"
import { correctNeedDetailed, matchNeed, type NeedCorrection } from "@/lib/need"
import { isWorldPhrase, worldAliases, worldFocus } from "@/lib/world-query"
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
    label: fold(item.label),
    phrases: [...new Set([...item.phrases, fold(item.label), ...worldAliases(item.id).map((alias) => alias.phrase)])],
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
  "the",
  "and",
  "for",
  "with",
  "near",
  "please",
  "now",
  "open",
  "und",
  "pour",
  "para",
  "con",
  "nde",
  "nda",
  "dan",
  "den",
])

export const CITIES = ["İstanbul", "Ankara", "İzmir", "Antalya", "Bursa", "Zonguldak"]

export type ParsedQuery = {
  raw: string
  /** Folded, corrected text the engine actually matched. */
  text: string
  /** Typo repairs and synonym swaps applied to the raw text. */
  changes: NeedCorrection[]
  category?: CategoryId
  categories: CategoryId[]
  labels: string[]
  focus: string[]
  city?: string
  district?: string
  minRating?: number
  openNow: boolean
  tags: string[]
  terms: string[]
}

const VOWELS = new Set(["a", "e", "i", "o", "u"])

function stems(token: string) {
  const forms = new Set([token])
  let body = token
  if (body.length > 5 && (body.endsWith("ler") || body.endsWith("lar"))) {
    body = body.slice(0, -3)
    forms.add(body)
  }
  if (body.length > 4 && /(?:den|dan|ten|tan)$/.test(body)) {
    body = body.slice(0, -3)
    forms.add(body)
  }
  if (body.length > 4 && /(?:de|da|te|ta)$/.test(body)) {
    body = body.slice(0, -2)
    forms.add(body)
  }
  if (body.length > 3 && VOWELS.has(body.slice(-1))) {
    const cut = body.slice(0, -1)
    forms.add(cut)
    const last = cut.slice(-1)
    const soften: Record<string, string> = { g: "k", b: "p", d: "t", c: "c" }
    if (cut.length > 3 && soften[last]) forms.add(`${cut.slice(0, -1)}${soften[last]}`)
  }
  return forms
}

function wordMatch(token: string, word: string) {
  if (!word) return false
  if (token === word) return true
  if (word.length < 3) return false
  if (token.startsWith(word)) return true
  if (token.length >= 4 && word.startsWith(token)) return true
  for (const form of stems(token)) {
    if (form === word || form.startsWith(word)) return true
  }
  return false
}

function hasPhrase(text: string, phrase: string) {
  const tokens = text.split(" ").filter(Boolean)
  const words = phrase.split(" ").filter(Boolean)
  if (!words.length) return false
  if (words.length === 1) return tokens.some((token) => wordMatch(token, words[0]))
  for (let index = 0; index <= tokens.length - words.length; index += 1) {
    if (words.every((word, offset) => wordMatch(tokens[index + offset], word))) return true
  }
  return false
}

function genericPhrase(phrase: string, label: string) {
  if (phrase === label) return true
  const words = phrase.split(" ")
  if (words.length !== 1) return false
  const word = words[0]
  return label.split(" ").some((part) => part.length >= 3 && (part.startsWith(word) || word.startsWith(part)))
}

const GENERIC_TRADE = new Set([
  "klinik",
  "klinigi",
  "merkez",
  "merkezi",
  "servis",
  "ofis",
  "salon",
  "usta",
  "ustasi",
  "dukkan",
  "magaza",
  "hizmet",
  "hizmeti",
  "bakim",
  "bakimi",
  "tamir",
  "tamiri",
  "saglik",
  "sagligi",
])

function tradeWords(value: string) {
  return fold(value)
    .split(" ")
    .filter((word) => word.length >= 3 && !GENERIC_TRADE.has(word))
}

export function sameTrade(left: Business, right: Business) {
  if (left.category !== right.category) return false
  const origin = tradeWords(left.subcategory)
  const other = tradeWords(right.subcategory)
  if (!origin.length || !other.length) return false
  return origin.some((word) => other.some((item) => wordMatch(word, item) || wordMatch(item, word)))
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
  const places = knownPlaces(list)
  const protectedWords = [...places.map((place) => fold(place.name)), ...places.map((place) => fold(place.city)), ...CITIES.map((name) => fold(name))]
  const corrected = correctNeedDetailed(fold(raw), protectedWords)
  const text = corrected.text
  const tokens = text.split(" ").filter(Boolean)

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
  let winners: { id: CategoryId; score: number; focus: string[] }[] = []
  const strong = matchNeed(text, true)
  if (strong) winners = strong.categories.map((id) => ({ id, score: 1, focus: [strong.focus] }))
  for (const group of phrases) {
    if (strong) break
    const hits: string[] = []
    let score = 0
    for (const phrase of group.phrases) {
      if (!hasPhrase(text, phrase)) continue
      score += phrase.split(" ").length + phrase.length / 10
      const mapped = worldFocus(group.id, phrase)
      if (mapped) hits.push(mapped)
      else if (!isWorldPhrase(group.id, phrase) && !genericPhrase(phrase, group.label)) hits.push(phrase)
    }
    if (score <= 0) continue
    const next = { id: group.id, score, focus: hits }
    if (!winners.length || score > winners[0].score) winners = [next]
    else if (score === winners[0].score) winners.push(next)
  }
  if (!winners.length) {
    const need = matchNeed(text)
    if (need) winners = need.categories.map((id) => ({ id, score: 1, focus: [need.focus] }))
  }
  const category = winners.length === 1 ? winners[0].id : undefined
  const categories = winners.map((item) => item.id)
  const labels = winners.map((item) => phrases.find((group) => group.id === item.id)?.label ?? "")
  const focus = [...new Set(winners.flatMap((item) => item.focus))]

  const tags = TAG_RULES.filter((rule) =>
    rule.phrases.some((phrase) => hasPhrase(text, phrase)),
  ).map((rule) => rule.tag)

  let minRating: number | undefined
  const star = text.match(/(\d)\s*yildiz/)
  if (star) minRating = Number(star[1])
  else if (text.includes("en iyi")) minRating = 4.5
  else if (text.includes("yuksek puan")) minRating = 4.2

  const openNow =
    text.includes("su an") ||
    text.includes("acik olan") ||
    text.includes("hala acik") ||
    text.includes("open now") ||
    text.includes("jetzt geoffnet") ||
    text.includes("ouvert maintenant") ||
    text.includes("abierto ahora") ||
    text.includes("aberto agora")

  const consumed = new Set<string>(STOPWORDS)
  if (city) consumed.add(fold(city))
  if (district) consumed.add(fold(district))
  for (const group of phrases) {
    if (!categories.includes(group.id)) continue
    for (const phrase of group.phrases) {
      if (hasPhrase(text, phrase)) phrase.split(" ").forEach((part) => consumed.add(part))
    }
  }
  for (const rule of TAG_RULES) {
    if (!tags.includes(rule.tag)) continue
    for (const phrase of rule.phrases) phrase.split(" ").forEach((part) => consumed.add(part))
  }

  const terms = tokens
    .filter((token) => token.length > 2 && !consumed.has(token))
    .slice(0, 8)

  return { raw, text, changes: corrected.changes, category, categories, labels, focus, city, district, minRating, openNow, tags, terms }
}

function identity(business: Business) {
  return fold(`${business.name} ${business.subcategory}`)
}

function salientWords(focus: string[], labels: string[]) {
  const words = [...new Set(focus.flatMap((phrase) => phrase.split(" ")))]
  return words.filter((word) => {
    if (word.length < 3) return false
    return !labels.some((label) => {
      if (genericPhrase(word, label)) return true
      for (const form of stems(word)) {
        if (genericPhrase(form, label)) return true
      }
      return false
    })
  })
}

function narrowToWritten(list: Business[], focus: string[], labels: string[]) {
  const words = salientWords(focus, labels)
  if (!words.length) return list
  const hits = list.filter((business) => words.some((word) => hasPhrase(identity(business), word)))
  return hits.length ? hits : list
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
      (business.profile?.aiTags ?? []).join(" "),
      (business.profile?.seoTags ?? []).join(" "),
      (business.profile?.services ?? [])
        .filter((service) => service.active)
        .map((service) => `${service.name} ${(service.aiTags ?? []).join(" ")}`)
        .join(" "),
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

/** Stricter than termHit: short words such as "sit" or "bir" must not keep a listing alive on their own. */
function strongHit(hay: string, term: string) {
  if (term.length < 4) return false
  return hay.split(" ").some((token) => token === term || token.startsWith(term))
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
  parts.push(
    business.reviewCount
      ? `${formatRating(business)} ${translate(getLocale(), "search.points")}`
      : translate(getLocale(), "card.new"),
  )
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
  const unstructured =
    Boolean(query.trim()) &&
    !parsed.categories.length &&
    !parsed.city &&
    !parsed.district &&
    !parsed.tags.length &&
    !parsed.minRating &&
    !parsed.openNow &&
    parsed.terms.length > 0
  const filtered = list.filter((business) => {
    if (filters.sehir !== "hepsi" && fold(business.city) !== fold(filters.sehir)) return false
    if (filters.kategori !== "hepsi" && business.category !== filters.kategori) return false
    if (filters.minRating && business.rating < filters.minRating) return false
    if (filters.maxPrice < 4 && business.priceLevel > filters.maxPrice) return false
    if (filters.openNow && !business.openNow) return false
    if (filters.verified && !business.verified) return false
    if (filters.premium && !business.premium) return false
    if (filters.kategori === "hepsi" && parsed.categories.length && !parsed.categories.includes(business.category)) {
      return false
    }
    // A sentence the engine could not read at all (no category, place, tag or filter) only keeps
    // listings whose own text mentions one of its words; otherwise it is a genuine zero result.
    if (unstructured && filters.kategori === "hepsi" && !parsed.terms.some((term) => strongHit(haystack(business), term))) {
      return false
    }
    return true
  })
  const pool = narrowToWritten(filtered, parsed.focus, parsed.labels)

  const ranked = pool.map((business) => {
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

    // A sponsored listing only gets its nudge inside its own category; it never climbs over an unrelated organic match.
    if (business.premium && (!hasIntent || !parsed.category || parsed.category === business.category)) score += 0.35
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
      outside: true,
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
