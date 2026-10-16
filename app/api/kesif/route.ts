import { connection } from "next/server"
import {
  clampResults,
  countryCode,
  discoverCity,
  discoverQuery,
  languageCode,
  mapsSearchUrl,
  takeDiscoverSlot,
  type DiscoverPlace,
} from "@/lib/discover"

const stamps: number[] = []
const recent = new Map<string, { at: number; body: string }>()

type GooglePlace = {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  googleMapsUri?: string
  businessStatus?: string
}

function quiet(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, follow" } })
}

export async function GET(request: Request) {
  await connection()
  const url = new URL(request.url)
  const query = discoverQuery(url.searchParams.get("q") ?? "")
  const city = discoverCity(url.searchParams.get("sehir") ?? "")
  if (!query) return quiet({ ok: false, reason: "invalid", places: [] }, 400)
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim()
  if (!key) return quiet({ ok: false, reason: "unconfigured", places: [] })

  const now = Date.now()
  const slot = takeDiscoverSlot(stamps, now)
  stamps.splice(0, stamps.length, ...slot.stamps)
  if (!slot.ok) return quiet({ ok: false, reason: "quota", places: [] })

  const language = languageCode(url.searchParams.get("dil") ?? "tr")
  const region = countryCode(url.searchParams.get("ulke") ?? "TR")
  const pageSize = clampResults(Number(url.searchParams.get("adet") ?? "8"))
  const cacheKey = `${language}:${region}:${pageSize}:${query}:${city}`
  const cached = recent.get(cacheKey)
  if (cached && now - cached.at < 30_000) {
    return new Response(cached.body, { headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, follow" } })
  }

  const textQuery = city && !query.toLocaleLowerCase("tr-TR").includes(city.toLocaleLowerCase("tr-TR")) ? `${query} ${city}` : query
  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.businessStatus",
      },
      body: JSON.stringify({ textQuery, languageCode: language, regionCode: region, pageSize }),
      signal: AbortSignal.timeout(8000),
    })
    if (response.status === 429) return quiet({ ok: false, reason: "quota", places: [] })
    if (!response.ok) return quiet({ ok: false, reason: "unavailable", places: [] })
    const data = (await response.json()) as { places?: GooglePlace[] }
    const places: DiscoverPlace[] = (data.places ?? [])
      .filter((place) => place.businessStatus !== "CLOSED_PERMANENTLY")
      .map((place) => {
        const name = (place.displayName?.text ?? "").replace(/[\u0000-\u001F]/g, "").trim().slice(0, 120)
        const address = (place.formattedAddress ?? "").replace(/[\u0000-\u001F]/g, "").trim().slice(0, 180)
        const id = (place.id ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80)
        if (!name || !id) return null
        return {
          id,
          name,
          address,
          mapsUrl: place.googleMapsUri?.startsWith("https://") ? place.googleMapsUri : mapsSearchUrl(name, address),
          status: place.businessStatus === "OPERATIONAL" ? "open" : "unknown",
        }
      })
      .filter((place): place is DiscoverPlace => Boolean(place))
      .slice(0, pageSize)
    const body = JSON.stringify({ ok: true, source: "google", places })
    recent.set(cacheKey, { at: now, body })
    return new Response(body, { headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, follow" } })
  } catch {
    return quiet({ ok: false, reason: "unavailable", places: [] })
  }
}
