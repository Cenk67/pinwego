import type { Block, Channel, ChannelConsent, Channels, CommsAudit, CommsReport, ConsentEvent, JobMode, MessageKind, ResultStatus, Template } from "@/lib/comms"

export type Status = "bekliyor" | "aktif" | "askida" | "silindi"

export type Row = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  birthDate: string
  occupation: string
  status: Status
  createdAt: string
  verifiedAt: string
  updatedAt: string
  lastLoginAt: string
  marketing: boolean
  legacyId: boolean
  channels: Channels
  block: Block | null
}

export type Consent = { pageId: string; version: string; kind: string; accepted: boolean; at: string; context: string }
export type Audit = { at: string; actor: string; action: string; detail: string }
export type Totals = { total: number; aktif: number; bekliyor: number; askida: number; silindi: number; verified: number; rate: number }
export type PageInfo = { sayfa: number; adet: number; toplam: number; sayfaSayisi: number }
export type CommsDetail = {
  sms: ChannelConsent | null
  whatsapp: ChannelConsent | null
  block: Block | null
  history: ConsentEvent[]
  sends: Array<{ jobId: string; channel: Channel; kind: MessageKind; mode: JobMode; subject: string; status: ResultStatus; reason: string; at: string }>
}

export type PublicJob = {
  id: string
  kind: MessageKind
  channel: Channel
  mode: JobMode
  subject: string
  body: string
  waName: string
  waLanguage: string
  filter: string
  createdAt: string
  finishedAt: string
  status: "kuyrukta" | "tamam" | "iptal"
  total: number
  sent: number
  failed: number
  skipped: Record<string, number>
  pendingCount: number
  results: Array<{ id: string; status: ResultStatus; reason: string; at: string }>
  error: string
}

export type Providers = { mail: boolean; whatsapp: boolean; sms: boolean }

export type Overview = { templates: Template[]; jobs: PublicJob[]; report: CommsReport; providers: Providers; audits: CommsAudit[] }

export type Filter = { q: string; durum: string; dogrulama: string; kanal: string; izin: string; engel: string; from: string; to: string }

export const emptyFilter: Filter = { q: "", durum: "", dogrulama: "", kanal: "", izin: "evet", engel: "", from: "", to: "" }

export const statusText: Record<Status, string> = {
  bekliyor: "E-posta doğrulaması bekleniyor",
  aktif: "Aktif",
  askida: "Askıya alınmış",
  silindi: "Silinmiş",
}

export const reasonText: Record<string, string> = {
  engel: "engelli",
  durum: "hesap uygun değil",
  izin: "izin yok",
  adres: "adres/GSM yok",
  sinir: "günlük sınır",
  iptal: "iptal edildi",
  manuel: "elle açıldı",
  "posta-hazir-degil": "posta bağlı değil",
  "whatsapp-bagli-degil": "WhatsApp API bağlı değil",
  "sms-bagli-degil": "SMS sağlayıcı bağlı değil",
  unconfigured: "servis bağlı değil",
  failed: "sağlayıcı hatası",
}

export const errorText: Record<string, string> = {
  onay: "Gönderim için onay kutusu işaretlenmeli.",
  degisti: "Alıcı sayısı değişti. Ön izlemeyi yenile.",
  "alici-yok": "Uygun alıcı yok.",
  sinir: "Alıcı sayısı tek işte 2000'i aşamaz. Süzgeci daralt.",
  "posta-hazir-degil": "E-posta servisi bağlı değil.",
  "whatsapp-bagli-degil": "WhatsApp Business Platform anahtarı tanımlı değil. Gönderim yapılmadı.",
  "sms-bagli-degil": "SMS sağlayıcısı bağlı değil. Gönderim yapılmadı.",
  "hizmet-toplu": "Hizmet mesajı yalnız tek müşteriye gider.",
  konu: "E-posta konusu gerekli.",
  sablon: "WhatsApp API için onaylı şablon adı gerekli.",
  metin: "Mesaj metni gerekli.",
  kanit: "Kanıt notu en az 5 karakter olmalı ve kaynak seçilmeli.",
  limited: "Çok sık istek. Biraz bekle.",
  yetki: "Bu işlem yönetici oturumu ister.",
  unknown: "Kayıt bulunamadı.",
  invalid: "İstek geçersiz.",
  izin: "Bu müşterinin bu kanalda pazarlama izni yok.",
  engel: "Bu müşteri engelli. Engeli kaldırmadan iletişim açılmaz.",
  adres: "Geçerli GSM yok.",
  durum: "Hesap aktif değil.",
}

export function stamp(value: string) {
  return value ? value.slice(0, 16).replace("T", " ") : "—"
}

export function query(filter: Partial<Filter>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filter)) if (value) params.set(key, value)
  return params.toString()
}

export async function getJson<T>(url: string): Promise<{ ok: boolean; status: number; data: (T & { ok?: boolean; reason?: string; error?: string }) | null }> {
  try {
    const response = await fetch(url, { credentials: "include" })
    const data = (await response.json().catch(() => null)) as (T & { ok?: boolean; reason?: string }) | null
    return { ok: response.ok && data?.ok === true, status: response.status, data }
  } catch {
    return { ok: false, status: 0, data: null }
  }
}

export async function postJson<T = Record<string, unknown>>(url: string, body: Record<string, unknown>) {
  try {
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = (await response.json().catch(() => null)) as (T & { ok?: boolean; reason?: string; error?: string }) | null
    return { ok: response.ok && data?.ok === true, status: response.status, data }
  } catch {
    return { ok: false, status: 0, data: null }
  }
}

export function failText(data: { reason?: string; error?: string } | null, fallback: string) {
  if (data?.error) return data.error
  if (data?.reason && errorText[data.reason]) return errorText[data.reason]
  return fallback
}
