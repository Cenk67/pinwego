import { slugifyKey } from "@/lib/format"
import { hoursFromBook, liveBusiness, publicBook, storedBook } from "@/lib/hours"
import { storedCover } from "@/lib/listing-media"
import type { BookingKind, Business, DayHours, HourBook } from "@/lib/types"

export const listingsKey = "listings:v1"
export const listingCap = 1000
const ownerCap = 30

const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]

export type StoredListing = {
  id: string
  slug: string
  name: string
  category: string
  subcategory: string
  city: string
  district: string
  address: string
  lat: number
  lng: number
  phone: string
  summary: string
  about: string
  photo: string
  photoPosition: string
  booking: BookingKind
  hours: DayHours[]
  hourBook?: HourBook
  hourLog?: { at: string; by: string; action: string }[]
  priceLevel: 2
  openNow: boolean
  premium: boolean
  verified: boolean
  hidden: boolean
  ownerAccountId: string
  createdAt: string
  responseMinutes: number
  founded: number
  amenities: string[]
  website?: string
  review?: "taslak" | "onay"
}

export type ListingBook = { listings: StoredListing[] }

function clip(value: unknown, max: number) {
  if (typeof value !== "string") return ""
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
}

function photoPath(value: unknown) {
  if (typeof value !== "string") return ""
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("..") || value.includes("\\")) return ""
  if (value.length > 120) return ""
  return value
}

function defaultHours(): DayHours[] {
  return days.map((day) => ({ day, hours: day === "Pazar" ? "Kapalı" : "09:00–18:00" }))
}

function readHours(value: unknown): DayHours[] | null {
  if (!Array.isArray(value) || value.length < 7) return null
  const rows: DayHours[] = []
  for (const item of value.slice(0, 7)) {
    if (!item || typeof item !== "object") return null
    const row = item as Partial<DayHours>
    if (typeof row.day !== "string" || !row.day.trim()) return null
    rows.push({ day: row.day.slice(0, 24), hours: typeof row.hours === "string" ? row.hours.slice(0, 80) : "" })
  }
  return rows
}

function asListing(value: unknown): StoredListing | null {
  if (!value || typeof value !== "object") return null
  const row = value as Partial<StoredListing>
  if (typeof row.id !== "string" || typeof row.slug !== "string" || typeof row.name !== "string") return null
  if (typeof row.ownerAccountId !== "string" || typeof row.city !== "string") return null
  if (typeof row.lat !== "number" || typeof row.lng !== "number") return null
  const booking = row.booking === "randevu" || row.booking === "rezervasyon" || row.booking === "teklif" ? row.booking : "teklif"
  const hourBook = storedBook((row as { hourBook?: unknown }).hourBook) ?? undefined
  const hours = hourBook ? hoursFromBook(hourBook) : readHours(row.hours) ?? defaultHours()
  const hourLog = Array.isArray((row as { hourLog?: unknown }).hourLog)
    ? (row as { hourLog: { at?: unknown; by?: unknown; action?: unknown }[] }).hourLog
        .filter((item) => item && typeof item.at === "string" && typeof item.action === "string")
        .slice(0, 8)
        .map((item) => ({
          at: item.at as string,
          by: typeof item.by === "string" ? item.by.slice(0, 40) : "",
          action: (item.action as string).slice(0, 40),
        }))
    : []
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: typeof row.category === "string" ? row.category : "yeme",
    subcategory: typeof row.subcategory === "string" ? row.subcategory : "",
    city: row.city,
    district: typeof row.district === "string" ? row.district : "",
    address: typeof row.address === "string" ? row.address : "",
    lat: row.lat,
    lng: row.lng,
    phone: typeof row.phone === "string" ? row.phone : "",
    summary: typeof row.summary === "string" ? row.summary : "",
    about: typeof row.about === "string" ? row.about : "",
    photo: storedCover(row.photo) || "/photos/office.jpg",
    photoPosition: "center",
    booking,
    hours,
    hourBook,
    hourLog,
    priceLevel: 2,
    openNow: row.openNow !== false,
    premium: row.premium === true,
    verified: row.verified === true,
    hidden: row.hidden === true,
    ownerAccountId: row.ownerAccountId,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : "",
    responseMinutes: 180,
    founded: typeof row.founded === "number" ? row.founded : 2026,
    amenities: Array.isArray(row.amenities) ? row.amenities.filter((item) => typeof item === "string").slice(0, 8) : ["Yeni kayıt"],
    website: readSite(row.website),
    review: row.review === "taslak" || row.review === "onay" ? row.review : undefined,
  }
}

function readSite(value: unknown) {
  if (typeof value !== "string") return undefined
  const site = value.trim().slice(0, 160)
  if (!/^https?:\/\/\S+$/i.test(site)) return undefined
  return site
}

export function emptyBook(): ListingBook {
  return { listings: [] }
}

export function parseBook(raw: string | null): ListingBook | null {
  if (raw === null) return emptyBook()
  try {
    const data = JSON.parse(raw) as { listings?: unknown }
    if (!data || typeof data !== "object" || Array.isArray(data) || !Array.isArray(data.listings)) return null
    return { listings: data.listings.map(asListing).filter((item): item is StoredListing => item !== null).slice(0, listingCap) }
  } catch {
    return null
  }
}

export function listingSlug(name: string, ownerId: string) {
  const base = slugifyKey(name).slice(0, 48) || "isletme"
  const tail = ownerId.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase() || "kayit"
  return `${base}-${tail}`
}

function uniqueSlug(base: string, listings: StoredListing[]) {
  if (!listings.some((item) => item.slug === base)) return base
  let index = 2
  while (listings.some((item) => item.slug === `${base}-${index}`)) index += 1
  return `${base}-${index}`
}

export function toBusiness(listing: StoredListing): Business {
  return liveBusiness({
    id: listing.id,
    slug: listing.slug,
    name: listing.name,
    category: listing.category,
    subcategory: listing.subcategory,
    city: listing.city,
    district: listing.district,
    address: listing.address,
    lat: listing.lat,
    lng: listing.lng,
    phone: listing.phone,
    rating: 0,
    reviewCount: 0,
    priceLevel: 2,
    openNow: listing.openNow,
    summary: listing.summary,
    about: listing.about,
    services: [],
    amenities: listing.amenities,
    tags: [],
    reviews: [],
    premium: listing.premium,
    verified: listing.verified,
    responseMinutes: listing.responseMinutes,
    founded: listing.founded,
    photo: listing.photo,
    photoPosition: "center",
    booking: listing.booking,
    hours: listing.hours,
    hourBook: listing.hourBook ? publicBook(listing.hourBook) : undefined,
    facts: [],
    source: "senin",
    website: listing.website,
    ownerAccountId: listing.ownerAccountId,
  }, Date.now())
}

export type ImportedInput = {
  name: string
  category: string
  subcategory: string
  city: string
  district: string
  address: string
  lat: number
  lng: number
  phone: string
  summary: string
  booking: BookingKind
  verified: boolean
  premium: boolean
  hidden: boolean
  review?: "taslak" | "onay"
  website?: string
}

export function buildImportedListing(input: ImportedInput, nowIso: string, listings: StoredListing[]): StoredListing {
  const base = listingSlug(input.name, "yonetici")
  const slug = uniqueSlug(base, listings)
  const year = Number(nowIso.slice(0, 4))
  return {
    id: slug,
    slug,
    name: input.name,
    category: input.category,
    subcategory: input.subcategory,
    city: input.city,
    district: input.district,
    address: input.address,
    lat: input.lat,
    lng: input.lng,
    phone: input.phone,
    summary: input.summary,
    about: input.summary,
    photo: "/photos/office.jpg",
    photoPosition: "center",
    booking: input.booking,
    hours: defaultHours(),
    hourLog: [],
    priceLevel: 2,
    openNow: true,
    premium: input.premium,
    verified: input.verified,
    hidden: input.hidden,
    ownerAccountId: "yonetici",
    createdAt: nowIso,
    responseMinutes: 180,
    founded: Number.isFinite(year) ? year : 2026,
    amenities: ["Yönetim kaydı"],
    website: input.website,
    review: input.review,
  }
}

export function acceptListing(
  body: Record<string, unknown>,
  ownerId: string,
  nowIso: string,
  book: ListingBook,
  admin: boolean,
): { ok: true; book: ListingBook; listing: StoredListing } | { ok: false; reason: "invalid" | "dolu" } {
  const name = clip(body.name, 80)
  const district = clip(body.district, 80)
  const city = clip(body.city, 60)
  const summary = clip(body.summary, 400)
  const phone = clip(body.phone, 24)
  const digits = phone.replace(/\D/g, "")
  const category = clip(body.category, 40).toLowerCase().replace(/[^a-z0-9-]/g, "") || "yeme"
  const subcategory = clip(body.subcategory, 60) || category
  const address = clip(body.address, 160) || `${district}, ${city}`
  const lat = typeof body.lat === "number" ? body.lat : Number.NaN
  const lng = typeof body.lng === "number" ? body.lng : Number.NaN
  if (name.length < 2 || district.length < 2 || city.length < 2 || summary.length < 12) return { ok: false, reason: "invalid" }
  if (digits.length < 10 || digits.length > 15) return { ok: false, reason: "invalid" }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { ok: false, reason: "invalid" }
  const booking = body.booking === "randevu" || body.booking === "rezervasyon" || body.booking === "teklif" ? body.booking : "teklif"
  const base = listingSlug(name, ownerId)
  const own = book.listings.find((item) => item.ownerAccountId === ownerId && (item.slug === base || item.name === name))
  const year = Number(nowIso.slice(0, 4))
  const draft: StoredListing = {
    id: own?.id ?? uniqueSlug(base, book.listings),
    slug: own?.slug ?? uniqueSlug(base, book.listings),
    name,
    category,
    subcategory,
    city,
    district,
    address,
    lat,
    lng,
    phone,
    summary,
    about: summary,
    photo: photoPath(body.photo) || "/photos/office.jpg",
    photoPosition: "center",
    booking,
    hours: own?.hourBook ? hoursFromBook(own.hourBook) : own?.hours ?? defaultHours(),
    hourBook: own?.hourBook,
    hourLog: own?.hourLog ?? [],
    priceLevel: 2,
    openNow: true,
    premium: own ? own.premium : admin && body.premium === true,
    verified: own ? own.verified : admin && body.verified === true,
    hidden: own ? own.hidden : false,
    ownerAccountId: ownerId,
    createdAt: own?.createdAt || nowIso,
    responseMinutes: 180,
    founded: Number.isFinite(year) ? year : 2026,
    amenities: [admin ? "Yönetim kaydı" : "Yeni kayıt"],
  }
  if (!own && !admin && book.listings.filter((item) => item.ownerAccountId === ownerId).length >= ownerCap) return { ok: false, reason: "dolu" }
  if (!own && book.listings.length >= listingCap) return { ok: false, reason: "dolu" }
  const listings = own
    ? book.listings.map((item) => (item.id === own.id ? draft : item))
    : [draft, ...book.listings].slice(0, listingCap)
  return { ok: true, book: { listings }, listing: draft }
}

export function applyFlags(listing: StoredListing, body: Record<string, unknown>): StoredListing {
  return {
    ...listing,
    verified: typeof body.verified === "boolean" ? body.verified : listing.verified,
    premium: typeof body.premium === "boolean" ? body.premium : listing.premium,
    hidden: typeof body.hidden === "boolean" ? body.hidden : listing.hidden,
    openNow: typeof body.openNow === "boolean" ? body.openNow : listing.openNow,
  }
}
