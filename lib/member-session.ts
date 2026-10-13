import { accountKey, type AccountStore, type PublicAccount } from "@/lib/account-record"
import { normalizeEmail } from "@/lib/auth-session"
import { newSecret, sha256Hex } from "@/lib/mail-policy"

const prefix = "acctsess:"
export const memberSessionTtlSec = 14 * 24 * 60 * 60

export async function openMemberSession(store: AccountStore, email: string) {
  const token = newSecret()
  await store.put(`${prefix}${await sha256Hex(token)}`, normalizeEmail(email), { expirationTtl: memberSessionTtlSec })
  return token
}

export async function memberEmail(store: AccountStore, token: string) {
  if (token.length < 20 || token.length > 200) return ""
  const email = await store.get(`${prefix}${await sha256Hex(token)}`)
  if (!email || !email.includes("@")) return ""
  return normalizeEmail(email)
}

export async function closeMemberSession(store: AccountStore, token: string) {
  if (token.length < 20 || token.length > 200) return
  await store.delete(`${prefix}${await sha256Hex(token)}`)
}

export async function publicAccount(store: AccountStore, email: string): Promise<PublicAccount | null> {
  const raw = await store.get(accountKey(email))
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as Partial<PublicAccount> & { passwordHash?: string }
    if (data.role !== "musteri" && data.role !== "isletme") return null
    if (typeof data.email !== "string" || typeof data.id !== "string" || typeof data.name !== "string") return null
    return {
      id: data.id,
      role: data.role,
      email: data.email,
      name: data.name,
      phone: typeof data.phone === "string" ? data.phone : "",
      createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
      customer: data.customer,
      business: data.business,
      emailVerified: data.emailVerified !== false,
      credentialVersion: data.credentialVersion ?? 1,
    }
  } catch {
    return null
  }
}

export function readMemberCookie(header: string | null) {
  if (!header) return ""
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=")
    if (name === "pinwego_acct") return decodeURIComponent(rest.join("="))
  }
  return ""
}

export function memberSessionCookie(token: string, secure: boolean) {
  const parts = [`pinwego_acct=${encodeURIComponent(token)}`, "HttpOnly", "Path=/", `Max-Age=${memberSessionTtlSec}`, "SameSite=Lax"]
  if (secure) parts.push("Secure")
  return parts.join("; ")
}

export function clearMemberCookie(secure: boolean) {
  const parts = ["pinwego_acct=", "HttpOnly", "Path=/", "Max-Age=0", "SameSite=Lax"]
  if (secure) parts.push("Secure")
  return parts.join("; ")
}

export function requestIsSecure(request: Request) {
  return new URL(request.url).protocol === "https:"
}
