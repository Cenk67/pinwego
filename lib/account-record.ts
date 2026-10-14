import { normalizeEmail } from "@/lib/auth-session"
import { adultBirthDate, validBirthDate, validEmail, validGsm, validPassword, validPhone, validTckn, validVkn } from "@/lib/identity"
import { newSecret, nextBucket, sha256Hex } from "@/lib/mail-policy"

export type AccountStatus = "bekliyor" | "aktif" | "askida" | "silindi"

export type CustomerRecord = {
  firstName?: string
  lastName?: string
  birthDate: string
  occupation?: string
  nationalId?: string
}

export type PublicAccount = {
  id: string
  role: "musteri" | "isletme"
  email: string
  name: string
  phone: string
  createdAt: string
  customer?: {
    firstName: string
    lastName: string
    birthDate: string
    occupation: string
    legacyId: boolean
  }
  business?: { owner: string; taxId: string; taxOffice: string; city: string; address: string }
  emailVerified: boolean
  credentialVersion: number
  status: AccountStatus
  verifiedAt: string
  updatedAt: string
  lastLoginAt: string
}

type StoredAccount = {
  id: string
  role: "musteri" | "isletme"
  email: string
  name: string
  phone: string
  createdAt: string
  customer?: CustomerRecord
  business?: PublicAccount["business"]
  passwordSalt: string
  passwordHash: string
  emailVerified?: boolean
  credentialVersion?: number
  status?: AccountStatus
  verifiedAt?: string
  updatedAt?: string
  lastLoginAt?: string
  verifyHash?: string
  verifyExp?: number
  resetHash?: string
  resetExp?: number
}

export type AccountStore = {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

export type AccountResult =
  | { ok: true; account: PublicAccount }
  | { ok: false; reason: "exists" | "invalid" | "mismatch" | "unknown" | "unverified" | "askida" | "silindi"; role?: "musteri" | "isletme" }

export type TokenResult =
  | { ok: true; token: string }
  | { ok: false; reason: "unknown" | "verified" | "invalid" }

export type ConsumeResult =
  | { ok: true; account: PublicAccount }
  | { ok: false; reason: "invalid" | "expired" | "used" | "weak"; accountId?: string }

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

export function accountStatus(account: { status?: string; emailVerified?: boolean }): AccountStatus {
  if (account.status === "bekliyor" || account.status === "aktif" || account.status === "askida" || account.status === "silindi") return account.status
  return account.emailVerified === false ? "bekliyor" : "aktif"
}

function presentCustomer(customer: CustomerRecord | undefined): PublicAccount["customer"] {
  if (!customer) return undefined
  return {
    firstName: customer.firstName ?? "",
    lastName: customer.lastName ?? "",
    birthDate: customer.birthDate ?? "",
    occupation: customer.occupation ?? "",
    legacyId: Boolean(customer.nationalId),
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
    customer: presentCustomer(account.customer),
    business: account.business,
    emailVerified: account.emailVerified !== false,
    credentialVersion: account.credentialVersion ?? 1,
    status: accountStatus(account),
    verifiedAt: account.verifiedAt ?? "",
    updatedAt: account.updatedAt ?? account.createdAt,
    lastLoginAt: account.lastLoginAt ?? "",
  }
}

export function presentAccount(value: unknown): PublicAccount | null {
  if (!value || typeof value !== "object") return null
  const data = value as Partial<StoredAccount>
  if (data.role !== "musteri" && data.role !== "isletme") return null
  if (typeof data.email !== "string" || typeof data.id !== "string" || typeof data.name !== "string") return null
  return publish({
    id: data.id,
    role: data.role,
    email: data.email,
    name: data.name,
    phone: typeof data.phone === "string" ? data.phone : "",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    customer: data.customer,
    business: data.business,
    passwordSalt: "",
    passwordHash: "",
    emailVerified: data.emailVerified,
    credentialVersion: data.credentialVersion,
    status: data.status,
    verifiedAt: data.verifiedAt,
    updatedAt: data.updatedAt,
    lastLoginAt: data.lastLoginAt,
  })
}

function profile(body: Record<string, unknown>, role: "musteri" | "isletme") {
  if (role === "musteri") {
    const customer = body.customer
    if (!customer || typeof customer !== "object") return null
    const row = customer as Record<string, unknown>
    const firstName = clean(row.firstName, 40)
    const lastName = clean(row.lastName, 40)
    const birthDate = clean(row.birthDate, 10)
    const occupation = clean(row.occupation, 80)
    if (firstName || lastName || occupation) {
      if (firstName.length < 2 || lastName.length < 2 || occupation.length < 2 || !validBirthDate(birthDate)) return null
      return { kind: "customer-new" as const, customer: { firstName, lastName, birthDate, occupation }, displayName: `${firstName} ${lastName}` }
    }
    const nationalId = clean(row.nationalId, 11).replace(/\D/g, "")
    if (!validTckn(nationalId) || !adultBirthDate(birthDate)) return null
    return { kind: "customer-legacy" as const, customer: { nationalId, birthDate } }
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
  return { kind: "business" as const, business: { owner, taxId, taxOffice, city, address } }
}

export async function registerInStore(
  store: AccountStore,
  body: unknown,
  now = "2026-01-01T00:00:00.000Z",
  options?: { emailVerified?: boolean },
): Promise<AccountResult> {
  if (!body || typeof body !== "object") return { ok: false, reason: "invalid" }
  const row = body as Record<string, unknown>
  const email = normalizeEmail(clean(row.email, 180))
  const password = typeof row.password === "string" ? row.password : ""
  const role = row.role === "isletme" ? "isletme" : row.role === "musteri" ? "musteri" : ""
  const name = clean(row.name, 81)
  const phone = clean(row.phone, 24)
  const extra = role ? profile(row, role) : null
  const phoneOk = extra?.kind === "customer-new" ? validGsm(phone) : validPhone(phone)
  const displayName = extra && "displayName" in extra && typeof extra.displayName === "string" ? extra.displayName : name
  if (!role || !extra || !validEmail(email) || !validPassword(password.trim()) || password.length > 200 || displayName.length < 2 || !phoneOk) {
    return { ok: false, reason: "invalid" }
  }
  const key = accountKey(email)
  if (await store.get(key)) return { ok: false, reason: "exists" }
  const requested = clean(row.id, 36)
  const id = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requested) ? requested : crypto.randomUUID()
  const passwordSalt = await newSalt()
  const passwordHash = await hashPassword(password, passwordSalt)
  const pendingMail = options?.emailVerified === false
  const stored: StoredAccount = {
    id,
    role,
    email,
    name: displayName,
    phone,
    createdAt: now,
    passwordSalt,
    passwordHash,
    credentialVersion: 1,
    status: pendingMail ? "bekliyor" : "aktif",
    updatedAt: now,
    ...(pendingMail ? { emailVerified: false } : { verifiedAt: now }),
    ...(extra.kind === "business" ? { business: extra.business } : { customer: extra.customer }),
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
  const status = accountStatus(stored)
  if (status === "silindi") return { ok: false, reason: "silindi" }
  if (status === "askida") return { ok: false, reason: "askida" }
  if (stored.emailVerified === false) return { ok: false, reason: "unverified", role: stored.role }
  const stamp = new Date().toISOString()
  const next: StoredAccount = { ...stored, lastLoginAt: stamp, updatedAt: stamp }
  await store.put(accountKey(stored.email), JSON.stringify(next))
  return { ok: true, account: publish(next) }
}

const verifyTtl = 24 * 60 * 60 * 1000
const resetTtl = 60 * 60 * 1000
const failWindow = 15 * 60 * 1000
const failLimit = 8

function tokenKey(hash: string) {
  return `tok:${hash}`
}

function usedKey(hash: string) {
  return `used:${hash}`
}

function failKey(hash: string) {
  return `fail:${hash}`
}

async function emailHash(email: string) {
  return (await sha256Hex(normalizeEmail(email))).slice(0, 32)
}

export async function loginLimited(store: AccountStore, email: string, now: number) {
  const raw = await store.get(failKey(await emailHash(email)))
  if (!raw) return false
  try {
    const current = JSON.parse(raw) as { n?: number; start?: number }
    return typeof current.n === "number" && typeof current.start === "number" && now - current.start < failWindow && current.n >= failLimit
  } catch {
    return false
  }
}

export async function noteLogin(store: AccountStore, email: string, now: number, ok: boolean) {
  const key = failKey(await emailHash(email))
  if (ok) {
    await store.delete(key)
    return
  }
  const raw = await store.get(key)
  let current: { n: number; start: number } | null = null
  try {
    current = raw ? (JSON.parse(raw) as { n: number; start: number }) : null
  } catch {
    current = null
  }
  const slot = nextBucket(current, now, failLimit, failWindow)
  await store.put(key, JSON.stringify(slot.next), { expirationTtl: Math.ceil(failWindow / 1000) })
}

export async function takeEmailSlot(store: AccountStore, purpose: string, email: string, now: number, limit: number, windowMs: number) {
  const key = `rl:${purpose}:${await emailHash(email)}`
  const raw = await store.get(key)
  let current: { n: number; start: number } | null = null
  try {
    current = raw ? (JSON.parse(raw) as { n: number; start: number }) : null
  } catch {
    current = null
  }
  const slot = nextBucket(current && typeof current.n === "number" ? current : null, now, limit, windowMs)
  await store.put(key, JSON.stringify(slot.next), { expirationTtl: Math.max(60, Math.ceil(windowMs / 1000)) })
  return slot.ok
}

export async function issueMailToken(store: AccountStore, email: string, purpose: "verify" | "reset", now: number): Promise<TokenResult> {
  const stored = asStored(await store.get(accountKey(email)))
  if (!stored || accountStatus(stored) === "silindi") return { ok: false, reason: "unknown" }
  if (purpose === "verify" && stored.emailVerified !== false) return { ok: false, reason: "verified" }
  const token = newSecret()
  const hash = await sha256Hex(token)
  const ttl = purpose === "verify" ? verifyTtl : resetTtl
  const exp = now + ttl
  const next: StoredAccount = { ...stored, ...(purpose === "verify" ? { verifyHash: hash, verifyExp: exp } : { resetHash: hash, resetExp: exp }) }
  await store.put(accountKey(stored.email), JSON.stringify(next))
  await store.put(tokenKey(hash), JSON.stringify({ purpose, exp, email: stored.email }), { expirationTtl: Math.ceil(ttl / 1000) })
  return { ok: true, token }
}

export async function consumeMailToken(store: AccountStore, token: string, purpose: "verify" | "reset", now: number, password = ""): Promise<ConsumeResult> {
  const cleanToken = token.trim()
  if (cleanToken.length < 20 || cleanToken.length > 200) return { ok: false, reason: "invalid" }
  const hash = await sha256Hex(cleanToken)
  if (await store.get(usedKey(hash))) return { ok: false, reason: "used" }
  const raw = await store.get(tokenKey(hash))
  if (!raw) return { ok: false, reason: "invalid" }
  let marker: { purpose?: string; exp?: number; email?: string }
  try {
    marker = JSON.parse(raw) as { purpose?: string; exp?: number; email?: string }
  } catch {
    return { ok: false, reason: "invalid" }
  }
  if (marker.purpose !== purpose || typeof marker.email !== "string" || typeof marker.exp !== "number") return { ok: false, reason: "invalid" }
  const stored = asStored(await store.get(accountKey(marker.email)))
  const expected = purpose === "verify" ? stored?.verifyHash : stored?.resetHash
  const expiry = purpose === "verify" ? stored?.verifyExp : stored?.resetExp
  if (!stored || expected !== hash || expiry !== marker.exp) return { ok: false, reason: "invalid" }
  if (marker.exp <= now) {
    await clearToken(store, stored, purpose, hash)
    return { ok: false, reason: "expired", accountId: stored.id }
  }
  if (purpose === "reset" && (!validPassword(password.trim()) || password.length > 200)) return { ok: false, reason: "weak" }
  const next: StoredAccount = { ...stored }
  const stamp = new Date(now).toISOString()
  if (purpose === "verify") {
    if (accountStatus(stored) === "silindi") {
      await clearToken(store, stored, purpose, hash)
      return { ok: false, reason: "invalid" }
    }
    next.emailVerified = true
    next.verifiedAt = stored.verifiedAt || stamp
    next.updatedAt = stamp
    if (accountStatus(stored) !== "askida") next.status = "aktif"
    delete next.verifyHash
    delete next.verifyExp
  } else {
    next.passwordSalt = await newSalt()
    next.passwordHash = await hashPassword(password, next.passwordSalt)
    next.credentialVersion = (stored.credentialVersion ?? 1) + 1
    delete next.resetHash
    delete next.resetExp
  }
  await store.put(usedKey(hash), "1", { expirationTtl: 24 * 60 * 60 })
  await store.delete(tokenKey(hash))
  await store.put(accountKey(stored.email), JSON.stringify(next))
  return { ok: true, account: publish(next) }
}

async function clearToken(store: AccountStore, stored: StoredAccount, purpose: "verify" | "reset", hash: string) {
  const next: StoredAccount = { ...stored }
  if (purpose === "verify") {
    delete next.verifyHash
    delete next.verifyExp
  } else {
    delete next.resetHash
    delete next.resetExp
  }
  await store.put(usedKey(hash), "1", { expirationTtl: 24 * 60 * 60 })
  await store.delete(tokenKey(hash))
  await store.put(accountKey(stored.email), JSON.stringify(next))
}

export async function credentialStill(store: AccountStore, email: string, version: number) {
  const stored = asStored(await store.get(accountKey(email)))
  if (!stored) return true
  return (stored.credentialVersion ?? 1) === version
}

export async function setCustomerStatus(store: AccountStore, email: string, status: "aktif" | "askida" | "silindi", nowIso: string) {
  const stored = asStored(await store.get(accountKey(email)))
  if (!stored || stored.role !== "musteri") return null
  if (status === "aktif" && (stored.emailVerified === false || accountStatus(stored) === "silindi")) return null
  const next: StoredAccount = { ...stored, status, updatedAt: nowIso }
  if (status === "silindi") {
    next.name = "Silinen hesap"
    next.phone = ""
    next.customer = { firstName: "", lastName: "", birthDate: "", occupation: "" }
  }
  await store.put(accountKey(stored.email), JSON.stringify(next))
  return publish(next)
}

export async function correctCustomerFields(
  store: AccountStore,
  email: string,
  fields: { firstName: string; lastName: string; birthDate: string; occupation: string; phone: string },
  nowIso: string,
) {
  const stored = asStored(await store.get(accountKey(email)))
  if (!stored || stored.role !== "musteri" || accountStatus(stored) === "silindi") return null
  const firstName = clean(fields.firstName, 40)
  const lastName = clean(fields.lastName, 40)
  const birthDate = clean(fields.birthDate, 10)
  const occupation = clean(fields.occupation, 80)
  const phone = clean(fields.phone, 24)
  if (firstName.length < 2 || lastName.length < 2 || occupation.length < 2 || !validBirthDate(birthDate) || !validGsm(phone)) return "invalid" as const
  const next: StoredAccount = {
    ...stored,
    name: `${firstName} ${lastName}`.slice(0, 81),
    phone,
    updatedAt: nowIso,
    customer: {
      firstName,
      lastName,
      birthDate,
      occupation,
      ...(stored.customer?.nationalId ? { nationalId: stored.customer.nationalId } : {}),
    },
  }
  await store.put(accountKey(stored.email), JSON.stringify(next))
  return publish(next)
}
