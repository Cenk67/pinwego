"use client"

import { useSyncExternalStore } from "react"
import { useLocale } from "@/lib/use-locale"

export const cookieChoiceKey = "pinwego.cerez.v1"

function readChoice() {
  try {
    return localStorage.getItem(cookieChoiceKey) ?? ""
  } catch {
    return ""
  }
}

function subscribe(listener: () => void) {
  window.addEventListener("pinwego-cerez", listener)
  window.addEventListener("storage", listener)
  return () => {
    window.removeEventListener("pinwego-cerez", listener)
    window.removeEventListener("storage", listener)
  }
}

export function cookieChoice() {
  return readChoice()
}

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

export function CookieBanner() {
  const { t } = useLocale()
  const mounted = useMounted()
  const choice = useSyncExternalStore(subscribe, readChoice, () => "")
  if (!mounted || choice) return null
  function choose(value: "sayim" | "zorunlu") {
    localStorage.setItem(cookieChoiceKey, value)
    window.dispatchEvent(new Event("pinwego-cerez"))
  }
  return (
    <div className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-3xl rounded-3xl bg-card p-4 shadow-lg ring-1 ring-foreground/10 md:bottom-4">
      <p className="font-medium">{t("cookie.title")}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("cookie.body")}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button type="button" className="h-10 rounded-xl bg-secondary px-4 text-sm" onClick={() => choose("sayim")}>
          {t("cookie.accept")}
        </button>
        <button type="button" className="h-10 rounded-xl bg-secondary px-4 text-sm" onClick={() => choose("zorunlu")}>
          {t("cookie.required")}
        </button>
      </div>
    </div>
  )
}
