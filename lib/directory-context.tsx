"use client"

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import type { Business, Lead } from "@/lib/types"

type Persisted = {
  city: string
  saved: string[]
  requests: Lead[]
  listings: Business[]
}

const STORAGE_KEY = "pinora.v1"

const emptyState: Persisted = {
  city: "İstanbul",
  saved: [],
  requests: [],
  listings: [],
}

let memory: Persisted = emptyState
let loaded = false
const listeners = new Set<() => void>()

function readStorage(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState
    const data = JSON.parse(raw) as Partial<Persisted>
    return {
      city: typeof data.city === "string" ? data.city : emptyState.city,
      saved: Array.isArray(data.saved) ? data.saved : [],
      requests: Array.isArray(data.requests) ? data.requests : [],
      listings: Array.isArray(data.listings) ? data.listings : [],
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
  memory = next
  loaded = true
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
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
  setCity: (city: string) => void
  saved: string[]
  isSaved: (id: string) => boolean
  toggleSaved: (id: string) => void
  requests: Lead[]
  addRequest: (lead: Lead) => void
  listings: Business[]
  addListing: (business: Business) => void
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
      city: persisted.city,
      setCity: (city) => commit({ ...getSnapshot(), city }),
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
  if (!value) throw new Error("Pinora sağlayıcısı bulunamadı")
  return value
}
