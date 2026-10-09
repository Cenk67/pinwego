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

function core(value: string) {
  return fold(value)
    .replace(/\b(ilcesi|ili|mahallesi|mah|beldesi|belediyesi)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function words(value: string) {
  return core(value).split(" ").filter(Boolean)
}

function areaNeedle(area: string, province: string) {
  let needle = core(area)
  const parent = core(province)
  if (!needle) return ""
  if (parent && needle.startsWith(`${parent} `)) needle = needle.slice(parent.length).trim()
  if (parent && needle.endsWith(` ${parent}`)) needle = needle.slice(0, -(parent.length + 1)).trim()
  if (needle.endsWith(" merkez")) return "merkez"
  return needle
}

function sameArea(left: string, right: string) {
  if (!left || !right) return false
  if (left === right) return true
  const leftWords = left.split(" ")
  const rightWords = right.split(" ")
  if (leftWords.includes(right) || rightWords.includes(left)) return true
  return false
}

function inProvince(city: string, district: string, province: string) {
  if (!province) return true
  return city === province || district === province
}

function matchesDistrict(business: Business, raw: string, provinceName: string) {
  const needle = areaNeedle(raw, provinceName)
  const district = core(business.district)
  const city = core(business.city)
  const province = core(provinceName)
  if (!needle || needle === "merkez") {
    const parent = province || core(raw).replace(/ merkez$/, "")
    if (!inProvince(city, district, parent)) return false
    return !district || district === "merkez" || district === city || district === province
  }
  if (!inProvince(city, district, province)) return false
  return sameArea(district, needle) || sameArea(city, needle)
}

export function businessInPlace(business: Business, place: Place) {
  const province = core(place.province)
  const city = core(business.city)
  const district = core(business.district)
  if (place.neighborhood) {
    const needle = areaNeedle(place.neighborhood, place.province || place.district)
    const named =
      matchesDistrict(business, place.neighborhood, place.province || place.district) ||
      (needle &&
        needle !== "merkez" &&
        inProvince(city, district, core(place.province || place.district)) &&
        words(`${business.address} ${business.district} ${business.city}`).includes(needle))
    if (!named) return false
    if (place.district) return matchesDistrict(business, place.district, place.province)
    return true
  }
  if (place.district) return matchesDistrict(business, place.district, place.province)
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
  const matched = items.filter((item) => businessInPlace(item.business, place))
  if (matched.length || !place.district || core(place.district) !== "merkez" || !place.province) {
    return { items: matched, widened: false }
  }
  const provinceItems = items.filter((item) =>
    businessInPlace(item.business, { ...place, district: "", neighborhood: "" }),
  )
  if (!provinceItems.length) return { items: matched, widened: false }
  return { items: provinceItems, widened: false }
}

export function placeOrigin(place: Place) {
  return { lat: place.lat, lng: place.lng }
}

export function distanceFromPlace(place: Place, business: Business) {
  return distanceKm(placeOrigin(place), business)
}
