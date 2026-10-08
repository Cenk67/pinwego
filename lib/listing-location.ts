import { fold } from "./format"
import type { Place } from "./place"

export function businessArea(place: Place) {
  const city = place.province || place.region || place.country || "Konum"
  const district = place.neighborhood || place.district || place.province || city
  return { city, district }
}

function distinctArea(parts: string[]) {
  const kept: string[] = []
  for (const part of parts) {
    const folded = fold(part)
    if (!folded) continue
    const overlap = kept.findIndex((item) => {
      const other = fold(item)
      return other.includes(folded) || folded.includes(other)
    })
    if (overlap === -1) {
      kept.push(part)
      continue
    }
    if (fold(kept[overlap]).length < folded.length) kept[overlap] = part
  }
  return kept
}

export function openAddress(street: string, place: Place) {
  const written = street.trim()
  const folded = fold(written)
  const area = distinctArea(
    [place.neighborhood, place.district, place.province, place.country].filter((part) => part && !folded.includes(fold(part))),
  )
  return [written, ...area].filter(Boolean).join(", ")
}

export function placeReady(place: Place) {
  return Number.isFinite(place.lat) && Number.isFinite(place.lng) && (place.lat !== 0 || place.lng !== 0) && Boolean(place.province || place.district || place.neighborhood)
}
