import { takeEmailSlot, type AccountStore } from "@/lib/account-record"
import { deliverMail, mailLog, type OutboundMail } from "@/lib/mailer"
import { allowedOrigin, mailIsConfigured, sha256Hex } from "@/lib/mail-policy"
import { checkTurnstile } from "@/lib/turnstile"

const ipBuckets = new Map<string, number[]>()

export function jsonReply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } })
}

export function requestIp(request: Request) {
  return request.headers.get("cf-connecting-ip") || "local"
}

export async function takeIpSlot(ip: string, purpose: string, now: number, limit: number, windowMs = 10 * 60 * 1000) {
  const key = (await sha256Hex(`${purpose}\0${ip || "local"}`)).slice(0, 16)
  const fresh = (ipBuckets.get(key) ?? []).filter((at) => now - at < windowMs)
  if (fresh.length >= limit) {
    ipBuckets.set(key, fresh)
    return false
  }
  fresh.push(now)
  if (ipBuckets.size > 400) {
    const first = ipBuckets.keys().next().value
    if (first) ipBuckets.delete(first)
  }
  ipBuckets.set(key, fresh)
  return true
}

export async function readJson(request: Request, max: number) {
  if (!allowedOrigin(request.headers.get("origin"))) return null
  const text = await request.text()
  if (text.length > max) return null
  try {
    const body = JSON.parse(text) as unknown
    if (!body || typeof body !== "object" || Array.isArray(body)) return null
    return body as Record<string, unknown>
  } catch {
    return null
  }
}

export function mailEnv() {
  return {
    apiKey: process.env.RESEND_API_KEY || undefined,
    from: process.env.EMAIL_FROM || undefined,
    production: process.env.NODE_ENV === "production",
  }
}

export function mailReady() {
  return mailIsConfigured(mailEnv())
}

export async function guardChallenge(body: Record<string, unknown>, request: Request) {
  return checkTurnstile(body.turnstile, process.env.TURNSTILE_SECRET_KEY, requestIp(request))
}

export async function sendLogged(store: AccountStore, mail: OutboundMail) {
  const result = await deliverMail(mail, mailEnv())
  const row = await mailLog({
    purpose: mail.purpose,
    status: result.ok ? "accepted" : result.reason,
    attempts: result.attempts,
    to: mail.to,
  })
  await store.put(`mailog:${crypto.randomUUID()}`, JSON.stringify(row), { expirationTtl: 14 * 24 * 60 * 60 })
  return result
}

export async function emailSlot(store: AccountStore, purpose: string, email: string, now: number, limit: number, windowMs: number) {
  if (typeof email !== "string" || email.length < 3) return false
  return takeEmailSlot(store, purpose, email, now, limit, windowMs)
}
