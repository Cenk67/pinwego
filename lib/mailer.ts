import { defaultFrom, mailIsConfigured, sha256Hex, supportAddress } from "@/lib/mail-policy"

export type OutboundMail = {
  to: string
  subject: string
  html: string
  text: string
  purpose: "verify" | "reset" | "changed" | "admin" | "remind"
}

type SendEnv = {
  apiKey?: string
  from?: string
  production: boolean
}

type SendResult = { ok: true; id: string; attempts: number } | { ok: false; reason: "unconfigured" | "failed"; attempts: number }

const inboxKey = "__pinwegoMail"

function inbox(): OutboundMail[] {
  const holder = globalThis as typeof globalThis & { [inboxKey]?: OutboundMail[] }
  if (!holder[inboxKey]) holder[inboxKey] = []
  return holder[inboxKey]
}

export function readDevMail() {
  return inbox().map((item) => ({ ...item }))
}

export function clearDevMail() {
  inbox().splice(0, inbox().length)
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const retryCodes = new Set(["E_RATE_LIMIT_EXCEEDED", "E_INTERNAL_SERVER_ERROR"])

export type BoundSender = {
  send(message: {
    to: string
    from: { email: string; name?: string }
    replyTo: string
    subject: string
    html: string
    text: string
  }): Promise<{ messageId?: string }>
}

export function fromAddress(value?: string) {
  const raw = (value || defaultFrom).trim()
  const named = raw.match(/^(.*)<([^>]+)>$/)
  if (!named) return { name: "Pinwego", email: raw }
  return { name: named[1].trim() || "Pinwego", email: named[2].trim() }
}

export async function deliverBound(mail: OutboundMail, sender: BoundSender, fromValue?: string): Promise<SendResult> {
  const from = fromAddress(fromValue)
  let attempts = 0
  for (const wait of [0, 250, 800]) {
    if (wait) await delay(wait)
    attempts += 1
    try {
      const result = await sender.send({
        to: mail.to,
        from,
        replyTo: supportAddress,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      })
      return { ok: true, id: result?.messageId || "accepted", attempts }
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : ""
      if (code && !retryCodes.has(code)) return { ok: false, reason: "failed", attempts }
      if (attempts >= 3) return { ok: false, reason: "failed", attempts }
    }
  }
  return { ok: false, reason: "failed", attempts }
}

export async function deliverMail(mail: OutboundMail, env: SendEnv, fetchImpl: typeof fetch = fetch): Promise<SendResult> {
  if (!mailIsConfigured(env)) return { ok: false, reason: "unconfigured", attempts: 0 }
  if (!env.apiKey) {
    if (env.production) return { ok: false, reason: "unconfigured", attempts: 0 }
    inbox().push(mail)
    if (inbox().length > 20) inbox().shift()
    return { ok: true, id: "dev-inbox", attempts: 1 }
  }
  const from = env.from || defaultFrom
  let attempts = 0
  for (const wait of [0, 250, 800]) {
    if (wait) await delay(wait)
    attempts += 1
    try {
      const response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [mail.to],
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          reply_to: supportAddress,
        }),
      })
      if (response.ok) {
        const data = (await response.json().catch(() => ({}))) as { id?: string }
        return { ok: true, id: typeof data.id === "string" ? data.id : "accepted", attempts }
      }
      if (response.status !== 429 && response.status < 500) return { ok: false, reason: "failed", attempts }
    } catch {
      if (attempts >= 3) return { ok: false, reason: "failed", attempts }
    }
  }
  return { ok: false, reason: "failed", attempts }
}

export async function mailLog(input: { purpose: OutboundMail["purpose"]; status: string; attempts: number; to: string }) {
  return {
    purpose: input.purpose,
    status: input.status,
    attempts: input.attempts,
    emailHash: (await sha256Hex(input.to)).slice(0, 24),
    at: new Date().toISOString(),
  }
}
