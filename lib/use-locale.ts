"use client"

import { useSyncExternalStore } from "react"
import { getLocale, getServerLocale, localeDir, setLocale, subscribeLocale, translate } from "@/lib/i18n"
import type { MessageKey } from "@/lib/messages"

export function useLocale() {
  const locale = useSyncExternalStore(subscribeLocale, getLocale, getServerLocale)
  return {
    locale,
    dir: localeDir(locale),
    setLocale,
    t: (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
  }
}
