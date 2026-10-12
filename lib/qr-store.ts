"use client"

import { useSyncExternalStore } from "react"
import { allowQrEvent, seedQrEvents, type QrEvent } from "@/lib/qr"

const STORAGE_KEY = "pinwego.qr.v1"

type Persisted = { events: QrEvent[]; seen: Record<string, number> }

const serverState: Persisted = { events: [], seen: {} }
let memory: Persisted = serverState
let loaded = false
const listeners = new Set<() => void>()

function isEvent(value: unknown): value is QrEvent {
  if (!value || typeof value !== "object") return false
  const row = value as Partial<QrEvent>
  return typeof row.code === "string" && typeof row.businessId === "string" && typeof row.type === "string" && typeof row.at === "string"
}

function readStorage(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { events: [], seen: {} }
    const data = JSON.parse(raw) as Partial<Persisted>
    return {
      events: Array.isArray(data.events) ? data.events.filter(isEvent).slice(-400) : [],
      seen: data.seen && typeof data.seen === "object" ? data.seen : {},
    }
  } catch {
    return { events: [], seen: {} }
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
  memory = { events: next.events.slice(-400), seen: next.seen }
  loaded = true
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory))
  } catch {
    // The overlay can fill the browser quota. Keep the in-memory copy.
  }
  listeners.forEach((listener) => listener())
}

export function listQrEvents(state: Persisted = getSnapshot()) {
  return [...seedQrEvents, ...state.events]
}

export function recordQrEvent(event: Omit<QrEvent, "at" | "device"> & { device?: QrEvent["device"] }, now = Date.now()) {
  const current = getSnapshot()
  const last = current.seen[`${event.code}:${event.type}`] ?? 0
  if (!allowQrEvent(last, now)) return false
  const day = new Date(now).toISOString().slice(0, 10)
  if (event.type === "qr_scan" || event.type === "qr_landing_view") {
    const mark = `pinwego.qr.view.${event.code}.${event.type}.${day}`
    try {
      if (sessionStorage.getItem(mark)) return false
      sessionStorage.setItem(mark, "1")
    } catch {
      return false
    }
  }
  const device = event.device ?? (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop")
  const row: QrEvent = { ...event, at: new Date(now).toISOString(), device }
  commit({
    events: [...current.events, row],
    seen: { ...current.seen, [`${event.code}:${event.type}`]: now },
  })
  return true
}

export function rememberQrReturn(code: string) {
  try {
    sessionStorage.setItem("pinwego.qr.return", code)
  } catch {
    // Session storage can be blocked. The return link still opens the profile.
  }
}

export function takeQrReturn(code: string) {
  try {
    const stored = sessionStorage.getItem("pinwego.qr.return")
    if (stored !== code) return false
    sessionStorage.removeItem("pinwego.qr.return")
    return true
  } catch {
    return false
  }
}

export function useQrEvents() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return listQrEvents(state)
}
