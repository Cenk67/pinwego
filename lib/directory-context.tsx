"use client"

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { allBusinesses } from "@/lib/catalog"
import { defaultPlace, isPlace, placeFromCity, type Place } from "@/lib/place"
import { allSectors, isSector, normalizeSector, seedSectors, setCustomSectors } from "@/lib/sectors"
import type { Business, BusinessOverride, Lead, Sector } from "@/lib/types"

type Persisted = {
  city: string
  place: Place
  saved: string[]
  requests: Lead[]
  listings: Business[]
  sectors: Sector[]
  hiddenBusinessIds: string[]
  hiddenSectorIds: string[]
  businessOverrides: Record<string, BusinessOverride>
}

const STORAGE_KEY = "pinwego.v1"

const emptyState: Persisted = {
  city: "İstanbul",
  place: defaultPlace,
  saved: [],
  requests: [],
  listings: [],
  sectors: [],
  hiddenBusinessIds: [],
  hiddenSectorIds: [],
  businessOverrides: {},
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
    const businessOverrides =
      data.businessOverrides && typeof data.businessOverrides === "object" && !Array.isArray(data.businessOverrides)
        ? (data.businessOverrides as Record<string, BusinessOverride>)
        : {}
    return {
      city: place.province || city,
      place,
      saved: Array.isArray(data.saved) ? data.saved : [],
      requests: Array.isArray(data.requests) ? data.requests : [],
      listings: Array.isArray(data.listings) ? data.listings : [],
      sectors,
      hiddenBusinessIds: Array.isArray(data.hiddenBusinessIds) ? data.hiddenBusinessIds.filter((id) => typeof id === "string") : [],
      hiddenSectorIds: Array.isArray(data.hiddenSectorIds) ? data.hiddenSectorIds.filter((id) => typeof id === "string") : [],
      businessOverrides,
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
  memory = {
    ...emptyState,
    ...next,
    sectors,
    hiddenBusinessIds: next.hiddenBusinessIds ?? [],
    hiddenSectorIds: next.hiddenSectorIds ?? [],
    businessOverrides: next.businessOverrides ?? {},
  }
  loaded = true
  setCustomSectors(sectors)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memory))
  listeners.forEach((listener) => listener())
}

function decorateBusiness(business: Business, overrides: Record<string, BusinessOverride>) {
  const patch = overrides[business.id] ?? overrides[business.slug]
  return patch ? { ...business, ...patch } : business
}

function isHiddenBusiness(business: Business, hidden: string[], hiddenSectors: string[]) {
  return hidden.includes(business.id) || hidden.includes(business.slug) || hiddenSectors.includes(business.category)
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
  removeListing: (id: string) => void
  patchBusiness: (id: string, patch: BusinessOverride) => void
  hideBusiness: (id: string, hidden: boolean) => void
  isBusinessHidden: (business: Business) => boolean
  visibleBusinesses: Business[]
  managedBusinesses: Business[]
  sectors: Sector[]
  managedSectors: Sector[]
  addSector: (draft: Partial<Sector>) => Sector | null
  removeSector: (id: string) => void
  hideSector: (id: string, hidden: boolean) => void
  hiddenSectorIds: string[]
  removeRequest: (id: string) => void
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
        commit({ ...current, listings: [business, ...current.listings.filter((item) => item.slug !== business.slug)] })
      },
      removeListing: (id) => {
        const current = getSnapshot()
        const rest = { ...current.businessOverrides }
        delete rest[id]
        commit({
          ...current,
          listings: current.listings.filter((item) => item.id !== id && item.slug !== id),
          hiddenBusinessIds: current.hiddenBusinessIds.filter((item) => item !== id),
          businessOverrides: rest,
        })
      },
      patchBusiness: (id, patch) => {
        const current = getSnapshot()
        const listings = current.listings.map((item) =>
          item.id === id || item.slug === id ? { ...item, ...patch } : item,
        )
        commit({
          ...current,
          listings,
          businessOverrides: {
            ...current.businessOverrides,
            [id]: { ...current.businessOverrides[id], ...patch },
          },
        })
      },
      hideBusiness: (id, hidden) => {
        const current = getSnapshot()
        const ids = current.hiddenBusinessIds.filter((item) => item !== id)
        commit({ ...current, hiddenBusinessIds: hidden ? [id, ...ids] : ids })
      },
      isBusinessHidden: (business) =>
        isHiddenBusiness(business, persisted.hiddenBusinessIds, persisted.hiddenSectorIds),
      visibleBusinesses: allBusinesses(persisted.listings)
        .map((item) => decorateBusiness(item, persisted.businessOverrides))
        .filter((item) => item.profile?.published !== false)
        .filter((item) => !isHiddenBusiness(item, persisted.hiddenBusinessIds, persisted.hiddenSectorIds)),
      managedBusinesses: allBusinesses(persisted.listings).map((item) =>
        decorateBusiness(item, persisted.businessOverrides),
      ),
      sectors: (ready ? allSectors() : seedSectors).filter((item) => !persisted.hiddenSectorIds.includes(item.id)),
      managedSectors: ready ? allSectors() : seedSectors,
      addSector: (draft) => {
        const current = getSnapshot()
        const taken = allSectors().map((item) => item.id)
        const sector = normalizeSector(draft, taken)
        if (!sector) return null
        commit({
          ...current,
          sectors: [sector, ...current.sectors.filter((item) => item.id !== sector.id)],
          hiddenSectorIds: current.hiddenSectorIds.filter((item) => item !== sector.id),
        })
        return sector
      },
      removeSector: (id) => {
        const current = getSnapshot()
        commit({
          ...current,
          sectors: current.sectors.filter((item) => item.id !== id),
          hiddenSectorIds: current.hiddenSectorIds.filter((item) => item !== id),
        })
      },
      hideSector: (id, hidden) => {
        const current = getSnapshot()
        const ids = current.hiddenSectorIds.filter((item) => item !== id)
        commit({ ...current, hiddenSectorIds: hidden ? [id, ...ids] : ids })
      },
      hiddenSectorIds: persisted.hiddenSectorIds,
      removeRequest: (id) => {
        const current = getSnapshot()
        commit({ ...current, requests: current.requests.filter((item) => item.id !== id) })
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
