"use client"

import { useSyncExternalStore } from "react"

export function useBrowserValue<T>(read: () => T, server: T): T {
  return useSyncExternalStore(
    () => () => {},
    read,
    () => server
  )
}
