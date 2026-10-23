export type SmsMessage = { to: string; text: string }

export type SmsResult =
  | { ok: true; id: string }
  | { ok: false; reason: "unconfigured" | "invalid" | "failed"; detail: string }

export type SmsSender = {
  name: string
  send(message: SmsMessage): Promise<SmsResult>
}

type WorkerEnv = { SMS_PROVIDER?: string; SMS_API_KEY?: string; SMS_SENDER?: string }

export function smsSenderFrom(env: WorkerEnv | undefined): SmsSender | null {
  const provider = env?.SMS_PROVIDER?.trim().toLowerCase()
  const apiKey = env?.SMS_API_KEY?.trim()
  const sender = env?.SMS_SENDER?.trim()
  if (!provider || !apiKey || !sender) return null
  // Türkiye'deki SMS sağlayıcıları (Netgsm, İleti Merkezi, Twilio vb.) için
  // adaptör bu noktaya eklenir. Tanımlı bir adaptör olmadan gönderim yapılmaz.
  return null
}

export async function smsSender(): Promise<SmsSender | null> {
  try {
    const loaded = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "cloudflare:workers")) as { env?: WorkerEnv }
    const remote = smsSenderFrom(loaded.env)
    if (remote) return remote
  } catch {
    // Local Next reads the development environment instead.
  }
  return smsSenderFrom({ SMS_PROVIDER: process.env.SMS_PROVIDER, SMS_API_KEY: process.env.SMS_API_KEY, SMS_SENDER: process.env.SMS_SENDER })
}

export async function sendSms(sender: SmsSender | null, message: SmsMessage): Promise<SmsResult> {
  if (!sender) return { ok: false, reason: "unconfigured", detail: "SMS sağlayıcısı bağlı değil." }
  if (!/^\d{8,15}$/.test(message.to)) return { ok: false, reason: "invalid", detail: "Telefon numarası uluslararası biçimde değil." }
  if (!message.text.trim()) return { ok: false, reason: "invalid", detail: "Mesaj metni boş." }
  try {
    return await sender.send(message)
  } catch {
    return { ok: false, reason: "failed", detail: "SMS servisine ulaşılamadı." }
  }
}
