import { fold } from "@/lib/format"

/**
 * Public Pinwego business identity.
 *
 * The number is a permanent label for one listing. It is not a password,
 * not a session, and not proof that the business is verified. A branch is
 * its own listing, so it receives its own number. The internal id stays
 * the key used by CRM, views, campaigns and QR events.
 *
 * Nine digits: eight from the record key, plus a Verhoeff check digit.
 * A single wrong digit or an adjacent swap fails the check instead of
 * opening a different business. One hundred million bodies is enough for
 * a global directory; the check digit is why this is nine digits, not six.
 */

const BODY = 8

const verhoeffD = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]

const verhoeffP = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]

const verhoeffInv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]

const labels = new Set(["pinwego", "pin", "id", "no", "numara", "numarasi", "isletme", "kimlik"])

export type PinQuery = {
  raw: string
  digits: string
  pin: string
  display: string
  valid: boolean
}

function mix(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function verhoeffOk(digits: string) {
  if (!/^\d+$/.test(digits)) return false
  let checksum = 0
  for (let index = digits.length - 1, position = 0; index >= 0; index -= 1, position += 1) {
    checksum = verhoeffD[checksum][verhoeffP[position % 8][Number(digits[index])]]
  }
  return checksum === 0
}

export function verhoeffCheck(body: string) {
  let checksum = 0
  for (let index = body.length - 1, position = 1; index >= 0; index -= 1, position += 1) {
    checksum = verhoeffD[checksum][verhoeffP[position % 8][Number(body[index])]]
  }
  return String(verhoeffInv[checksum])
}

function bodyFromKey(key: string) {
  const left = mix(`pinwego.pin.v1:${key}`)
  const right = mix(`pinwego.pin.v2:${key}`)
  const mixed = (Math.imul(left, 0x9e3779b1) ^ right) >>> 0
  return String(mixed % 100_000_000).padStart(BODY, "0")
}

/** Canonical `PW-` plus nine digits. Stable for the same key. */
export function pinFromKey(key: string) {
  const clean = key.trim()
  if (!clean) return ""
  const body = bodyFromKey(clean)
  return `PW-${body}${verhoeffCheck(body)}`
}

export function displayPin(pin: string) {
  const digits = pin.replace(/\D/g, "")
  if (digits.length !== 9) return pin.trim()
  return `PW-${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
}

export function pinPath(pin: string) {
  const digits = pin.replace(/\D/g, "")
  return `/isletme/PW-${digits}`
}

export function pinUrl(pin: string) {
  return `https://pinwego.com${pinPath(pin)}`
}

/**
 * Issue a pin for a new listing. The first choice depends only on the
 * record key. A later record that collides takes the next salt; existing
 * pins are never rewritten.
 */
export function assignPin(key: string, taken: Iterable<string> = []) {
  const used = new Set<string>()
  for (const item of taken) {
    const digits = item.replace(/\D/g, "")
    if (digits.length === 9) used.add(digits)
  }
  for (let salt = 0; salt < 16; salt += 1) {
    const pin = pinFromKey(salt === 0 ? key : `${key}\u0000${salt}`)
    const digits = pin.slice(3)
    if (pin && !used.has(digits)) return pin
  }
  return pinFromKey(`${key}\u0000${key.length}`)
}

export function businessPin(business: { id: string; pin?: string }) {
  const parsed = business.pin ? parsePinQuery(business.pin) : null
  if (parsed?.valid) return parsed.pin
  return pinFromKey(business.id)
}

export function pinMatches(pin: string | undefined, route: string) {
  const query = parsePinQuery(route)
  if (!query?.valid || !pin) return false
  return pin.replace(/\D/g, "") === query.digits
}

/**
 * A query is a Pinwego id only when the whole text is the number,
 * optionally with a PW prefix and words such as "işletme id".
 * A sentence that merely contains digits stays a normal search.
 * `valid: false` means the visitor tried an id and the check digit failed.
 */
export function parsePinQuery(value: string): PinQuery | null {
  const raw = value.trim()
  if (!raw || raw.length > 64) return null
  const tokens = fold(raw).split(" ").filter(Boolean)
  if (!tokens.length || tokens.length > 8) return null
  const stray = tokens.filter((token) => !/^\d+$/.test(token) && token !== "pw" && !labels.has(token))
  if (stray.length) return null
  const digits = tokens.filter((token) => /^\d+$/.test(token)).join("")
  const hadPw = tokens.includes("pw")
  if (!digits) return null
  if (!hadPw && digits.length !== 9) return null
  if (hadPw && (digits.length < 6 || digits.length > 12)) return null
  const valid = digits.length === 9 && verhoeffOk(digits)
  const pin = valid ? `PW-${digits}` : ""
  return {
    raw,
    digits,
    pin,
    display: valid ? displayPin(pin) : raw,
    valid,
  }
}
