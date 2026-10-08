import { turkeyProvince, turkeyRegion, turkeyRegions } from "@/lib/turkey-areas"
import type { AreaOption, Place } from "@/lib/place"

type Slot = "region" | "province" | "district" | "neighborhood"

type CacheEntry = { at: number; body: unknown }
const cache = new Map<string, CacheEntry>()
let nominatimAt = 0

const PLACE_VALUES = new Set(["suburb", "neighbourhood", "quarter", "residential", "locality", "district"])
const LETTERS = "abcçdefgğhıijklmnoöprsştuüvyzwxqj".split("")

function cached<T>(key: string, maxAgeMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < maxAgeMs) return Promise.resolve(hit.body as T)
  return load().then((body) => {
    cache.set(key, { at: Date.now(), body })
    return body
  })
}

async function nominatim(path: string) {
  const wait = Math.max(0, 1100 - (Date.now() - nominatimAt))
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait))
  nominatimAt = Date.now()
  const response = await fetch(`https://nominatim.openstreetmap.org/${path}`, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "tr",
      "User-Agent": "pinwego/1.0 (local business directory demo)",
    },
    signal: AbortSignal.timeout(12000),
  })
  if (!response.ok) throw new Error("Konum servisi yanıt vermedi.")
  return response.json()
}

type NominatimItem = {
  lat?: string
  lon?: string
  display_name?: string
  category?: string
  type?: string
  addresstype?: string
  address?: Record<string, string>
}

const AREA_TYPES = new Set([
  "country",
  "state",
  "province",
  "region",
  "city",
  "town",
  "village",
  "municipality",
  "county",
  "suburb",
  "quarter",
  "neighbourhood",
  "administrative",
  "city_district",
])

function text(address: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    if (address[key]) return address[key]
  }
  return ""
}

export function placeFromNominatim(item: NominatimItem, nearMe = false): Place | null {
  const lat = Number(item.lat)
  const lng = Number(item.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const address = item.address ?? {}
  const country = text(address, "country")
  const region = text(address, "region", "state_district")
  const province = text(address, "province", "state", "city")
  let district = text(address, "town", "city_district", "county", "municipality", "city")
  let neighborhood = text(address, "quarter", "suburb", "neighbourhood", "village", "hamlet")
  if (samePlace(district, province)) district = ""
  if (samePlace(neighborhood, district) || samePlace(neighborhood, province)) neighborhood = ""
  const parts = [neighborhood, district, province, region, country].filter(Boolean)
  return {
    label: nearMe ? "Yakınımdakiler" : parts.slice(0, 2).join(", ") || item.display_name || "Konum",
    country,
    countryCode: (address.country_code || "").toLowerCase(),
    region,
    province,
    district,
    neighborhood,
    lat,
    lng,
    nearMe,
  }
}

export function loose(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
}

function samePlace(left: string, right: string) {
  if (!left || !right) return false
  return loose(left) === loose(right)
}

function option(name: string, lat: number, lng: number, adminLevel: number): AreaOption {
  return { name, lat, lng, osmId: 0, adminLevel }
}

function uniqueOptions(options: AreaOption[]) {
  const seen = new Set<string>()
  return options
    .filter((item) => {
      const key = loose(item.name)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => a.name.localeCompare(b.name, "tr"))
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "pinwego/1.0 (local business directory demo)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error("Bölge servisi yanıt vermedi.")
  return response.json() as Promise<{ error?: boolean; data?: unknown }>
}

async function countryDirectory() {
  return cached("iso-countries", 1000 * 60 * 60 * 24, async () => {
    const body = await fetchJson("https://countriesnow.space/api/v0.1/countries/iso")
    const map: Record<string, string> = {}
    if (Array.isArray(body.data)) {
      for (const row of body.data) {
        if (row && typeof row === "object" && "Iso2" in row && "name" in row) {
          map[String(row.Iso2).toUpperCase()] = String(row.name)
        }
      }
    }
    return map
  })
}

async function englishCountry(code: string) {
  const upper = code.toUpperCase()
  try {
    const map = await countryDirectory()
    if (map[upper]) return map[upper]
  } catch {
    // The public list is optional. A fixed English name still reaches the same service.
  }
  const aliases: Record<string, string> = {
    TR: "Turkey",
    US: "United States",
    GB: "United Kingdom",
    KR: "South Korea",
    RU: "Russia",
    CZ: "Czech Republic",
  }
  if (aliases[upper]) return aliases[upper]
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(upper) || upper
  } catch {
    return upper
  }
}

async function stateNames(countryName: string) {
  const body = await fetchJson(
    `https://countriesnow.space/api/v0.1/countries/states/q?country=${encodeURIComponent(countryName)}`,
  )
  const data = body.data
  if (!data || typeof data !== "object" || !("states" in data) || !Array.isArray(data.states)) return []
  return data.states
    .map((item) => (item && typeof item === "object" && "name" in item ? String(item.name) : ""))
    .filter(Boolean)
}

async function cityNames(countryName: string, state: string) {
  const body = await fetchJson(
    `https://countriesnow.space/api/v0.1/countries/state/cities/q?country=${encodeURIComponent(countryName)}&state=${encodeURIComponent(state)}`,
  )
  return Array.isArray(body.data) ? body.data.map((item) => String(item)).filter(Boolean) : []
}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    name?: string
    city?: string
    county?: string
    district?: string
    state?: string
    locality?: string
    osm_key?: string
    osm_value?: string
  }
}

function cleanName(name: string) {
  return name.replace(/\s+mahallesi$/i, "").replace(/\s+mah\.?$/i, "").trim()
}

function matchesParent(feature: PhotonFeature, parent: string) {
  if (!parent) return true
  const props = feature.properties ?? {}
  const fields = [props.city, props.county, props.district, props.locality, props.state].filter(Boolean) as string[]
  const target = loose(parent)
  return fields.some((field) => {
    const value = loose(field)
    return value === target || value.includes(target) || target.includes(value)
  })
}

async function photonLetter(letter: string, lat: number, lng: number) {
  const minLat = (lat - 0.15).toFixed(4)
  const maxLat = (lat + 0.15).toFixed(4)
  const minLng = (lng - 0.2).toFixed(4)
  const maxLng = (lng + 0.2).toFixed(4)
  const url =
    "https://photon.komoot.io/api/?q=" +
    encodeURIComponent(letter) +
    `&lat=${lat}&lon=${lng}&limit=30&lang=en&bbox=${minLng},${minLat},${maxLng},${maxLat}` +
    "&osm_tag=place:suburb&osm_tag=place:neighbourhood&osm_tag=place:quarter"
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "pinwego/1.0 (local business directory demo)" },
    signal: AbortSignal.timeout(12000),
  })
  if (!response.ok) return [] as PhotonFeature[]
  const body = (await response.json()) as { features?: PhotonFeature[] }
  return body.features ?? []
}

async function placesAround(lat: number, lng: number, parent: string) {
  const features: PhotonFeature[] = []
  let cursor = 0
  async function worker() {
    while (cursor < LETTERS.length) {
      const letter = LETTERS[cursor]
      cursor += 1
      try {
        features.push(...(await photonLetter(letter, lat, lng)))
      } catch {
        // One letter failing still leaves the rest of the neighborhood list.
      }
    }
  }
  await Promise.all(Array.from({ length: 8 }, () => worker()))
  const named = features.filter((feature) => {
    const props = feature.properties
    if (!props?.name) return false
    if (props.osm_key && props.osm_key !== "place") return false
    if (props.osm_value && !PLACE_VALUES.has(props.osm_value)) return false
    return true
  })
  const matched = named.filter((feature) => matchesParent(feature, parent))
  const pool = matched.length >= 2 ? matched : named
  const options = pool
    .map((feature) => {
      const [featureLng, featureLat] = feature.geometry?.coordinates ?? [0, 0]
      const name = cleanName(feature.properties?.name || "")
      if (!name || samePlace(name, parent) || /^\d+$/.test(name)) return null
      if (!Number.isFinite(featureLat) || !Number.isFinite(featureLng)) return null
      return option(name, featureLat, featureLng, 9)
    })
    .filter((item): item is AreaOption => Boolean(item))
  return uniqueOptions(options).slice(0, 60)
}

function isArea(item: NominatimItem) {
  return (
    AREA_TYPES.has(item.type || "") ||
    AREA_TYPES.has(item.addresstype || "") ||
    item.category === "boundary" ||
    item.category === "place"
  )
}

function preferPlace(items: NominatimItem[], hint: string) {
  const head = loose(hint.split(",")[0] || "")
  const rows = items
    .map((item) => ({ item, place: placeFromNominatim(item) }))
    .filter((row): row is { item: NominatimItem; place: Place } => Boolean(row.place))
  const areas = rows.filter((row) => isArea(row.item))
  const pool = areas.length ? areas : rows
  const named = pool.find((row) => loose(`${row.place.region} ${row.place.province} ${row.item.display_name || ""}`).includes(head))
  return (named || pool[0])?.place ?? null
}

async function pointFor(query: string, country: string) {
  const filter = country ? `&countrycodes=${encodeURIComponent(country.toLowerCase())}` : ""
  const items = (await nominatim(
    `search?format=jsonv2&addressdetails=1&limit=6${filter}&q=${encodeURIComponent(query)}`,
  )) as NominatimItem[]
  const place = preferPlace(items, query)
  return place ? { lat: place.lat, lng: place.lng } : null
}

async function citiesFromGeocoder(region: string, country: string) {
  const filter = country ? `&countrycodes=${encodeURIComponent(country.toLowerCase())}` : ""
  const items = (await nominatim(
    `search?format=jsonv2&addressdetails=1&limit=25&featureType=city${filter}&q=${encodeURIComponent(region)}`,
  )) as NominatimItem[]
  return uniqueOptions(
    items
      .map((item) => {
        const place = placeFromNominatim(item)
        if (!place || !isArea(item)) return null
        const name = place.province || place.district || place.label
        if (!name || samePlace(name, region)) return null
        return option(name, place.lat, place.lng, 4)
      })
      .filter((item): item is AreaOption => Boolean(item)),
  )
}

function finitePoint(lat: string, lng: string) {
  const latitude = Number(lat)
  const longitude = Number(lng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (latitude === 0 && longitude === 0) return null
  return { lat: latitude, lng: longitude }
}

async function divisions(url: URL) {
  const level = (url.searchParams.get("level") || "") as Slot
  const country = (url.searchParams.get("country") || "").toLowerCase()
  const countryName = url.searchParams.get("countryName")?.trim() || ""
  const region = url.searchParams.get("region")?.trim() || ""
  const province = url.searchParams.get("province")?.trim() || ""
  const district = url.searchParams.get("district")?.trim() || ""
  const given = finitePoint(url.searchParams.get("lat") || "", url.searchParams.get("lng") || "")

  if (level === "region") {
    if (country === "tr") {
      return {
        slot: "region" as const,
        options: turkeyRegions.map((item) => option(item.name, item.lat, item.lng, 3)),
      }
    }
    const states = await stateNames(await englishCountry(country))
    return { slot: "region" as const, options: uniqueOptions(states.map((item) => option(item, 0, 0, 3))).slice(0, 400) }
  }

  if (level === "province") {
    if (country === "tr") {
      const match = turkeyRegion(region)
      const provinces = match ? match.provinces : turkeyRegions.flatMap((item) => item.provinces)
      return {
        slot: "province" as const,
        options: provinces.map((item) => option(item.name, item.lat, item.lng, 4)),
      }
    }
    const name = await englishCountry(country)
    const cities = region ? await cityNames(name, region) : []
    let center = given
    if (!center && region) center = await pointFor([region, name].filter(Boolean).join(", "), country)
    if (!cities.length && region) {
      const found = await citiesFromGeocoder(region, country)
      if (found.length) {
        return { slot: "province" as const, options: found, center: given ? undefined : center }
      }
    }
    return {
      slot: "province" as const,
      options: uniqueOptions(cities.map((item) => option(item, 0, 0, 4))).slice(0, 1500),
      center: given ? undefined : center,
    }
  }

  if (level === "district") {
    if (country === "tr") {
      const match = turkeyProvince(province)
      const state = match?.state || (province ? `${province} Province` : "")
      const cities = state ? await cityNames("Turkey", state) : []
      return {
        slot: "district" as const,
        options: uniqueOptions(
          cities.filter((item) => !samePlace(item, province)).map((item) => option(item, 0, 0, 6)),
        ).slice(0, 400),
      }
    }
    let center = given
    if (!center) {
      center = await pointFor(
        [province, region, countryName || (await englishCountry(country))].filter(Boolean).join(", "),
        country,
      )
    }
    const options = center ? await placesAround(center.lat, center.lng, province) : []
    return { slot: "district" as const, options, center: given ? undefined : center }
  }

  if (level === "neighborhood") {
    let center = given
    if (!center) {
      const name = country === "tr" ? "Türkiye" : countryName || (await englishCountry(country))
      center = await pointFor([district, province, region, name].filter(Boolean).join(", "), country)
    }
    const parent = district || province
    const options = center ? await placesAround(center.lat, center.lng, parent) : []
    return { slot: "neighborhood" as const, options, center: given ? undefined : center }
  }

  return { slot: "region" as const, options: [] as AreaOption[] }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = url.searchParams.get("q")?.trim() ?? ""
  const lat = url.searchParams.get("lat")
  const lng = url.searchParams.get("lng")
  const country = url.searchParams.get("country")?.trim().toLowerCase() ?? ""
  const level = url.searchParams.get("level")?.trim() ?? ""

  try {
    if (level) {
      const key = `div:v3:${level}:${country}:${url.searchParams.get("region") || ""}:${url.searchParams.get("province") || ""}:${url.searchParams.get("district") || ""}:${lat || ""}:${lng || ""}`
      const body = await cached(key, 1000 * 60 * 60 * 12, () => divisions(url))
      return Response.json(body)
    }

    if (lat && lng && !query) {
      const place = await cached(`rev:${lat}:${lng}`, 1000 * 60 * 60, async () => {
        const item = (await nominatim(
          `reverse?format=jsonv2&addressdetails=1&zoom=16&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`,
        )) as NominatimItem
        return placeFromNominatim(item, true)
      })
      if (!place) return Response.json({ error: "Bu nokta çözülemedi." }, { status: 404 })
      return Response.json(place)
    }

    if (!query) return Response.json({ error: "Arama boş." }, { status: 400 })
    const countryFilter = country ? `&countrycodes=${encodeURIComponent(country)}` : ""
    const places = await cached(`q:${country}:${query}`, 1000 * 60 * 30, async () => {
      const items = (await nominatim(
        `search?format=jsonv2&addressdetails=1&limit=6${countryFilter}&q=${encodeURIComponent(query)}`,
      )) as NominatimItem[]
      return items.map((item) => placeFromNominatim(item)).filter((item): item is Place => Boolean(item))
    })
    return Response.json(places)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Konum servisi şu an yanıt vermiyor."
    return Response.json({ error: message }, { status: 502 })
  }
}
