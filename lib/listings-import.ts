import { cities } from "@/lib/catalog"
import { fold } from "@/lib/format"
import { acceptListing, type ListingBook, type StoredListing } from "@/lib/listings"
import { seedSectors } from "@/lib/sectors"
import type { BookingKind } from "@/lib/types"

export const sheetRowCap = 200
export const sheetByteCap = 160_000

const fields = {
  ad: "name",
  name: "name",
  isletme: "name",
  kategori: "category",
  category: "category",
  sektor: "category",
  sehir: "city",
  il: "city",
  city: "city",
  semt: "district",
  ilce: "district",
  district: "district",
  adres: "address",
  address: "address",
  telefon: "phone",
  phone: "phone",
  tel: "phone",
  ozet: "summary",
  summary: "summary",
  enlem: "lat",
  lat: "lat",
  boylam: "lng",
  lng: "lng",
  dogrulandi: "verified",
  dogrulanmis: "verified",
  verified: "verified",
  "one cikan": "premium",
  premium: "premium",
} as const

type Field = (typeof fields)[keyof typeof fields]

export const sheetFaults = ["baslik", "fazla", "eksik", "kategori", "telefon", "ozet", "konum", "dolu", "gecersiz"] as const
export type SheetFaultReason = (typeof sheetFaults)[number]
export type SheetFault = { line: number; reason: SheetFaultReason }
export type SheetRow = { line: number; body: Record<string, unknown> }

export const listingSheetSample = [
  "ad;kategori;sehir;semt;adres;telefon;ozet;enlem;boylam",
  "Yeşil Çınar;yeme;Zonguldak;Kozlu;Sahil caddesi 4;0372 000 00 01;Kozlu sahilinde ev yemeği ve kahvaltı.;41.450;31.740",
  "Mavi Konak;konaklama;Zonguldak;Merkez;Gazipaşa caddesi 8;0372 000 00 02;Merkezde butik konaklama ve kahvaltı.;41.456;31.793",
].join("\n")

function clip(value: string, max: number) {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
}

function chooseDelimiter(header: string) {
  const scores = [
    { mark: ";", count: header.split(";").length },
    { mark: ",", count: header.split(",").length },
    { mark: "\t", count: header.split("\t").length },
  ]
  return scores.sort((left, right) => right.count - left.count)[0]?.mark ?? ";"
}

function splitLine(line: string, delimiter: string) {
  const cells: string[] = []
  let current = ""
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"'
        index += 1
        continue
      }
      quoted = !quoted
      continue
    }
    if (char === delimiter && !quoted) {
      cells.push(current.trim())
      current = ""
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

function sectorOf(value: string) {
  const key = fold(value)
  const compact = key.replace(/\s/g, "")
  return seedSectors.find((sector) => {
    const label = fold(sector.label)
    return fold(sector.id) === compact || label === key || label.replace(/\s/g, "") === compact
  })
}

function knownCity(value: string) {
  const key = fold(value)
  return cities.find((city) => fold(city.name) === key) ?? null
}

function coordinate(value: string) {
  const number = Number(value.trim().replace(",", "."))
  return Number.isFinite(number) ? number : Number.NaN
}

function flagged(value: string | undefined, fallback: boolean) {
  const key = fold(value ?? "")
  if (!key) return fallback
  if (key === "evet" || key === "true" || key === "1" || key === "var") return true
  if (key === "hayir" || key === "false" || key === "0" || key === "yok") return false
  return fallback
}

function buildRow(record: Partial<Record<Field, string>>): { body?: Record<string, unknown>; fault?: SheetFaultReason } {
  const name = clip(record.name ?? "", 80)
  const district = clip(record.district ?? "", 80)
  const cityText = clip(record.city ?? "", 60)
  const summary = clip(record.summary ?? "", 400)
  const phone = clip(record.phone ?? "", 24)
  const digits = phone.replace(/\D/g, "")
  if (name.length < 2 || district.length < 2 || cityText.length < 2) return { fault: "eksik" }
  const sector = sectorOf(record.category ?? "")
  if (!sector) return { fault: "kategori" }
  if (digits.length < 10 || digits.length > 15) return { fault: "telefon" }
  if (summary.length < 12) return { fault: "ozet" }
  const city = knownCity(cityText)
  const latText = record.lat ?? ""
  const lngText = record.lng ?? ""
  let lat = coordinate(latText)
  let lng = coordinate(lngText)
  const hasLat = latText.trim().length > 0
  const hasLng = lngText.trim().length > 0
  if (hasLat !== hasLng) return { fault: "konum" }
  if (hasLat && (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)) return { fault: "konum" }
  if (!hasLat) {
    if (!city) return { fault: "konum" }
    lat = city.lat
    lng = city.lng
  }
  const booking: BookingKind = sector.booking
  return {
    body: {
      name,
      category: sector.id,
      subcategory: sector.label,
      city: city?.name ?? cityText,
      district,
      address: clip(record.address ?? "", 160) || `${district}, ${city?.name ?? cityText}`,
      lat,
      lng,
      phone,
      summary,
      booking,
      verified: flagged(record.verified, true),
      premium: flagged(record.premium, false),
    },
  }
}

export function parseListingSheet(text: string): { rows: SheetRow[]; faults: SheetFault[] } {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines = clean.split("\n")
  const first = lines.findIndex((line) => line.trim())
  if (first < 0) return { rows: [], faults: [{ line: 1, reason: "baslik" }] }
  const delimiter = chooseDelimiter(lines[first] ?? "")
  const header = splitLine(lines[first] ?? "", delimiter).map((cell) => fields[fold(cell) as keyof typeof fields] ?? "")
  const needed = ["name", "category", "city", "district", "phone", "summary"]
  if (needed.some((field) => !header.includes(field))) return { rows: [], faults: [{ line: first + 1, reason: "baslik" }] }
  const rows: SheetRow[] = []
  const faults: SheetFault[] = []
  let dataCount = 0
  for (let index = first + 1; index < lines.length; index += 1) {
    if (!lines[index]?.trim()) continue
    dataCount += 1
    const line = index + 1
    if (dataCount > sheetRowCap) {
      faults.push({ line, reason: "fazla" })
      continue
    }
    const cells = splitLine(lines[index] ?? "", delimiter)
    const record: Partial<Record<Field, string>> = {}
    header.forEach((field, cellIndex) => {
      if (field && record[field] === undefined) record[field] = cells[cellIndex] ?? ""
    })
    const built = buildRow(record)
    if (built.fault) faults.push({ line, reason: built.fault })
    else if (built.body) rows.push({ line, body: built.body })
  }
  if (!rows.length && !faults.length) faults.push({ line: first + 1, reason: "eksik" })
  return { rows, faults }
}

export function acceptSheet(rows: SheetRow[], book: ListingBook, nowIso: string) {
  let current = book
  const listings: StoredListing[] = []
  const faults: SheetFault[] = []
  let added = 0
  let updated = 0
  for (const row of rows) {
    const known = new Set(current.listings.map((item) => item.id))
    const saved = acceptListing(row.body, "yonetici", nowIso, current, true)
    if (!saved.ok) {
      faults.push({ line: row.line, reason: saved.reason === "dolu" ? "dolu" : "gecersiz" })
      continue
    }
    current = saved.book
    listings.push(saved.listing)
    if (known.has(saved.listing.id)) updated += 1
    else added += 1
  }
  return { book: current, listings, added, updated, faults }
}
