"use client"

import { useSyncExternalStore } from "react"

export const needScopes = ["hepsi", "pinwego", "rehber"] as const
export type NeedScope = (typeof needScopes)[number]

const KEY = "pinwego.need-scope.v1"

let memory: NeedScope = "hepsi"
let loaded = false
const listeners = new Set<() => void>()

function readScope(value: string | null): NeedScope {
  return needScopes.includes(value as NeedScope) ? (value as NeedScope) : "hepsi"
}

function readStorage(): NeedScope {
  try {
    return readScope(localStorage.getItem(KEY))
  } catch {
    return "hepsi"
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function snapshot() {
  if (!loaded) {
    loaded = true
    memory = readStorage()
  }
  return memory
}

function serverSnapshot(): NeedScope {
  return "hepsi"
}

export function useNeedScope() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}

export function saveNeedScope(scope: NeedScope) {
  memory = scope
  loaded = true
  try {
    localStorage.setItem(KEY, scope)
  } catch {
    // The browser can refuse storage. The choice still applies in this tab.
  }
  listeners.forEach((listener) => listener())
}
