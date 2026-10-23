export type WhatsAppConfig = { token: string; phoneId: string; version: string }

export type WhatsAppResult =
  | { ok: true; id: string }
  | { ok: false; reason: "unconfigured" | "invalid" | "failed"; detail: string }

type WorkerEnv = { WHATSAPP_TOKEN?: string; WHATSAPP_PHONE_ID?: string; WHATSAPP_API_VERSION?: string }

export function whatsappConfigFrom(env: WorkerEnv | undefined): WhatsAppConfig | null {
  const token = env?.WHATSAPP_TOKEN?.trim()
  const phoneId = env?.WHATSAPP_PHONE_ID?.trim()
  if (!token || !phoneId || !/^\d{5,32}$/.test(phoneId)) return null
  const version = env?.WHATSAPP_API_VERSION?.trim() || "v21.0"
  return { token, phoneId, version: /^v\d{1,3}(\.\d{1,2})?$/.test(version) ? version : "v21.0" }
}

export async function whatsappConfig(): Promise<WhatsAppConfig | null> {
  try {
    const loaded = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "cloudflare:workers")) as { env?: WorkerEnv }
    const remote = whatsappConfigFrom(loaded.env)
    if (remote) return remote
  } catch {
    // Local Next reads the development environment instead.
  }
  return whatsappConfigFrom({
    WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN,
    WHATSAPP_PHONE_ID: process.env.WHATSAPP_PHONE_ID,
    WHATSAPP_API_VERSION: process.env.WHATSAPP_API_VERSION,
  })
}

export type WhatsAppTemplateMessage = {
  to: string
  name: string
  language: string
  params: string[]
}

export function whatsappPayload(message: WhatsAppTemplateMessage) {
  const components = message.params.length
    ? [{ type: "body", parameters: message.params.map((text) => ({ type: "text", text: text.slice(0, 1024) })) }]
    : []
  return {
    messaging_product: "whatsapp",
    to: message.to,
    type: "template",
    template: { name: message.name, language: { code: message.language || "tr" }, components },
  }
}

export async function sendWhatsAppTemplate(config: WhatsAppConfig | null, message: WhatsAppTemplateMessage, fetchImpl: typeof fetch = fetch): Promise<WhatsAppResult> {
  if (!config) return { ok: false, reason: "unconfigured", detail: "WhatsApp Business Platform anahtarı tanımlı değil." }
  if (!/^\d{8,15}$/.test(message.to)) return { ok: false, reason: "invalid", detail: "Telefon numarası uluslararası biçimde değil." }
  if (!/^[a-z0-9_]{1,512}$/.test(message.name)) return { ok: false, reason: "invalid", detail: "Şablon adı WhatsApp biçiminde değil (küçük harf, rakam, alt çizgi)." }
  try {
    const response = await fetchImpl(`https://graph.facebook.com/${config.version}/${config.phoneId}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json" },
      body: JSON.stringify(whatsappPayload(message)),
    })
    const data = (await response.json().catch(() => ({}))) as { messages?: Array<{ id?: string }>; error?: { message?: string; code?: number } }
    if (response.ok && data.messages?.[0]?.id) return { ok: true, id: data.messages[0].id }
    const detail = data.error?.message ? `${data.error.code ?? response.status}: ${data.error.message}`.slice(0, 200) : `HTTP ${response.status}`
    return { ok: false, reason: "failed", detail }
  } catch {
    return { ok: false, reason: "failed", detail: "WhatsApp servisine ulaşılamadı." }
  }
}
