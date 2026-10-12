"use client"

import { useSyncExternalStore } from "react"
import {
  defaultDiscoverSettings,
  normalizeSettings,
  type DiscoverEvent,
  type DiscoverSettings,
} from "@/lib/discover"

const STORAGE_KEY = "pinwego.discover.v1"

type Persisted = { settings: DiscoverSettings; events: DiscoverEvent[] }

const serverState: Persisted = { settings: defaultDiscoverSettings, events: [] }
let memory: Persisted = serverState
let loaded = false
const listeners = new Set<() => void>()

function isEvent(value: unknown): value is DiscoverEvent {
  if (!value || typeof value !== "object") return false
  const row = value as Partial<DiscoverEvent>
  return typeof row.type === "string" && typeof row.q === "string" && typeof row.at === "string"
}

function readStorage(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return serverState
    const data = JSON.parse(raw) as Partial<Persisted>
    return {
      settings: normalizeSettings(data.settings),
      events: Array.isArray(data.events) ? data.events.filter(isEvent).slice(-200) : [],
    }
  } catch {
    return serverState
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
  return serverState
}

function commit(next: Persisted) {
  memory = { settings: next.settings, events: next.events.slice(-200) }
  loaded = true
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory))
  } catch {
    // The browser quota can fill. Keep the in-memory copy.
  }
  listeners.forEach((listener) => listener())
}

export function useDiscoverSettings() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot).settings
}

export function useDiscoverEvents() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot).events
}

export function saveDiscoverSettings(settings: DiscoverSettings) {
  commit({ ...getSnapshot(), settings: normalizeSettings(settings) })
}

export function recordDiscoverEvent(event: Omit<DiscoverEvent, "at">, now = Date.now()) {
  const current = getSnapshot()
  const day = new Date(now).toISOString().slice(0, 10)
  if (event.type === "pinwego_miss" || event.type === "places_request" || event.type === "places_result") {
    const mark = `pinwego.discover.${event.type}.${event.q}.${event.city}.${day}`
    try {
      if (sessionStorage.getItem(mark)) return false
      sessionStorage.setItem(mark, "1")
    } catch {
      return false
    }
  }
  const row: DiscoverEvent = { ...event, q: event.q.slice(0, 80), city: event.city.slice(0, 60), at: new Date(now).toISOString() }
  commit({ ...current, events: [...current.events, row] })
  return true
}

export function rememberDiscoverLead() {
  try {
    sessionStorage.setItem("pinwego.discover.lead", "1")
  } catch {
    // The register page still opens.
  }
}

export function takeDiscoverLead() {
  try {
    if (sessionStorage.getItem("pinwego.discover.lead") !== "1") return false
    sessionStorage.removeItem("pinwego.discover.lead")
    return true
  } catch {
    return false
  }
}
