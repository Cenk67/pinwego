"use client"

import { CalendarDays } from "lucide-react"

export const WHEN_PRESETS = ["Bugün", "Bu hafta", "Esnek"] as const

export function todayIso() {
  const now = new Date()
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-")
}

export function formatWhenDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number)
  if (!year || !month || !day) return iso
  return new Date(year, month - 1, day).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function chipClass(active: boolean) {
  return active
    ? "rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground"
    : "rounded-full bg-secondary px-3 py-1.5 text-xs"
}

export function WhenField({
  value,
  date,
  onChange,
}: {
  value: string
  date: string
  onChange: (next: { when: string; date: string }) => void
}) {
  const picked = Boolean(date)

  return (
    <div className="grid gap-1.5">
      <p className="text-sm font-medium">Ne zaman</p>
      <div className="flex flex-wrap items-center gap-2">
        {WHEN_PRESETS.map((item) => (
          <button
            key={item}
            type="button"
            className={chipClass(!picked && value === item)}
            onClick={() => onChange({ when: item, date: "" })}
          >
            {item}
          </button>
        ))}
        <label
          className={`relative inline-flex cursor-pointer items-center gap-1.5 ${chipClass(picked)}`}
        >
          <CalendarDays className="size-3.5" />
          {picked ? formatWhenDate(date) : "Tarih seç"}
          <input
            type="date"
            min={todayIso()}
            value={date}
            aria-label="Tarih seç"
            onClick={(event) => {
              const picker = event.currentTarget
              if (typeof picker.showPicker === "function") {
                event.preventDefault()
                picker.showPicker()
              }
            }}
            onChange={(event) => {
              const next = event.target.value
              if (!next) {
                onChange({ when: "Bu hafta", date: "" })
                return
              }
              onChange({ when: formatWhenDate(next), date: next })
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  )
}
