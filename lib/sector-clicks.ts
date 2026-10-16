const STORAGE_KEY = "pinwego.sector-clicks.v1"
const EMPTY: Record<string, number> = {}

let counts: Record<string, number> = EMPTY
let loaded = false
const listeners = new Set<() => void>()

function read(): Record<string, number> {
  if (loaded) return counts
  loaded = true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const data = raw ? (JSON.parse(raw) as unknown) : null
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      counts = EMPTY
      return counts
    }
    const next: Record<string, number> = {}
    for (const [id, value] of Object.entries(data)) {
      if (typeof value === "number" && value > 0) next[id] = value
    }
    counts = next
  } catch {
    counts = EMPTY
  }
  return counts
}

export function getSectorClicks() {
  return read()
}

export function getServerSectorClicks() {
  return EMPTY
}

export function subscribeSectorClicks(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function recordSectorClick(id: string) {
  const next = { ...read(), [id]: (read()[id] ?? 0) + 1 }
  counts = next
  loaded = true
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  listeners.forEach((listener) => listener())
}

export function rankSectors<T extends { id: string }>(items: T[], clicks: Record<string, number>) {
  return items
    .map((item, index) => ({ item, index, clicks: clicks[item.id] ?? 0 }))
    .sort((left, right) => right.clicks - left.clicks || left.index - right.index)
    .map((row) => row.item)
}
