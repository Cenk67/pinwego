import { fold } from "@/lib/format"
import { parseQuery } from "@/lib/match"
import type { Business, CategoryId, SortKey } from "@/lib/types"

export type VoiceIntent = {
  query: string
  city?: string
  district?: string
  category?: CategoryId
  openNow: boolean
  family: boolean
  brand?: string
  minRating?: number
  delivery: boolean
  sort?: SortKey
  near: boolean
  tonight: boolean
  twentyFour: boolean
}

export type VoicePatch = {
  voice: true
  near: boolean
  acik: string | null
  puan: string | null
  sirala: string | null
  kategori: string | null
  family: boolean
  delivery: boolean
}

const BRANDS = [
  "volkswagen",
  "mercedes",
  "bmw",
  "audi",
  "toyota",
  "honda",
  "ford",
  "renault",
  "fiat",
  "hyundai",
  "opel",
  "peugeot",
  "volvo",
  "tesla",
  "kia",
  "nissan",
  "skoda",
  "citroen",
]

function tokens(text: string) {
  return text.split(" ").filter(Boolean)
}

function mentionsOpen(text: string) {
  return tokens(text).some((token) => token === "acik" || (token.startsWith("acik") && !token.startsWith("acikla") && token.length <= 8))
}

function wantsNear(text: string) {
  if (text.includes("yakinimda") || text.includes("yakinimdaki") || text.includes("yakindaki")) return true
  if (text.includes("near me") || text.includes("nearby")) return true
  if (text.includes("en yakin") || text.includes("nearest")) return true
  return false
}

function wantsDelivery(text: string) {
  return (
    text.includes("eve servis") ||
    text.includes("paket servis") ||
    text.includes("eve teslim") ||
    text.includes("teslimat") ||
    text.includes("delivery")
  )
}

function ratingFromRaw(raw: string) {
  const lower = raw.toLocaleLowerCase("tr-TR")
  const match = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:yıldız|yildiz|stars?|puan)/i)
  if (!match) return undefined
  const value = Number(match[1].replace(",", "."))
  if (!Number.isFinite(value) || value < 1 || value > 5) return undefined
  return value
}

function findBrand(text: string) {
  const words = tokens(text)
  return BRANDS.find((brand) => words.some((word) => word === brand || word.startsWith(brand)))
}

function mentionsService(text: string) {
  return tokens(text).some((token) => token === "servis" || token.startsWith("servis"))
}

export function understandVoice(transcript: string, businesses: Business[] = []): VoiceIntent {
  const query = transcript.trim().slice(0, 240)
  const text = fold(query)
  const parsed = parseQuery(query, businesses)
  const tonight = text.includes("bu gece") || text.includes("tonight")
  const twentyFour = text.includes("24 saat")
  const near = wantsNear(text)
  const delivery = wantsDelivery(text)
  const spokenRating = ratingFromRaw(query)
  const minRating = spokenRating ?? parsed.minRating
  const brand = findBrand(text)
  let category = parsed.category
  if (!category && brand && mentionsService(text)) category = "oto"
  let sort: SortKey | undefined
  const words = tokens(text)
  if (near && (text.includes("en yakin") || words.includes("nearest"))) sort = "mesafe"
  else if (text.includes("en ucuz") || words.includes("cheapest") || text.includes("en uygun fiyat")) sort = "fiyat"
  else if (text.includes("en iyi") || words.includes("best")) sort = "puan"
  const openNow = parsed.openNow || mentionsOpen(text) || tonight || twentyFour
  return {
    query,
    city: parsed.city,
    district: parsed.district,
    category,
    openNow,
    family: parsed.tags.includes("aile"),
    brand,
    minRating,
    delivery,
    sort,
    near,
    tonight,
    twentyFour,
  }
}

export function voicePatch(intent: VoiceIntent, parser = true): VoicePatch {
  if (!parser) {
    return { voice: true, near: false, acik: null, puan: null, sirala: null, kategori: null, family: false, delivery: false }
  }
  return {
    voice: true,
    near: intent.near,
    acik: intent.openNow ? "1" : null,
    puan: intent.minRating ? String(intent.minRating) : null,
    sirala: intent.sort && intent.sort !== "ilgili" ? intent.sort : null,
    kategori: intent.category ?? null,
    family: intent.family,
    delivery: intent.delivery,
  }
}

export function voiceSearchPath(query: string, patch: Pick<VoicePatch, "acik" | "puan" | "sirala" | "kategori">) {
  const params = new URLSearchParams()
  const text = query.trim().slice(0, 240)
  if (text) params.set("q", text)
  if (patch.kategori) params.set("kategori", patch.kategori)
  if (patch.acik) params.set("acik", patch.acik)
  if (patch.puan) params.set("puan", patch.puan)
  if (patch.sirala) params.set("sirala", patch.sirala)
  const qs = params.toString()
  return qs ? `/ara?${qs}` : "/ara"
}
