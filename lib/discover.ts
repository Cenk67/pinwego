import { fold } from "@/lib/format"

export const DISCOVER_ORIGIN = "https://www.google.com/maps/search/"

export type DiscoverPlace = {
  id: string
  name: string
  address: string
  mapsUrl: string
  status: string
}

export type DiscoverReason = "unconfigured" | "quota" | "unavailable" | "invalid" | "off"

export type DiscoverSettings = {
  enabled: boolean
  places: boolean
  maps: boolean
  country: string
  maxResults: number
  thin: number
  registerPath: string
}

export const defaultDiscoverSettings: DiscoverSettings = {
  enabled: true,
  places: true,
  maps: true,
  country: "TR",
  maxResults: 8,
  thin: 3,
  registerPath: "/listele",
}

export type DiscoverEventType = "pinwego_miss" | "places_request" | "places_result" | "maps_click" | "web_click" | "video_click" | "register_click" | "register_done"

export type DiscoverEvent = {
  type: DiscoverEventType
  q: string
  city: string
  at: string
  count?: number
}

const controls = /[\u0000-\u001F\u007F]/g

export function cleanDiscoverText(value: string, max = 80) {
  return value.replace(controls, " ").replace(/\s+/g, " ").trim().slice(0, max)
}

export function discoverQuery(value: string) {
  const clean = cleanDiscoverText(value, 80)
  if (/[<>`]|https?:|javascript:|data:/i.test(clean)) return ""
  const letters = fold(clean).replace(/[^a-z0-9\u00c0-\u024f\u0400-\u04ff\u0600-\u06ff\u0900-\u097f\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]+/gi, "")
  if (letters.length < 2) return ""
  return clean
}

export function discoverCity(value: string) {
  const clean = cleanDiscoverText(value, 60)
  if (!clean || fold(clean) === "hepsi") return ""
  return clean
}

export function mapsQuery(query: string, city: string) {
  const q = discoverQuery(query)
  const place = discoverCity(city)
  if (!q) return ""
  if (!place || fold(q).includes(fold(place))) return q
  return `${q} ${place}`
}

export function mapsSearchUrl(query: string, city: string) {
  const text = mapsQuery(query, city)
  if (!text) return ""
  return `${DISCOVER_ORIGIN}?api=1&query=${encodeURIComponent(text)}`
}

export function webSearchUrl(query: string, city: string) {
  const text = mapsQuery(query, city)
  if (!text) return ""
  return `https://www.google.com/search?q=${encodeURIComponent(text)}`
}

export function videoSearchUrl(query: string, city: string) {
  const text = mapsQuery(query, city)
  if (!text) return ""
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(text)}`
}

export function discoverPath(query: string, city: string) {
  const params = new URLSearchParams()
  const q = discoverQuery(query)
  const place = discoverCity(city)
  if (q) params.set("q", q)
  if (place) params.set("sehir", place)
  const qs = params.toString()
  return qs ? `/kesif?${qs}` : "/kesif"
}

export function registerDraftPath(settings: DiscoverSettings, name: string, address: string) {
  const base = settings.registerPath.startsWith("/") && !settings.registerPath.startsWith("//") ? settings.registerPath : "/listele"
  const params = new URLSearchParams()
  const draftName = cleanDiscoverText(name, 80)
  const draftAddress = cleanDiscoverText(address, 120)
  if (draftName) params.set("ad", draftName)
  if (draftAddress) params.set("adres", draftAddress)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

export function showDiscover(resultCount: number, settings: DiscoverSettings, hasQuery: boolean) {
  if (!settings.enabled || !hasQuery) return false
  return resultCount < Math.min(20, Math.max(1, settings.thin))
}

export function clampResults(value: number) {
  if (!Number.isFinite(value)) return defaultDiscoverSettings.maxResults
  return Math.min(8, Math.max(1, Math.round(value)))
}

export function countryCode(value: string) {
  const clean = value.trim().toUpperCase()
  return /^[A-Z]{2}$/.test(clean) ? clean : "TR"
}

export function languageCode(value: string) {
  const clean = value.trim().toLowerCase()
  return /^[a-z]{2}$/.test(clean) ? clean : "tr"
}

export function takeDiscoverSlot(stamps: number[], now: number, limit = 12, windowMs = 60_000) {
  const fresh = stamps.filter((at) => now - at < windowMs)
  if (fresh.length >= limit) return { ok: false as const, stamps: fresh }
  return { ok: true as const, stamps: [...fresh, now] }
}

export function normalizeSettings(value: Partial<DiscoverSettings> | null | undefined): DiscoverSettings {
  const path = typeof value?.registerPath === "string" ? value.registerPath : defaultDiscoverSettings.registerPath
  return {
    enabled: value?.enabled !== false,
    places: value?.places !== false,
    maps: value?.maps !== false,
    country: countryCode(typeof value?.country === "string" ? value.country : "TR"),
    maxResults: clampResults(typeof value?.maxResults === "number" ? value.maxResults : 8),
    thin: Math.min(20, Math.max(1, Math.round(typeof value?.thin === "number" ? value.thin : 3))),
    registerPath: path.startsWith("/") && !path.startsWith("//") ? path.slice(0, 80) : "/listele",
  }
}
