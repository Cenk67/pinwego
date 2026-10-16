import { localeIds, type LocaleId } from "@/lib/i18n-ids"

export const supportAddress = "destek@pinwego.com"
export const salesAddress = "satis@pinwego.com"
export const defaultFrom = "Pinwego <hesap@pinwego.com>"

const hosts = new Set(["pinwego.com", "www.pinwego.com", "localhost", "127.0.0.1"])

export function hostOf(value: string | null) {
  if (!value) return ""
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return ""
  }
}

export function allowedOrigin(origin: string | null) {
  if (!origin) return true
  return hosts.has(hostOf(origin))
}

export function devPreviewPath(pathname: string) {
  return pathname === "/onizleme" || pathname.startsWith("/onizleme/")
}

export function linkBase(origin: string | null) {
  const host = hostOf(origin)
  if ((host === "localhost" || host === "127.0.0.1") && origin) {
    try {
      const url = new URL(origin)
      if (url.protocol !== "http:" && url.protocol !== "https:") return "https://pinwego.com"
      return url.origin
    } catch {
      return "https://pinwego.com"
    }
  }
  if (host === "pinwego.com" || host === "www.pinwego.com") return `https://${host}`
  return "https://pinwego.com"
}

export function pickLocale(value: unknown): LocaleId {
  return typeof value === "string" && localeIds.includes(value as LocaleId) ? (value as LocaleId) : "tr"
}

export function mailIsConfigured(env: { apiKey?: string; production: boolean }) {
  return Boolean(env.apiKey) || !env.production
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

export function newSecret() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let text = ""
  for (const byte of bytes) text += String.fromCharCode(byte)
  return btoa(text).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

export function nextBucket(
  current: { n: number; start: number } | null,
  now: number,
  limit: number,
  windowMs: number,
) {
  const fresh = current && now - current.start < windowMs ? current : { n: 0, start: now }
  if (fresh.n >= limit) return { ok: false as const, next: fresh }
  return { ok: true as const, next: { n: fresh.n + 1, start: fresh.start } }
}
