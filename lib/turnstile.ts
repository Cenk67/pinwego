export async function checkTurnstile(
  token: unknown,
  secret: string | undefined,
  ip: string,
  fetchImpl: typeof fetch = fetch,
) {
  if (!secret) return { ok: true as const, skipped: true }
  if (typeof token !== "string" || token.length < 10 || token.length > 2048) return { ok: false as const, reason: "challenge" as const }
  const body = new URLSearchParams({ secret, response: token })
  if (ip && ip !== "local") body.set("remoteip", ip)
  try {
    const response = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body })
    const data = (await response.json()) as { success?: boolean }
    return data.success ? { ok: true as const, skipped: false } : { ok: false as const, reason: "challenge" as const }
  } catch {
    return { ok: false as const, reason: "challenge" as const }
  }
}
