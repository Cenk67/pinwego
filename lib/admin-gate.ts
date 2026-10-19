import { hashPassword, type AccountStore } from "@/lib/account-record"
import { normalizeEmail } from "@/lib/auth-session"
import { newSecret, nextBucket, sha256Hex } from "@/lib/mail-policy"

function sameHex(left: string, right: string) {
  if (left.length !== right.length) return false
  let diff = 0
  for (let index = 0; index < left.length; index += 1) diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return diff === 0
}

export type AdminSecrets = {
  login: string
  salt: string
  hash: string
  otpTo: string
}

const otpKey = "admin:otp"
const sessionPrefix = "admin:sess:"
export const adminCodeTtlMs = 10 * 60 * 1000
export const adminSessionTtlSec = 12 * 60 * 60
export const adminPasswordFailLimit = 40
export const adminPasswordWindowMs = 30 * 60 * 1000
export const adminCodeSendLimit = 15
export const adminCodeSendWindowMs = 30 * 60 * 1000
export const adminCodeFailLimit = 12
export const adminCodeWindowMs = 15 * 60 * 1000
export const adminOtpMissLimit = 8
export const adminAttemptPurpose = {
  password: "sifre",
  codeSend: "kod-gonder",
  codeTry: "kod-dene",
} as const

export async function passwordAccepted(email: string, password: string, secrets: AdminSecrets) {
  const hashed = await hashPassword(typeof password === "string" ? password : "", secrets.salt)
  const mailOk = sameHex(await sha256Hex(normalizeEmail(email)), await sha256Hex(normalizeEmail(secrets.login)))
  const passOk = sameHex(hashed, secrets.hash)
  return mailOk && passOk
}

function eightDigits() {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  const value = new DataView(bytes.buffer).getUint32(0) % 100_000_000
  return value.toString().padStart(8, "0")
}

export async function issueAdminOtp(store: AccountStore, now: number) {
  const code = eightDigits()
  await store.put(
    otpKey,
    JSON.stringify({ hash: await sha256Hex(code), exp: now + adminCodeTtlMs }),
    { expirationTtl: Math.ceil(adminCodeTtlMs / 1000) },
  )
  return code
}

export async function clearAdminOtp(store: AccountStore) {
  await store.delete(otpKey)
}

export async function consumeAdminOtp(store: AccountStore, code: string, now: number) {
  const clean = code.trim()
  if (!/^\d{8}$/.test(clean)) return "invalid" as const
  const raw = await store.get(otpKey)
  if (!raw) return "invalid" as const
  let row: { hash?: string; exp?: number; miss?: number }
  try {
    row = JSON.parse(raw) as { hash?: string; exp?: number; miss?: number }
  } catch {
    return "invalid" as const
  }
  if (!row.hash || typeof row.exp !== "number") return "invalid" as const
  if (row.exp <= now) {
    await store.delete(otpKey)
    return "expired" as const
  }
  if (!sameHex(await sha256Hex(clean), row.hash)) {
    const miss = (typeof row.miss === "number" ? row.miss : 0) + 1
    if (miss >= adminOtpMissLimit) {
      await store.delete(otpKey)
      return "invalid" as const
    }
    const left = Math.max(1, Math.ceil((row.exp - now) / 1000))
    await store.put(otpKey, JSON.stringify({ hash: row.hash, exp: row.exp, miss }), { expirationTtl: left })
    return "invalid" as const
  }
  await store.delete(otpKey)
  return "ok" as const
}

export async function openAdminSession(store: AccountStore) {
  const token = newSecret()
  await store.put(`${sessionPrefix}${await sha256Hex(token)}`, "1", { expirationTtl: adminSessionTtlSec })
  return token
}

export async function adminSessionOpen(store: AccountStore, token: string) {
  if (token.length < 20 || token.length > 200) return false
  return (await store.get(`${sessionPrefix}${await sha256Hex(token)}`)) === "1"
}

export async function closeAdminSession(store: AccountStore, token: string) {
  if (token.length < 20 || token.length > 200) return
  await store.delete(`${sessionPrefix}${await sha256Hex(token)}`)
}

export function adminCodeMail(code: string) {
  const text = `pinwego yönetici girişi için kod: ${code}\n\nKod 10 dakika geçerlidir ve bir kez kullanılır. Bu girişi sen denemediysen mektubu yok say.`
  const html = `<p>pinwego yönetici girişi için kod:</p><p style="font-size:28px;letter-spacing:4px"><strong>${code}</strong></p><p>Kod 10 dakika geçerlidir ve bir kez kullanılır. Bu girişi sen denemediysen mektubu yok say.</p>`
  return { subject: "pinwego yönetici kodu", text, html }
}

export function readAdminCookie(header: string | null) {
  if (!header) return ""
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=")
    if (name === "pinwego_admin") return decodeURIComponent(rest.join("="))
  }
  return ""
}

export function adminSessionCookie(token: string, secure: boolean) {
  const parts = [`pinwego_admin=${encodeURIComponent(token)}`, "HttpOnly", "Path=/", "Max-Age=43200", "SameSite=Lax"]
  if (secure) parts.push("Secure")
  return parts.join("; ")
}

export function clearAdminCookie(secure: boolean) {
  const parts = ["pinwego_admin=", "HttpOnly", "Path=/", "Max-Age=0", "SameSite=Lax"]
  if (secure) parts.push("Secure")
  return parts.join("; ")
}

type AttemptBucket = { n: number; start: number }

async function attemptKey(purpose: string, ip: string) {
  return `admin:deneme:${purpose}:${(await sha256Hex(ip || "local")).slice(0, 24)}`
}

function readBucket(raw: string | null): AttemptBucket | null {
  if (!raw) return null
  try {
    const current = JSON.parse(raw) as AttemptBucket
    if (typeof current.n !== "number" || typeof current.start !== "number") return null
    return current
  } catch {
    return null
  }
}

export async function adminAttemptBlocked(store: AccountStore, purpose: string, ip: string, now: number, limit: number, windowMs: number) {
  const current = readBucket(await store.get(await attemptKey(purpose, ip)))
  if (!current) return false
  return now - current.start < windowMs && current.n >= limit
}

export async function noteAdminAttempt(store: AccountStore, purpose: string, ip: string, now: number, limit: number, windowMs: number) {
  const key = await attemptKey(purpose, ip)
  const slot = nextBucket(readBucket(await store.get(key)), now, limit, windowMs)
  await store.put(key, JSON.stringify(slot.next), { expirationTtl: Math.max(60, Math.ceil(windowMs / 1000)) })
  return slot.ok
}

export async function clearAdminAttempt(store: AccountStore, purpose: string, ip: string) {
  await store.delete(await attemptKey(purpose, ip))
}
