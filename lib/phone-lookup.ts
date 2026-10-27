import { displayPhone, isMobileNumber, nationalDigits } from "@/lib/contacts"
import { fold } from "@/lib/format"
import type { Business } from "@/lib/types"

/**
 * Phone lookup reads only numbers a business published on its own listing.
 * Customer accounts are never in this index. A partial number is not matched,
 * so a short or mistyped query cannot land on the wrong business.
 */
export type PhoneLine = "mobile" | "landline" | "whatsapp" | "phone"

export type PhoneQuery = {
  raw: string
  digits: string
  national: string
  e164: string
  display: string
  complete: boolean
  shortCode: boolean
  keys: string[]
}

const LABELS = new Set(["tel", "telefon", "gsm", "whatsapp", "phone", "numara", "no"])

function splitParts(value: string) {
  return value
    .split(/\s*(?:;|\||,|\s+ve\s+)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean)
}

/** Comparable digit keys for one published number, including TR national and +90 forms. */
export function phoneKeys(value: string) {
  const keys = new Set<string>()
  for (const part of splitParts(value)) {
    let digits = part.replace(/\D/g, "")
    if (digits.startsWith("00")) digits = digits.slice(2)
    if (digits.length < 7 || digits.length > 15) continue
    keys.add(digits)
    if (digits.startsWith("90") && digits.length === 12) {
      const national = digits.slice(2)
      keys.add(national)
      keys.add(`0${national}`)
    } else if (digits.startsWith("0") && digits.length === 11) {
      const national = digits.slice(1)
      keys.add(national)
      keys.add(`90${national}`)
    } else if (digits.length === 10) {
      keys.add(`0${digits}`)
      keys.add(`90${digits}`)
    }
  }
  return [...keys]
}

function formatQuery(digits: string, national: string, e164: string, shortCode: boolean) {
  if (national) return displayPhone(national)
  if (shortCode) return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`
  return e164 || digits
}

/**
 * A query is a phone lookup only when it is a number (optional label such as "GSM"),
 * not a sentence that happens to contain digits.
 * `complete: false` means the visitor started a number but it is too short to match.
 */
export function parsePhoneQuery(value: string): PhoneQuery | null {
  const raw = value.trim()
  if (!raw || raw.length > 48) return null
  const tokens = fold(raw).split(" ").filter(Boolean)
  if (!tokens.length) return null
  const words = tokens.filter((token) => !/^\d+$/.test(token))
  if (words.length > 2 || words.some((word) => !LABELS.has(word))) return null
  const digitsRaw = tokens.filter((token) => /^\d+$/.test(token)).join("")
  if (digitsRaw.length < 4 || digitsRaw.length > 15) return null

  const compact = raw.replace(/[^\d+]/g, "")
  const hadPlus = compact.startsWith("+") || compact.startsWith("00")
  const hadSep = /[\s().-]/.test(raw)
  let digits = digitsRaw
  if (digits.startsWith("00")) digits = digits.slice(2)

  const trNational =
    (digits.startsWith("90") && digits.length === 12) ||
    (digits.startsWith("0") && digits.length === 11) ||
    (!hadPlus && !digits.startsWith("0") && digits.length === 10)
  const shortCode = digits.startsWith("444") && digits.length === 7
  const international = hadPlus && digits.length >= 8 && digits.length <= 15 && !(digits.startsWith("90") && digits.length !== 12)
  const localExact = digits.length === 7 && !shortCode && hadSep && !digits.startsWith("0")
  const complete = trNational || shortCode || international || localExact
  if (!complete) {
    const partial =
      (digitsRaw.startsWith("0") && digitsRaw.length >= 4) ||
      (hadPlus && digitsRaw.length >= 4) ||
      (digitsRaw.startsWith("444") && digitsRaw.length >= 3 && digitsRaw.length < 7)
    if (!partial) return null
  }

  let national = ""
  if (digits.startsWith("90") && digits.length === 12) national = digits.slice(2)
  else if (digits.startsWith("0") && digits.length === 11) national = digits.slice(1)
  else if (trNational && digits.length === 10) national = digits

  const e164 = national ? `+90${national}` : hadPlus || digits.startsWith("90") ? `+${digits}` : ""
  const display = formatQuery(digits, national, e164, shortCode)
  return {
    raw,
    digits,
    national,
    e164,
    display,
    complete,
    shortCode,
    keys: complete ? phoneKeys(national ? `0${national}` : e164 || digits) : [],
  }
}

function legacyLine(value: string): PhoneLine {
  if (isMobileNumber(value)) return "mobile"
  const digits = value.replace(/\D/g, "").replace(/^00/, "")
  if (digits.startsWith("444") || nationalDigits(value).length !== 10) return "phone"
  return "landline"
}

export function businessPhoneLines(business: Pick<Business, "phone" | "contacts">) {
  const rows: { line: PhoneLine; value: string }[] = []
  const contacts = business.contacts
  if (contacts?.mobile?.trim()) rows.push({ line: "mobile", value: contacts.mobile })
  if (contacts?.landline?.trim()) rows.push({ line: "landline", value: contacts.landline })
  if (contacts?.whatsapp?.trim()) rows.push({ line: "whatsapp", value: contacts.whatsapp })
  if (business.phone?.trim()) rows.push({ line: legacyLine(business.phone), value: business.phone })
  return rows
    .map((row) => ({ line: row.line, keys: phoneKeys(row.value) }))
    .filter((row) => row.keys.length > 0)
}

/** Exact key overlap. A specific contact line wins over the legacy phone field. */
export function matchPhoneLine(business: Pick<Business, "phone" | "contacts">, phone: PhoneQuery): PhoneLine | null {
  if (!phone.complete || !phone.keys.length) return null
  const want = new Set(phone.keys)
  let legacy: PhoneLine | null = null
  for (const row of businessPhoneLines(business)) {
    if (!row.keys.some((key) => want.has(key))) continue
    if (row.line !== "phone") return row.line
    legacy = "phone"
  }
  return legacy
}

/**
 * The number the visitor already sees. A spaced or punctuated query is kept as
 * typed so Maps searches that same text. A compact +90 string is not sent:
 * Maps regroups +90372… as +90372 280… and the confirmed number disappears.
 */
export function confirmedPhoneText(phone: PhoneQuery) {
  const stripped = phone.raw.trim().replace(/^(?:tel|telefon|gsm|whatsapp|phone|numara|no)\s+/i, "").trim()
  const body = stripped.startsWith("+") ? stripped.slice(1) : stripped
  if (/^[0-9][0-9\s().-]{6,24}$/.test(body) && /[\s().-]/.test(body)) return stripped
  return phone.display
}

function usesTurkeyMaps(phone: PhoneQuery) {
  if (phone.national || phone.shortCode) return true
  if (phone.e164.startsWith("+90")) return true
  return !phone.e164 && phone.digits.length === 7
}

function externalPhoneUrl(phone: PhoneQuery, kind: "maps" | "web") {
  if (!phone.complete) return ""
  const text = confirmedPhoneText(phone)
  if (!/^\+?[0-9][0-9\s().-]{6,24}$/.test(text)) return ""
  const turkey = usesTurkeyMaps(phone)
  const query = encodeURIComponent(text)
  if (kind === "maps") {
    const host = turkey ? "https://www.google.com.tr/maps/search/" : "https://www.google.com/maps/search/"
    return `${host}?api=1&query=${query}${turkey ? "&hl=tr" : ""}`
  }
  const host = turkey ? "https://www.google.com.tr/search" : "https://www.google.com/search"
  return `${host}?q=${query}${turkey ? "&hl=tr" : ""}`
}

export function phoneMapsUrl(phone: PhoneQuery) {
  return externalPhoneUrl(phone, "maps")
}

export function phoneWebUrl(phone: PhoneQuery) {
  return externalPhoneUrl(phone, "web")
}

export function phoneRegisterPath(phone: PhoneQuery) {
  if (!phone.complete) return "/listele"
  const params = new URLSearchParams()
  params.set("tel", phone.display)
  return `/listele?${params.toString()}`
}
