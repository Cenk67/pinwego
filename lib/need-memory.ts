"use client"

import { useSyncExternalStore } from "react"

/**
 * Opt-in personalization. Nothing is stored until the visitor turns it on; turning it off wipes the
 * list. Only this browser sees the sentences.
 */
export type NeedMemory = { consent: boolean; items: { q: string; at: string }[] }

const KEY = "pinwego.need.memory.v1"
const LIMIT = 6

const serverState: NeedMemory = { consent: false, items: [] }
let memory: NeedMemory = serverState
let loaded = false
const listeners = new Set<() => void>()

function read(): NeedMemory {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return serverState
    const data = JSON.parse(raw) as Partial<NeedMemory>
    const items = Array.isArray(data.items)
      ? data.items
          .filter((item): item is { q: string; at: string } => Boolean(item) && typeof item.q === "string" && typeof item.at === "string")
          .slice(0, LIMIT)
      : []
    return { consent: data.consent === true, items: data.consent === true ? items : [] }
  } catch {
    return serverState
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function snapshot() {
  if (!loaded) {
    loaded = true
    memory = read()
  }
  return memory
}

function serverSnapshot() {
  return serverState
}

function commit(next: NeedMemory) {
  memory = next
  loaded = true
  try {
    if (next.consent) localStorage.setItem(KEY, JSON.stringify(next))
    else localStorage.removeItem(KEY)
  } catch {
    /* the in-memory copy still serves this tab */
  }
  listeners.forEach((listener) => listener())
}

export function useNeedMemory() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}

export function setNeedConsent(consent: boolean) {
  const current = snapshot()
  commit({ consent, items: consent ? current.items : [] })
}

export function rememberNeed(q: string) {
  const current = snapshot()
  if (!current.consent) return
  const clean = q.trim().slice(0, 120)
  if (!clean) return
  const items = [{ q: clean, at: new Date().toISOString() }, ...current.items.filter((item) => item.q.toLocaleLowerCase("tr-TR") !== clean.toLocaleLowerCase("tr-TR"))].slice(0, LIMIT)
  commit({ consent: true, items })
}

export function forgetNeeds() {
  commit({ consent: snapshot().consent, items: [] })
}
