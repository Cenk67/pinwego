import { getLocale, translate } from "@/lib/i18n"
import type { MessageKey } from "@/lib/messages"
import type { BookingKind, Business } from "@/lib/types"

export function formatTry(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatResponse(minutes: number) {
  if (minutes < 60) return translate(getLocale(), "time.min", { n: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return translate(getLocale(), "time.hour", { n: hours })
  const days = Math.round(hours / 24)
  return translate(getLocale(), "time.day", { n: days })
}

export function formatDistance(km: number) {
  if (km < 1) return `${Math.max(50, Math.round(km * 1000))} m`
  return `${km.toFixed(km < 10 ? 1 : 0)} km`
}

export function formatRating(business: Business) {
  if (!business.reviewCount) return translate(getLocale(), "card.new")
  return business.rating.toFixed(1)
}

export function priceMarks(level: number) {
  return "₺".repeat(level)
}

export function priceLabel(level: number) {
  const key = (`price.${level}` as MessageKey)
  if (level >= 1 && level <= 4) return translate(getLocale(), key)
  return translate(getLocale(), "price.2")
}

export function bookingLabel(kind: BookingKind) {
  if (kind === "randevu") return translate(getLocale(), "book.randevu")
  if (kind === "rezervasyon") return translate(getLocale(), "book.rezervasyon")
  return translate(getLocale(), "book.teklif")
}

export function priceRange(business: Business) {
  const prices = business.services
    .map((service) => service.price)
    .filter((price) => price > 0)
  if (!prices.length) return translate(getLocale(), "card.ask")
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  if (min === max) return formatTry(min)
  return `${formatTry(min)} – ${formatTry(max)}`
}

export function fold(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const earth = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * earth * Math.asin(Math.sqrt(h))
}

export function slugify(value: string) {
  const base = fold(value).replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
  return `${base || "isletme"}-${Date.now().toString(36)}`
}

export function slugifyKey(value: string) {
  return fold(value).replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "sektor"
}
