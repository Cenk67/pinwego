"use client"

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { defaultPlace, isPlace, placeFromCity, type Place } from "@/lib/place"
import { allSectors, isSector, normalizeSector, seedSectors, setCustomSectors } from "@/lib/sectors"
import type { Business, Lead, Sector } from "@/lib/types"

type Persisted = {
  city: string
  place: Place
  saved: string[]
  requests: Lead[]
  listings: Business[]
  sectors: Sector[]
}

const STORAGE_KEY = "pinwego.v1"

const emptyState: Persisted = {
  city: "İstanbul",
  place: defaultPlace,
  saved: [],
  requests: [],
  listings: [],
  sectors: [],
}

let memory: Persisted = emptyState
let loaded = false
const listeners = new Set<() => void>()

function readStorage(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState
    const data = JSON.parse(raw) as Partial<Persisted>
    const city = typeof data.city === "string" ? data.city : emptyState.city
    const place = isPlace(data.place) ? data.place : placeFromCity(city)
    const sectors = Array.isArray(data.sectors) ? data.sectors.filter(isSector).filter((item) => item.custom) : []
    setCustomSectors(sectors)
    return {
      city: place.province || city,
      place,
      saved: Array.isArray(data.saved) ? data.saved : [],
      requests: Array.isArray(data.requests) ? data.requests : [],
      listings: Array.isArray(data.listings) ? data.listings : [],
      sectors,
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return emptyState
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  if (!loaded) {
    loaded = true
    memory = readStorage()
  }
  return memory
}

function getServerSnapshot() {
  return emptyState
}

function commit(next: Persisted) {
  const sectors = next.sectors.filter((item) => item.custom)
  memory = { ...next, sectors }
  loaded = true
  setCustomSectors(sectors)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memory))
  listeners.forEach((listener) => listener())
}

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

type DirectoryState = {
  city: string
  place: Place
  setPlace: (place: Place) => void
  setCity: (city: string) => void
  saved: string[]
  isSaved: (id: string) => boolean
  toggleSaved: (id: string) => void
  requests: Lead[]
  addRequest: (lead: Lead) => void
  listings: Business[]
  addListing: (business: Business) => void
  sectors: Sector[]
  addSector: (draft: Partial<Sector>) => Sector | null
  removeSector: (id: string) => void
  assistantOpen: boolean
  setAssistantOpen: (open: boolean) => void
  ready: boolean
}

const DirectoryContext = createContext<DirectoryState | null>(null)

export function DirectoryProvider({ children }: { children: ReactNode }) {
  const persisted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const ready = useHydrated()

  const value = useMemo<DirectoryState>(
    () => ({
      city: persisted.place.province || persisted.city,
      place: persisted.place,
      setPlace: (place) => {
        const current = getSnapshot()
        commit({ ...current, place, city: place.province || place.country || current.city })
      },
      setCity: (city) => {
        const place = placeFromCity(city)
        commit({ ...getSnapshot(), city: place.province, place })
      },
      saved: persisted.saved,
      isSaved: (id) => persisted.saved.includes(id),
      toggleSaved: (id) => {
        const current = getSnapshot()
        commit({
          ...current,
          saved: current.saved.includes(id)
            ? current.saved.filter((item) => item !== id)
            : [id, ...current.saved],
        })
      },
      requests: persisted.requests,
      addRequest: (lead) => {
        const current = getSnapshot()
        commit({ ...current, requests: [lead, ...current.requests] })
      },
      listings: persisted.listings,
      addListing: (business) => {
        const current = getSnapshot()
        commit({ ...current, listings: [business, ...current.listings] })
      },
      sectors: ready ? allSectors() : seedSectors,
      addSector: (draft) => {
        const current = getSnapshot()
        const taken = allSectors().map((item) => item.id)
        const sector = normalizeSector(draft, taken)
        if (!sector) return null
        commit({ ...current, sectors: [sector, ...current.sectors.filter((item) => item.id !== sector.id)] })
        return sector
      },
      removeSector: (id) => {
        const current = getSnapshot()
        commit({ ...current, sectors: current.sectors.filter((item) => item.id !== id) })
      },
      assistantOpen,
      setAssistantOpen,
      ready,
    }),
    [persisted, assistantOpen, ready],
  )

  return <DirectoryContext.Provider value={value}>{children}</DirectoryContext.Provider>
}

export function useDirectory() {
  const value = useContext(DirectoryContext)
  if (!value) throw new Error("pinwego sağlayıcısı bulunamadı")
  return value
}
