import { BUSINESSES } from "./businesses"
import type { Business } from "./types"

export function mergeCatalog(extra: Business[] = []): Business[] {
  const map = new Map<string, Business>()
  for (const b of [...BUSINESSES, ...extra]) map.set(b.slug, b)
  return [...map.values()]
}

export { BUSINESSES }
