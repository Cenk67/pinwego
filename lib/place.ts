import { cityCenter } from "@/lib/catalog"
import { distanceKm, fold } from "@/lib/format"
import type { Business } from "@/lib/types"

export type Place = {
  label: string
  country: string
  countryCode: string
  region: string
  province: string
  district: string
  neighborhood: string
  lat: number
  lng: number
  nearMe: boolean
}

export type AreaOption = {
  name: string
  lat: number
  lng: number
  osmId: number
  adminLevel: number
}

export const defaultPlace: Place = {
  label: "İstanbul, Türkiye",
  country: "Türkiye",
  countryCode: "tr",
  region: "Marmara Bölgesi",
  province: "İstanbul",
  district: "",
  neighborhood: "",
  lat: 41.015,
  lng: 28.979,
  nearMe: false,
}

export function placeFromCity(city: string): Place {
  const center = cityCenter(city)
  return {
    ...defaultPlace,
    label: `${center.name}, Türkiye`,
    province: center.name,
    lat: center.lat,
    lng: center.lng,
    nearMe: false,
  }
}

export function isPlace(value: unknown): value is Place {
  if (!value || typeof value !== "object") return false
  const place = value as Partial<Place>
  return typeof place.lat === "number" && typeof place.lng === "number" && typeof place.country === "string"
}

export function placeLabel(place: Place) {
  if (place.nearMe) return "Yakınımdakiler"
  const parts = [place.neighborhood, place.district, place.province, place.region, place.country].filter(Boolean)
  return parts.slice(0, 2).join(", ") || "Konum seç"
}

export function slotFor(adminLevel: number): "region" | "province" | "district" | "neighborhood" {
  if (adminLevel <= 3) return "region"
  if (adminLevel === 4) return "province"
  if (adminLevel <= 6) return "district"
  return "neighborhood"
}

function isTurkey(place: Place) {
  return place.countryCode === "tr" || ["turkiye", "turkey"].includes(fold(place.country))
}

export function businessInPlace(business: Business, place: Place) {
  const district = fold(business.district)
  const city = fold(business.city)
  const address = fold(`${business.address} ${business.district} ${business.city}`)
  const neighborhood = fold(place.neighborhood)
  const area = fold(place.district)
  const province = fold(place.province)
  if (neighborhood) return district === neighborhood || address.includes(neighborhood) || city === neighborhood
  if (area) return district === area || city === area || address.includes(area)
  if (province) return city === province || district === province
  if (place.country && !isTurkey(place)) return false
  return true
}

export function applyPlace<T extends { business: Business; distanceKm: number }>(
  items: T[],
  place: Place,
  keepAll = false,
) {
  if (keepAll) return { items, widened: false }
  if (place.nearMe) {
    const close = items.filter((item) => item.distanceKm <= 40)
    if (close.length) return { items: close, widened: false }
    return {
      items: [...items].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 8),
      widened: true,
    }
  }
  return { items: items.filter((item) => businessInPlace(item.business, place)), widened: false }
}

export function placeOrigin(place: Place) {
  return { lat: place.lat, lng: place.lng }
}

export function distanceFromPlace(place: Place, business: Business) {
  return distanceKm(placeOrigin(place), business)
}
