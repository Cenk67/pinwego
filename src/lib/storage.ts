"use client"

import type { Business } from "./types"

const KEYS = {
  bookings: "lumina-bookings",
  quotes: "lumina-quotes",
  listings: "lumina-listings",
  saved: "lumina-saved",
} as const

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export type BookingRecord = {
  id: string
  slug: string
  businessName: string
  serviceName: string
  staff?: string
  date: string
  time: string
  customer: string
  phone: string
  createdAt: string
}

export type QuoteRecord = {
  id: string
  category: string
  title: string
  detail: string
  city: string
  budget: string
  when: string
  matches: Array<{ slug: string; name: string }>
  createdAt: string
}

export function listBookings() {
  return read<BookingRecord[]>(KEYS.bookings, [])
}

export function saveBooking(row: BookingRecord) {
  const next = [row, ...listBookings()]
  write(KEYS.bookings, next)
  return next
}

export function listQuotes() {
  return read<QuoteRecord[]>(KEYS.quotes, [])
}

export function saveQuote(row: QuoteRecord) {
  const next = [row, ...listQuotes()]
  write(KEYS.quotes, next)
  return next
}

export function listUserBusinesses() {
  return read<Business[]>(KEYS.listings, [])
}

export function saveUserBusiness(row: Business) {
  const next = [row, ...listUserBusinesses().filter((b) => b.slug !== row.slug)]
  write(KEYS.listings, next)
  return next
}

export function toggleSaved(slug: string) {
  const cur = read<string[]>(KEYS.saved, [])
  const next = cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]
  write(KEYS.saved, next)
  return next
}

export function listSaved() {
  return read<string[]>(KEYS.saved, [])
}
