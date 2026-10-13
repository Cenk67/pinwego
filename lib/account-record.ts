import { normalizeEmail } from "@/lib/auth-session"
import { adultBirthDate, validEmail, validPassword, validPhone, validTckn, validVkn } from "@/lib/identity"

export type PublicAccount = {
  id: string
  role: "musteri" | "isletme"
  email: string
  name: string
  phone: string
  createdAt: string
  customer?: { nationalId: string; birthDate: string }
  business?: { owner: string; taxId: string; taxOffice: string; city: string; address: string }
}

type StoredAccount = PublicAccount & { passwordSalt: string; passwordHash: string }

export type AccountStore = {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
}

export type AccountResult =
  | { ok: true; account: PublicAccount }
  | { ok: false; reason: "exists" | "invalid" | "mismatch" | "unknown" }

const rounds = 1000

function clean(value: unknown, max: number) {
  if (typeof value !== "string") return ""
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
}

function hex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function sameHex(left: string, right: string) {
  if (left.length !== right.length) return false
  let diff = 0
  for (let index = 0; index < left.length; index += 1) diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return diff === 0
}

export function accountKey(email: string) {
  return `acct:${normalizeEmail(email).slice(0, 180)}`
}

export async function hashPassword(password: string, salt: string) {
  let data: BufferSource = new TextEncoder().encode(`${salt}\0${password.trim()}`)
  for (let index = 0; index < rounds; index += 1) {
    data = new Uint8Array(await crypto.subtle.digest("SHA-256", data))
  }
  return hex(new Uint8Array(data as ArrayBuffer))
}

async function newSalt() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return hex(bytes)
}

function asStored(value: string | null): StoredAccount | null {
  if (!value) return null
  try {
    const data = JSON.parse(value) as Partial<StoredAccount>
    if (!data || data.role !== "musteri" && data.role !== "isletme") return null
    if (typeof data.email !== "string" || typeof data.passwordHash !== "string" || typeof data.passwordSalt !== "string") return null
    if (typeof data.id !== "string" || typeof data.name !== "string") return null
    return data as StoredAccount
  } catch {
    return null
  }
}

function publish(account: StoredAccount): PublicAccount {
  return {
    id: account.id,
    role: account.role,
    email: account.email,
    name: account.name,
    phone: account.phone,
    createdAt: account.createdAt,
    customer: account.customer,
    business: account.business,
  }
}

function profile(body: Record<string, unknown>, role: "musteri" | "isletme") {
  if (role === "musteri") {
    const customer = body.customer
    if (!customer || typeof customer !== "object") return null
    const row = customer as Record<string, unknown>
    const nationalId = clean(row.nationalId, 11).replace(/\D/g, "")
    const birthDate = clean(row.birthDate, 10)
    if (!validTckn(nationalId) || !adultBirthDate(birthDate)) return null
    return { customer: { nationalId, birthDate } }
  }
  const business = body.business
  if (!business || typeof business !== "object") return null
  const row = business as Record<string, unknown>
  const owner = clean(row.owner, 80)
  const taxId = clean(row.taxId, 10).replace(/\D/g, "")
  const taxOffice = clean(row.taxOffice, 80)
  const city = clean(row.city, 60)
  const address = clean(row.address, 180)
  if (owner.split(" ").length < 2 || !validVkn(taxId) || taxOffice.length < 2 || city.length < 2 || address.length < 8) return null
  return { business: { owner, taxId, taxOffice, city, address } }
}

export async function registerInStore(store: AccountStore, body: unknown, now = "2026-01-01T00:00:00.000Z"): Promise<AccountResult> {
  if (!body || typeof body !== "object") return { ok: false, reason: "invalid" }
  const row = body as Record<string, unknown>
  const email = normalizeEmail(clean(row.email, 180))
  const password = typeof row.password === "string" ? row.password : ""
  const role = row.role === "isletme" ? "isletme" : row.role === "musteri" ? "musteri" : ""
  const name = clean(row.name, 80)
  const phone = clean(row.phone, 20)
  if (!role || !validEmail(email) || !validPassword(password.trim()) || password.length > 200 || name.length < 2 || !validPhone(phone)) {
    return { ok: false, reason: "invalid" }
  }
  const extra = profile(row, role)
  if (!extra) return { ok: false, reason: "invalid" }
  const key = accountKey(email)
  if (await store.get(key)) return { ok: false, reason: "exists" }
  const requested = clean(row.id, 36)
  const id = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requested) ? requested : crypto.randomUUID()
  const passwordSalt = await newSalt()
  const passwordHash = await hashPassword(password, passwordSalt)
  const stored: StoredAccount = {
    id,
    role,
    email,
    name,
    phone,
    createdAt: now,
    passwordSalt,
    passwordHash,
    ...extra,
  }
  await store.put(key, JSON.stringify(stored))
  return { ok: true, account: publish(stored) }
}

export async function loginInStore(store: AccountStore, body: unknown): Promise<AccountResult> {
  if (!body || typeof body !== "object") return { ok: false, reason: "invalid" }
  const row = body as Record<string, unknown>
  const email = normalizeEmail(clean(row.email, 180))
  const password = typeof row.password === "string" ? row.password : ""
  if (!validEmail(email) || password.length < 8 || password.length > 200) return { ok: false, reason: "invalid" }
  const stored = asStored(await store.get(accountKey(email)))
  const salt = stored?.passwordSalt ?? "00000000000000000000000000000000"
  const hash = await hashPassword(password, salt)
  if (!stored) return { ok: false, reason: "unknown" }
  if (!sameHex(hash, stored.passwordHash)) return { ok: false, reason: "mismatch" }
  return { ok: true, account: publish(stored) }
}
