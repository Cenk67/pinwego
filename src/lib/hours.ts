import type { DayHours } from "./types"
import { WEEKDAYS } from "./categories"

export function weekdays(open: string, close: string): Record<string, DayHours> {
  return Object.fromEntries(
    WEEKDAYS.map((day) => [
      day,
      day === "pazar"
        ? { open, close, closed: true }
        : { open, close },
    ])
  )
}

export function everyday(open: string, close: string): Record<string, DayHours> {
  return Object.fromEntries(WEEKDAYS.map((day) => [day, { open, close }]))
}

export function restaurantHours(): Record<string, DayHours> {
  return {
    pazartesi: { open: "11:00", close: "23:00" },
    sali: { open: "11:00", close: "23:00" },
    carsamba: { open: "11:00", close: "23:00" },
    persembe: { open: "11:00", close: "23:30" },
    cuma: { open: "11:00", close: "00:30" },
    cumartesi: { open: "10:00", close: "00:30" },
    pazar: { open: "10:00", close: "23:00" },
  }
}

export function cafeHours(): Record<string, DayHours> {
  return everyday("08:00", "22:00")
}

export function officeHours(): Record<string, DayHours> {
  return weekdays("09:00", "18:00")
}

export function clinicHours(): Record<string, DayHours> {
  return {
    ...weekdays("09:00", "19:00"),
    cumartesi: { open: "10:00", close: "16:00" },
    pazar: { open: "00:00", close: "00:00", closed: true },
  }
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

export function isOpenAt(
  hours: Record<string, DayHours>,
  date: Date
): boolean {
  const day = WEEKDAYS[(date.getDay() + 6) % 7]
  const slot = hours[day]
  if (!slot || slot.closed) return false
  const now = date.getHours() * 60 + date.getMinutes()
  const open = toMinutes(slot.open)
  const close = toMinutes(slot.close)
  if (close < open) return now >= open || now < close
  return now >= open && now < close
}
