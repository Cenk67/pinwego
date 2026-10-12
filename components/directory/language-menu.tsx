"use client"

import { Languages } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { locales } from "@/lib/i18n"
import { useLocale } from "@/lib/use-locale"
import { cn } from "cn"

export function LanguageMenu() {
  const { locale, setLocale, t } = useLocale()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const listId = useId()
  const current = locales.find((item) => item.id === locale)

  useEffect(() => {
    if (!open) return
    function close(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", close)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", close)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t("lang.label")}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm ring-1 ring-foreground/15 hover:text-primary"
      >
        <Languages className="size-4" />
        <span className="hidden sm:inline">{current?.name}</span>
        <span className="sm:hidden">{locale.toUpperCase()}</span>
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("lang.label")}
          className="absolute end-0 top-11 z-50 max-h-80 w-44 overflow-auto rounded-2xl bg-card p-1 shadow-xl ring-1 ring-foreground/10"
        >
          {locales.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={item.id === locale}
                lang={item.id}
                dir={item.dir}
                onClick={() => {
                  setLocale(item.id)
                  setOpen(false)
                }}
                className={cn(
                  "flex w-full rounded-xl px-3 py-2 text-start text-sm",
                  item.id === locale ? "bg-primary/10 text-primary" : "hover:bg-secondary",
                )}
              >
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
