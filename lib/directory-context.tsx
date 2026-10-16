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
import { keepListingMedia } from "@/lib/listing-media"
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
  startRemote()
  return () => listeners.delete(listener)
}

function getSnapshot() {
  if (!loaded) {
    loaded = true
    memory = readStorage()
    rebuild()
  }
  return snapshot
}

function getServerSnapshot() {
  return serverSnapshot
}

function withoutBinary(value: string) {
  return value.startsWith("data:") ? "" : value
}

function leanBusiness(business: Business): Business {
  const photo = withoutBinary(business.photo) || "/photos/office.jpg"
  if (!business.profile) return { ...business, photo }
  return {
    ...business,
    photo,
    profile: {
      ...business.profile,
      gallery: business.profile.gallery
        .map((item) => ({ ...item, image: withoutBinary(item.image) }))
        .filter((item) => item.image),
      services: business.profile.services.map((item) => ({ ...item, image: withoutBinary(item.image) })),
    },
  }
}

function leanState(state: Persisted): Persisted {
  const businessOverrides: Record<string, BusinessOverride> = {}
  for (const [id, patch] of Object.entries(state.businessOverrides)) {
    const profile = patch.profile
    businessOverrides[id] = {
      ...patch,
      photo: patch.photo ? withoutBinary(patch.photo) || undefined : patch.photo,
      profile: profile
        ? {
            ...profile,
            gallery: profile.gallery.map((item) => ({ ...item, image: withoutBinary(item.image) })).filter((item) => item.image),
            services: profile.services.map((item) => ({ ...item, image: withoutBinary(item.image) })),
          }
        : profile,
    }
  }
  return { ...state, listings: state.listings.map(leanBusiness), businessOverrides }
}

function commit(next: Persisted) {
  const sectors = next.sectors.filter((item) => item.custom)
  memory = {
    city: next.city,
    place: next.place,
    saved: next.saved,
    requests: next.requests,
    listings: next.listings,
    sectors,
    hiddenBusinessIds: next.hiddenBusinessIds ?? [],
    hiddenSectorIds: next.hiddenSectorIds ?? [],
    businessOverrides: next.businessOverrides ?? {},
  }
  loaded = true
  setCustomSectors(sectors)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leanState(memory)))
  } catch {
    try {
      const slim = leanState(memory)
      slim.listings = slim.listings.map((item) => ({ ...item, profile: undefined }))
      slim.businessOverrides = {}
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim))
    } catch {
      // The open tab keeps the record even when the browser cannot store the photos.
    }
  }
  rebuild()
  listeners.forEach((listener) => listener())
}

function decorateBusiness(business: Business, overrides: Record<string, BusinessOverride>) {
  const patch = overrides[business.id] ?? overrides[business.slug]
  return patch ? keepListingMedia(business, { ...business, ...patch }) : business
}

function isHiddenBusiness(business: Business, hidden: string[], hiddenSectors: string[], remoteHidden: string[]) {
  return (
    hidden.includes(business.id) ||
    hidden.includes(business.slug) ||
    remoteHidden.includes(business.id) ||
    remoteHidden.includes(business.slug) ||
    hiddenSectors.includes(business.category)
  )
}

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

type Snapshot = Persisted & {
  remoteListings: Business[]
  remoteHiddenIds: string[]
  remoteReady: boolean
}

const serverSnapshot: Snapshot = {
  ...emptyState,
  remoteListings: [],
  remoteHiddenIds: [],
  remoteReady: false,
}

let remoteListings: Business[] = []
let remoteHiddenIds: string[] = []
let remoteReady = false
let remoteStarted = false
let snapshot: Snapshot = serverSnapshot

function isListingRow(value: unknown): value is Business {
  if (!value || typeof value !== "object") return false
  const row = value as Partial<Business>
  return (
    typeof row.slug === "string" &&
    typeof row.name === "string" &&
    row.source === "senin" &&
    Array.isArray(row.services) &&
    Array.isArray(row.tags) &&
    Array.isArray(row.reviews) &&
    Array.isArray(row.amenities) &&
    Array.isArray(row.hours)
  )
}

function rebuild() {
  snapshot = { ...memory, remoteListings, remoteHiddenIds, remoteReady }
}

function startRemote() {
  if (remoteStarted || typeof fetch !== "function") return
  remoteStarted = true
  void fetch("/api/ilan", { credentials: "include" })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      const rows = Array.isArray(data?.listings) ? data.listings.filter(isListingRow) : []
      const hidden = Array.isArray(data?.hiddenIds) ? data.hiddenIds.filter((id: unknown) => typeof id === "string") : []
      remoteListings = rows
      remoteHiddenIds = hidden
      remoteReady = true
      rebuild()
      listeners.forEach((listener) => listener())
    })
    .catch(() => {
      remoteReady = true
      rebuild()
      listeners.forEach((listener) => listener())
    })
}

function mergeListings(local: Business[], incoming: Business[]) {
  const seen = new Set(incoming.map((item) => item.slug))
  return [...incoming, ...local.filter((item) => !seen.has(item.slug))]
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
  rememberListing: (business: Business) => void
  forgetListing: (id: string) => void
  rememberHidden: (id: string, hidden: boolean) => void
  removeListing: (id: string) => void
  patchBusiness: (id: string, patch: BusinessOverride) => void
  hideBusiness: (id: string, hidden: boolean) => void
  isBusinessHidden: (business: Business) => boolean
  visibleBusinesses: Business[]
  managedBusinesses: Business[]
  remoteReady: boolean
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
      rememberListing: (business) => {
        const previous = remoteListings.find((item) => item.id === business.id || item.slug === business.slug)
        const next = keepListingMedia(previous, business)
        remoteListings = [next, ...remoteListings.filter((item) => item.slug !== business.slug && item.id !== business.id)]
        remoteReady = true
        rebuild()
        listeners.forEach((listener) => listener())
      },
      forgetListing: (id) => {
        remoteListings = remoteListings.filter((item) => item.id !== id && item.slug !== id)
        remoteHiddenIds = remoteHiddenIds.filter((item) => item !== id)
        rebuild()
        listeners.forEach((listener) => listener())
      },
      rememberHidden: (id, hidden) => {
        remoteHiddenIds = hidden ? [id, ...remoteHiddenIds.filter((item) => item !== id)] : remoteHiddenIds.filter((item) => item !== id)
        rebuild()
        listeners.forEach((listener) => listener())
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
        isHiddenBusiness(business, persisted.hiddenBusinessIds, persisted.hiddenSectorIds, persisted.remoteHiddenIds),
      visibleBusinesses: allBusinesses(mergeListings(persisted.listings, persisted.remoteListings))
        .map((item) => decorateBusiness(item, persisted.businessOverrides))
        .filter((item) => item.profile?.published !== false)
        .filter((item) => !isHiddenBusiness(item, persisted.hiddenBusinessIds, persisted.hiddenSectorIds, persisted.remoteHiddenIds)),
      managedBusinesses: allBusinesses(mergeListings(persisted.listings, persisted.remoteListings)).map((item) =>
        decorateBusiness(item, persisted.businessOverrides),
      ),
      remoteReady: persisted.remoteReady,
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
