import { businesses } from "@/lib/catalog"
import { cities } from "@/lib/catalog"
import { fold } from "@/lib/format"
import { buildImportedListing, listingCap, type ListingBook, type StoredListing } from "@/lib/listings"
import { seedSectors } from "@/lib/sectors"
import { bytesFromBase64, readCsvGrid, readXlsxGrid, sheetByteCap, sheetRowCap, type SheetGrid } from "@/lib/sheet-file"
import type { BookingKind } from "@/lib/types"

export { sheetByteCap, sheetRowCap }

export const listingSheetSample = [
  "ad;kategori;alt kategori;il;ilce;mahalle;adres;telefon;web;ozet;durum",
  "Yeşil Çınar;yeme;Balık;Zonguldak;Kozlu;Merkez;Sahil caddesi 4;0372 000 00 01;https://ornek.pinwego.test;Kozlu sahilinde ev yemeği ve kahvaltı.;onay",
  "Mavi Konak;konaklama;;Zonguldak;Merkez;;Gazipaşa caddesi 8;0372 000 00 02;;Merkezde butik konaklama ve kahvaltı.;yayinda",
].join("\n")

export const importLogKey = "listings:import-log"

export const importFields = [
  ["name", "İşletme adı"],
  ["category", "Kategori"],
  ["subcategory", "Alt kategori"],
  ["city", "İl"],
  ["district", "İlçe"],
  ["neighborhood", "Mahalle"],
  ["address", "Adres"],
  ["phone", "Telefon"],
  ["website", "Web sitesi"],
  ["summary", "Kısa açıklama"],
  ["lat", "Enlem"],
  ["lng", "Boylam"],
  ["status", "Yayın durumu"],
  ["verified", "Doğrulama"],
  ["premium", "Öne çıkan"],
] as const

export type ImportField = (typeof importFields)[number][0]
export type PublishState = "taslak" | "onay" | "yayinda"
export type RowKind = "yeni" | "zaten" | "guncelle" | "olasi" | "hata"

const aliases: Record<string, ImportField> = {
  ad: "name",
  name: "name",
  isletme: "name",
  "isletme adi": "name",
  kategori: "category",
  category: "category",
  sektor: "category",
  "ana kategori": "category",
  "alt kategori": "subcategory",
  altkategori: "subcategory",
  subcategory: "subcategory",
  sehir: "city",
  il: "city",
  city: "city",
  semt: "district",
  ilce: "district",
  district: "district",
  mahalle: "neighborhood",
  neighborhood: "neighborhood",
  adres: "address",
  address: "address",
  "acik adres": "address",
  telefon: "phone",
  phone: "phone",
  tel: "phone",
  web: "website",
  website: "website",
  "web sitesi": "website",
  site: "website",
  ozet: "summary",
  summary: "summary",
  aciklama: "summary",
  "kisa aciklama": "summary",
  enlem: "lat",
  lat: "lat",
  boylam: "lng",
  lng: "lng",
  durum: "status",
  "yayin durumu": "status",
  status: "status",
  dogrulandi: "verified",
  dogrulanmis: "verified",
  dogrulama: "verified",
  verified: "verified",
  "one cikan": "premium",
  premium: "premium",
}

export const sheetFaults = ["baslik", "fazla", "eksik", "kategori", "telefon", "ozet", "konum", "site", "durum", "dolu", "gecersiz"] as const
export type SheetFaultReason = (typeof sheetFaults)[number]

export type ImportChange = { field: string; before: string; after: string }
export type ImportRow = {
  line: number
  kind: RowKind
  name: string
  city: string
  district: string
  phone: string
  note: string
  changes: ImportChange[]
  targetId?: string
}
export type ImportPreview = {
  headers: string[]
  map: string[]
  total: number
  counts: Record<RowKind, number>
  rows: ImportRow[]
  report: string
}
export type ImportNote = {
  id: string
  at: string
  total: number
  added: number
  updated: number
  held: number
  same: number
  faults: number
  ms: number
  actor: string
}

type Prepared = {
  line: number
  kind: RowKind
  note: string
  name: string
  city: string
  district: string
  phone: string
  changes: ImportChange[]
  targetId?: string
  value?: Draft
}

type Draft = {
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
  website?: string
  verified?: boolean
  premium?: boolean
  status?: PublishState
  provided: {
    website: boolean
    verified: boolean
    premium: boolean
    status: boolean
    place: boolean
  }
}

type Finger = {
  id: string
  origin: "kayit" | "katalog"
  name: string
  city: string
  district: string
  address: string
  phone: string
  website: string
  summary: string
  category: string
  subcategory: string
  verified: boolean
  premium: boolean
  status: PublishState
  listing?: StoredListing
}

const fieldLabel: Record<string, string> = Object.fromEntries(importFields)

function clip(value: string, max: number) {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
}

function digits(value: string) {
  return value.replace(/\D/g, "")
}

function siteOf(value: string) {
  const site = clip(value, 160)
  if (!site) return ""
  if (!/^https?:\/\/\S+$/i.test(site)) return ""
  return site
}

function hostOf(value: string) {
  try {
    return new URL(value).host.replace(/^www\./, "").toLowerCase()
  } catch {
    return ""
  }
}

function flagged(value: string | undefined) {
  const key = fold(value ?? "")
  if (!key) return undefined
  if (key === "evet" || key === "true" || key === "1" || key === "var") return true
  if (key === "hayir" || key === "false" || key === "0" || key === "yok") return false
  return undefined
}

function publishOf(value: string | undefined): PublishState | "" | null {
  const key = fold(value ?? "").replace(/\s/g, "")
  if (!key) return ""
  if (key === "taslak") return "taslak"
  if (key === "onay" || key === "onaybekliyor") return "onay"
  if (key === "yayinda" || key === "yayin") return "yayinda"
  return null
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

export function suggestMap(headers: string[]) {
  const used = new Set<string>()
  return headers.map((header) => {
    const field = aliases[fold(header)]
    if (!field || used.has(field)) return ""
    used.add(field)
    return field
  })
}

export function readMap(value: unknown, width: number) {
  if (!Array.isArray(value) || value.length === 0) return null
  const allowed = new Set<string>(importFields.map((item) => item[0]))
  const used = new Set<string>()
  return value.slice(0, width).map((item) => {
    const field = typeof item === "string" && allowed.has(item) ? item : ""
    if (!field || used.has(field)) return ""
    if (field) used.add(field)
    return field
  })
}

function cell(row: string[], map: string[], field: ImportField) {
  const index = map.indexOf(field)
  return index < 0 ? "" : row[index] ?? ""
}

function mapped(map: string[], field: ImportField) {
  return map.includes(field)
}

function faultRow(line: number, note: string, bits?: { name?: string; city?: string; district?: string; phone?: string }): Prepared {
  return { line, kind: "hata", note, name: bits?.name ?? "", city: bits?.city ?? "", district: bits?.district ?? "", phone: bits?.phone ?? "", changes: [] }
}

function prepareRow(line: number, cells: string[], map: string[]): Prepared {
  const name = clip(cell(cells, map, "name"), 80)
  const district = clip(cell(cells, map, "district"), 80)
  const cityText = clip(cell(cells, map, "city"), 60)
  const summary = clip(cell(cells, map, "summary"), 400)
  const phone = clip(cell(cells, map, "phone"), 24)
  const phoneDigits = digits(phone)
  const bits = { name, city: cityText, district, phone }
  if (name.length < 2 || district.length < 2 || cityText.length < 2) return faultRow(line, "Ad, il veya ilçe eksik.", bits)
  const sector = sectorOf(cell(cells, map, "category"))
  if (!sector) return faultRow(line, "Kategori tanınmadı.", bits)
  if (phoneDigits.length < 10 || phoneDigits.length > 15) return faultRow(line, "Telefon 10 ile 15 rakam olmalı.", bits)
  if (summary.length < 12) return faultRow(line, "Kısa açıklama en az 12 karakter olmalı.", bits)
  const status = publishOf(mapped(map, "status") ? cell(cells, map, "status") : "")
  if (status === null) return faultRow(line, "Yayın durumu taslak, onay veya yayinda olmalı.", bits)
  const websiteText = cell(cells, map, "website")
  const website = siteOf(websiteText)
  if (websiteText.trim() && !website) return faultRow(line, "Web sitesi http veya https ile başlamalı.", bits)
  const city = knownCity(cityText)
  const latText = cell(cells, map, "lat")
  const lngText = cell(cells, map, "lng")
  let lat = coordinate(latText)
  let lng = coordinate(lngText)
  const hasLat = latText.trim().length > 0
  const hasLng = lngText.trim().length > 0
  if (hasLat !== hasLng) return faultRow(line, "Enlem ve boylam birlikte yazılmalı.", bits)
  if (hasLat && (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)) {
    return faultRow(line, "Konum geçersiz.", bits)
  }
  if (!hasLat) {
    if (!city) return faultRow(line, "Bu il için enlem ve boylam gerekir.", bits)
    lat = city.lat
    lng = city.lng
  }
  const neighborhood = clip(cell(cells, map, "neighborhood"), 80)
  const street = clip(cell(cells, map, "address"), 120)
  const address = clip([neighborhood, street].filter(Boolean).join(", ") || `${district}, ${city?.name ?? cityText}`, 160)
  const subcategory = clip(cell(cells, map, "subcategory"), 60) || sector.label
  return {
    line,
    kind: "yeni",
    note: "",
    name,
    city: city?.name ?? cityText,
    district,
    phone,
    changes: [],
    value: {
      name,
      category: sector.id,
      subcategory,
      city: city?.name ?? cityText,
      district,
      address,
      lat,
      lng,
      phone,
      summary,
      booking: sector.booking,
      website: website || undefined,
      verified: mapped(map, "verified") ? flagged(cell(cells, map, "verified")) : undefined,
      premium: mapped(map, "premium") ? flagged(cell(cells, map, "premium")) : undefined,
      status: status || undefined,
      provided: {
        website: mapped(map, "website"),
        verified: mapped(map, "verified"),
        premium: mapped(map, "premium"),
        status: mapped(map, "status") && Boolean(status),
        place: hasLat && hasLng,
      },
    },
  }
}

function storedStatus(listing: StoredListing): PublishState {
  if (!listing.hidden) return "yayinda"
  return listing.review === "onay" ? "onay" : "taslak"
}

function fingersOf(book: ListingBook): Finger[] {
  const stored = book.listings.map((listing) => ({
    id: listing.id,
    origin: "kayit" as const,
    name: listing.name,
    city: listing.city,
    district: listing.district,
    address: listing.address,
    phone: listing.phone,
    website: listing.website ?? "",
    summary: listing.summary,
    category: listing.category,
    subcategory: listing.subcategory,
    verified: listing.verified,
    premium: listing.premium,
    status: storedStatus(listing),
    listing,
  }))
  const catalog = businesses.map((business) => ({
    id: business.slug,
    origin: "katalog" as const,
    name: business.name,
    city: business.city,
    district: business.district,
    address: business.address,
    phone: business.phone,
    website: business.website ?? "",
    summary: business.summary,
    category: business.category,
    subcategory: business.subcategory,
    verified: business.verified,
    premium: business.premium,
    status: "yayinda" as const,
  }))
  return [...stored, ...catalog]
}

function sameBranch(left: { name: string; city: string; district: string }, right: { name: string; city: string; district: string }) {
  return fold(left.name) === fold(right.name) && fold(left.city) === fold(right.city) && fold(left.district) === fold(right.district)
}

function samePhoneName(left: { name: string; phone: string }, right: { name: string; phone: string }) {
  const lead = digits(left.phone)
  const other = digits(right.phone)
  return lead.length >= 10 && lead === other && fold(left.name) === fold(right.name)
}

function changesFor(draft: Draft, finger: Finger) {
  const pairs: [string, string, string][] = [
    ["name", finger.name, draft.name],
    ["category", finger.category, draft.category],
    ["subcategory", finger.subcategory, draft.subcategory],
    ["city", finger.city, draft.city],
    ["district", finger.district, draft.district],
    ["address", finger.address, draft.address],
    ["summary", finger.summary, draft.summary],
  ]
  if (digits(finger.phone) !== digits(draft.phone)) pairs.push(["phone", finger.phone, draft.phone])
  if (draft.provided.website && (finger.website || "") !== (draft.website || "")) pairs.push(["website", finger.website, draft.website || ""])
  if (draft.provided.place && finger.listing && (finger.listing.lat !== draft.lat || finger.listing.lng !== draft.lng)) {
    pairs.push(["lat", String(finger.listing.lat), String(draft.lat)])
  }
  if (draft.provided.verified && draft.verified !== undefined && finger.verified !== draft.verified) {
    pairs.push(["verified", finger.verified ? "evet" : "hayır", draft.verified ? "evet" : "hayır"])
  }
  if (draft.provided.premium && draft.premium !== undefined && finger.premium !== draft.premium) {
    pairs.push(["premium", finger.premium ? "evet" : "hayır", draft.premium ? "evet" : "hayır"])
  }
  if (draft.provided.status && draft.status && finger.status !== draft.status) pairs.push(["status", finger.status, draft.status])
  return pairs
    .filter((item) => fold(item[1]) !== fold(item[2]) && item[1] !== item[2])
    .map((item) => ({ field: fieldLabel[item[0]] ?? item[0], before: item[1], after: item[2] }))
}

function mark(row: Prepared, fingers: Finger[], pending: Draft[], claimed: Set<string>): Prepared {
  if (!row.value || row.kind === "hata") return row
  const draft = row.value
  const stored = fingers.filter((item) => item.origin === "kayit")
  const exact = stored.find((item) => sameBranch(draft, item) || samePhoneName(draft, item))
  if (exact) {
    if (claimed.has(exact.id)) return { ...row, kind: "olasi", note: "Dosyada aynı kayıt tekrar ediyor." }
    claimed.add(exact.id)
    const changes = changesFor(draft, exact)
    if (!changes.length) return { ...row, kind: "zaten", note: "Aynı şube kayıtlı. Yeniden yazılmadı.", targetId: exact.id }
    return { ...row, kind: "guncelle", note: "Kayıtlı şubeyle fark var. Onay olmadan ezilmez.", changes, targetId: exact.id }
  }
  const earlier = pending.find((item) => sameBranch(draft, item) || samePhoneName(draft, item))
  if (earlier) {
    const same = fold(earlier.summary) === fold(draft.summary) && digits(earlier.phone) === digits(draft.phone)
    return {
      ...row,
      kind: same ? "zaten" : "olasi",
      note: same ? "Dosyada aynı satır tekrar ediyor." : "Dosyada aynı şube farklı bilgiyle tekrar ediyor.",
    }
  }
  const catalog = fingers.find((item) => item.origin === "katalog" && (sameBranch(draft, item) || samePhoneName(draft, item)))
  if (catalog) return { ...row, kind: "olasi", note: "Katalogda aynı şube var. Yeni kart açılmaz." }
  const generic = fold(`${draft.district} ${draft.city}`)
  const address = fold(draft.address)
  const specific = address.length > 16 && address !== generic
  const possible = fingers.find((item) => {
    if (fold(item.name) === fold(draft.name)) return true
    if (digits(item.phone).length >= 10 && digits(item.phone) === digits(draft.phone)) return true
    if (specific && fold(item.address) === address) return true
    const host = hostOf(draft.website || "")
    return Boolean(host) && host === hostOf(item.website)
  })
  if (possible) {
    const note = fold(possible.name) === fold(draft.name) ? "Aynı ad, farklı şube. Otomatik birleştirilmedi." : "Telefon, adres veya site benziyor. İnceleme bekler."
    return { ...row, kind: "olasi", note }
  }
  pending.push(draft)
  return { ...row, kind: "yeni", note: "Yeni kayıt." }
}

function safeCell(value: string) {
  const clean = value.replace(/\r|\n/g, " ")
  return /^[=+\-@]/.test(clean) ? `'${clean}` : clean
}

function reportFor(rows: ImportRow[]) {
  const lines = ["satir;sonuc;aciklama;ad;telefon"]
  for (const row of rows) {
    if (row.kind === "yeni") continue
    lines.push([row.line, row.kind, row.note, row.name, row.phone].map((item) => safeCell(String(item))).join(";"))
  }
  return lines.join("\n")
}

function shown(row: Prepared): ImportRow {
  return {
    line: row.line,
    kind: row.kind,
    name: row.name,
    city: row.city,
    district: row.district,
    phone: row.phone,
    note: row.note,
    changes: row.changes,
    targetId: row.targetId,
  }
}

export function classifyGrid(grid: SheetGrid, map: string[], book: ListingBook): ImportPreview {
  const needed = ["name", "category", "city", "district", "phone", "summary"]
  if (needed.some((field) => !map.includes(field))) {
    const rows = [{ line: 1, kind: "hata" as const, name: "", city: "", district: "", phone: "", note: "Ad, kategori, il, ilçe, telefon ve kısa açıklama eşlenmeli.", changes: [] }]
    return { headers: grid.headers, map, total: grid.rows.length, counts: { yeni: 0, zaten: 0, guncelle: 0, olasi: 0, hata: 1 }, rows, report: reportFor(rows) }
  }
  const fingers = fingersOf(book)
  const pending: Draft[] = []
  const claimed = new Set<string>()
  const prepared = grid.rows.map((row) => mark(prepareRow(row.line, row.cells, map), fingers, pending, claimed))
  if (grid.overflow) prepared.push(faultRow(sheetRowCap + 2, `${grid.overflow} satır ${sheetRowCap} sınırının dışında kaldı.`))
  if (!prepared.length) prepared.push(faultRow(1, "Dosyada işletme satırı yok."))
  const rows = prepared.map(shown)
  const counts = { yeni: 0, zaten: 0, guncelle: 0, olasi: 0, hata: 0 }
  for (const row of rows) counts[row.kind] += 1
  return { headers: grid.headers, map, total: grid.rows.length + grid.overflow, counts, rows, report: reportFor(rows) }
}

function flags(draft: Draft, fallback: PublishState) {
  const status = draft.status ?? fallback
  const live = status === "yayinda"
  return {
    hidden: !live,
    review: live ? undefined : status,
    verified: live && draft.verified !== false,
    premium: live && draft.premium === true,
  }
}

export function commitImport(
  grid: SheetGrid,
  map: string[],
  book: ListingBook,
  nowIso: string,
  choice: { updates: number[]; force: number[]; publish: PublishState },
) {
  const preview = classifyGrid(grid, map, book)
  const updates = new Set(choice.updates)
  const force = new Set(choice.force)
  let current = book
  const written: StoredListing[] = []
  let added = 0
  let updated = 0
  let held = 0
  const prepared = new Map(grid.rows.map((row) => [row.line, prepareRow(row.line, row.cells, map)]))
  for (const row of preview.rows) {
    const draft = prepared.get(row.line)?.value
    if (row.kind === "hata" || row.kind === "zaten" || !draft) continue
    if (row.kind === "olasi" && !force.has(row.line)) {
      held += 1
      continue
    }
    if (row.kind === "guncelle") {
      if (!updates.has(row.line)) {
        held += 1
        continue
      }
      const target = current.listings.find((item) => item.id === row.targetId)
      if (!target) continue
      const nextFlags = flags(draft, storedStatus(target))
      const next: StoredListing = {
        ...target,
        name: draft.name,
        category: draft.category,
        subcategory: draft.subcategory,
        city: draft.city,
        district: draft.district,
        address: draft.address,
        phone: draft.phone,
        summary: draft.summary,
        about: draft.summary,
        booking: draft.booking,
        website: draft.provided.website ? draft.website : target.website,
        lat: draft.provided.place ? draft.lat : target.lat,
        lng: draft.provided.place ? draft.lng : target.lng,
        verified: draft.provided.verified ? nextFlags.verified : target.verified,
        premium: draft.provided.premium ? nextFlags.premium : target.premium,
        hidden: draft.provided.status ? nextFlags.hidden : target.hidden,
        review: draft.provided.status ? nextFlags.review : target.review,
      }
      current = { listings: current.listings.map((item) => (item.id === target.id ? next : item)) }
      written.push(next)
      updated += 1
      continue
    }
    const state = flags(draft, choice.publish)
    if (current.listings.length >= listingCap) {
      held += 1
      continue
    }
    const listing = buildImportedListing({ ...draft, ...state }, nowIso, current.listings)
    current = { listings: [listing, ...current.listings] }
    written.push(listing)
    added += 1
  }
  return { book: current, listings: written, added, updated, held, preview }
}

export async function gridFromBody(body: Record<string, unknown>) {
  if (typeof body.xlsx === "string" && body.xlsx.trim()) {
    const bytes = bytesFromBase64(body.xlsx.trim())
    if (!bytes) return { error: "invalid" as const }
    const grid = await readXlsxGrid(bytes)
    if ("error" in grid) return { error: "bozuk" as const }
    return { grid }
  }
  const text = typeof body.text === "string" ? body.text : ""
  if (!text.trim() || text.length > sheetByteCap) return { error: "invalid" as const }
  const grid = readCsvGrid(text)
  if ("error" in grid) return { error: "invalid" as const }
  return { grid }
}

export function publishChoice(value: unknown): PublishState {
  return value === "taslak" || value === "yayinda" || value === "onay" ? value : "onay"
}

export function numberList(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((item) => Number.isInteger(item) && item > 0 && item < 100000).slice(0, sheetRowCap)
}

export function parseImportLog(raw: string | null): ImportNote[] {
  if (!raw) return []
  try {
    const data = JSON.parse(raw) as { items?: unknown }
    if (!Array.isArray(data.items)) return []
    return data.items.filter((item): item is ImportNote => {
      if (!item || typeof item !== "object") return false
      const row = item as Partial<ImportNote>
      return typeof row.id === "string" && typeof row.at === "string" && typeof row.added === "number"
    }).slice(0, 12)
  } catch {
    return []
  }
}

export function withImportNote(raw: string | null, note: ImportNote) {
  return JSON.stringify({ items: [note, ...parseImportLog(raw)].slice(0, 12) })
}
