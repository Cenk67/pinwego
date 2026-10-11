import { fold } from "@/lib/format"

export const KKTC_CODE = "kktc"
export const KKTC_NAME = "Kuzey Kıbrıs Türk Cumhuriyeti"

export const kktcCenter = { lat: 35.224531, lng: 33.625238 }

export const kktcRegion = { name: "Kuzey Kıbrıs", lat: kktcCenter.lat, lng: kktcCenter.lng }

export const kktcViewbox = "32.5103,35.9133,34.8553,35.0030"

type Town = { name: string; lat: number; lng: number }

type District = { name: string; lat: number; lng: number; towns: Town[] }

export const kktcDistricts: District[] = [
  {
    name: "Lefkoşa",
    lat: 35.144,
    lng: 33.3656,
    towns: [
      { name: "Merkez", lat: 35.1803, lng: 33.3863 },
      { name: "Değirmenlik-Akıncılar", lat: 35.144, lng: 33.5321 },
      { name: "Gönyeli-Alayköy", lat: 35.2129, lng: 33.2172 },
    ],
  },
  {
    name: "Girne",
    lat: 35.3187,
    lng: 33.2951,
    towns: [
      { name: "Merkez", lat: 35.3173, lng: 33.3102 },
      { name: "Çatalköy-Esentepe", lat: 35.3183, lng: 33.4966 },
      { name: "Dikmen", lat: 35.2731, lng: 33.2984 },
      { name: "Lapta-Alsancak-Çamlıbel", lat: 35.3249, lng: 33.0871 },
    ],
  },
  {
    name: "Gazimağusa",
    lat: 35.2178,
    lng: 33.7728,
    towns: [
      { name: "Merkez", lat: 35.1286, lng: 33.9156 },
      { name: "Beyarmudu", lat: 35.0971, lng: 33.787 },
      { name: "Geçitkale-Serdarlı", lat: 35.2687, lng: 33.6596 },
      { name: "Mesarya", lat: 35.1516, lng: 33.6631 },
      { name: "Tatlısu", lat: 35.3797, lng: 33.7695 },
      { name: "Yeniboğaziçi", lat: 35.2314, lng: 33.784 },
    ],
  },
  {
    name: "Güzelyurt",
    lat: 35.1969,
    lng: 33.0229,
    towns: [{ name: "Merkez", lat: 35.197, lng: 33.0242 }],
  },
  {
    name: "İskele",
    lat: 35.4635,
    lng: 34.1929,
    towns: [
      { name: "Merkez", lat: 35.3313, lng: 33.9018 },
      { name: "Erenköy-Karpaz", lat: 35.5671, lng: 34.331 },
      { name: "Mehmetçik-Büyükkonuk", lat: 35.4115, lng: 34.0409 },
    ],
  },
  {
    name: "Lefke",
    lat: 35.1371,
    lng: 32.7919,
    towns: [{ name: "Merkez", lat: 35.1364, lng: 32.8514 }],
  },
]

export function isNorthernCyprus(country: string, countryCode = "") {
  if (countryCode.toLowerCase() === KKTC_CODE) return true
  const name = fold(country)
  return (
    name.includes("kuzey kibris") ||
    name.includes("northern cyprus") ||
    name.includes("turkish republic of northern cyprus")
  )
}

export function kktcDistrict(name: string) {
  const key = fold(name)
  return kktcDistricts.find((item) => fold(item.name) === key)
}

export function applyNorthernCyprus<T extends { country: string; countryCode: string; region: string; province: string; district: string; neighborhood: string }>(
  place: T,
  address: Record<string, string>,
) {
  if (!isNorthernCyprus(address.country || place.country, address.country_code || "")) return place
  const province = (address.district || address.state_district || address.county || "").replace(/\s+ilçesi$/iu, "").trim()
  const municipality = (address.municipality || "").replace(/\s+belediyesi$/iu, "").replace(/\s+türk$/iu, "").trim()
  const town = address.town || address.village || address.city || ""
  const district = municipality && fold(municipality) !== fold(province) ? municipality : ""
  const neighborhood = town && fold(town) !== fold(province) && fold(town) !== fold(district) ? town : place.neighborhood
  return {
    ...place,
    country: KKTC_NAME,
    countryCode: KKTC_CODE,
    region: kktcRegion.name,
    province: province || place.province,
    district,
    neighborhood: same(neighborhood, district) || same(neighborhood, province) ? "" : neighborhood,
  }
}

function same(left: string, right: string) {
  return Boolean(left && right && fold(left) === fold(right))
}
