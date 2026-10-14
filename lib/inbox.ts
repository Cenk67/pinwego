import { supportAddress } from "@/lib/mail-policy"

export const inboxKey = "inbox:v1"
export const messageCap = 300

export const inboxStatuses = ["yeni", "inceleniyor", "yanitlandi", "kapatildi", "spam"] as const
export type InboxStatus = (typeof inboxStatuses)[number]
export type MailState = "yok" | "gitti" | "hata"
export type InboxSource = "misafir" | "musteri" | "isletme"

export type Topic = { id: string; label: string; active: boolean; order: number; reference: boolean }
export type Social = { id: string; label: string; url: string; active: boolean; order: number }
export type InboxSettings = {
  title: string
  summary: string
  seoTitle: string
  seoDescription: string
  published: boolean
  email: string
  phone: string
  phoneEnabled: boolean
  messageMax: number
  topics: Topic[]
  socials: Social[]
}
export type InboxEvent = { at: string; kind: "durum" | "not" | "yanit" | "sil" | "goruldu"; text: string }
export type InboxMessage = {
  id: string
  name: string
  email: string
  phone: string
  topicId: string
  topicLabel: string
  reference: string
  body: string
  status: InboxStatus
  createdAt: string
  updatedAt: string
  seenAt: string
  assignee: string
  accountId: string
  source: InboxSource
  notice: MailState
  reply: MailState
  fingerprint: string
  redacted: boolean
  events: InboxEvent[]
}
export type InboxBook = { settings: InboxSettings; messages: InboxMessage[] }

const socialHosts: Record<string, string[]> = {
  facebook: ["facebook.com", "fb.com"],
  instagram: ["instagram.com"],
  x: ["x.com", "twitter.com"],
  linkedin: ["linkedin.com"],
  youtube: ["youtube.com", "youtu.be"],
}

export const socialOrder = ["facebook", "instagram", "x", "linkedin", "youtube"] as const

function topic(id: string, label: string, order: number, reference = false): Topic {
  return { id, label, active: true, order, reference }
}

export function seedSettings(): InboxSettings {
  return {
    title: "Pinwego ile iletişime geçin",
    summary: "Sorularınız, önerileriniz ve talepleriniz için bize ulaşın.",
    seoTitle: "İletişim | Pinwego",
    seoDescription: "Pinwego destek, işletme kaydı, bilgi düzeltme ve iş birliği mesajları.",
    published: true,
    email: supportAddress,
    phone: "",
    phoneEnabled: true,
    messageMax: 2000,
    topics: [
      topic("oneri", "Öneri", 10),
      topic("sikayet", "Şikayet", 20),
      topic("istek", "İstek", 30),
      topic("destek", "Destek", 40),
      topic("genel", "Genel", 50),
      topic("kayit", "İşletme kaydı ve onay", 60, true),
      topic("duzeltme", "Bilgi düzeltme", 70, true),
      topic("kampanya", "Kampanya iş birliği", 80, true),
      topic("basvuru", "İş başvurusu", 90),
      topic("diger", "Diğer", 100),
    ],
    socials: socialOrder.map((id, index) => ({
      id,
      label: id === "x" ? "X" : id[0].toUpperCase() + id.slice(1),
      url: "",
      active: false,
      order: (index + 1) * 10,
    })),
  }
}

export function plain(value: unknown, max: number) {
  if (typeof value !== "string") return ""
  if (/[<>]/.test(value)) return null
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
}

export function socialHref(id: string, value: string) {
  const hosts = socialHosts[id]
  if (!hosts || !value.trim()) return ""
  try {
    const url = new URL(value.trim())
    if (url.protocol !== "https:" || url.username || url.password) return ""
    const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "")
    if (!hosts.includes(host)) return ""
    return url.toString()
  } catch {
    return ""
  }
}

export function publicSettings(settings: InboxSettings) {
  return {
    title: settings.title,
    summary: settings.summary,
    published: settings.published,
    email: settings.email,
    phone: settings.phoneEnabled ? settings.phone : "",
    phoneEnabled: settings.phoneEnabled,
    messageMax: settings.messageMax,
    topics: settings.topics.filter((item) => item.active).sort((a, b) => a.order - b.order).map((item) => ({ id: item.id, label: item.label, reference: item.reference })),
    socials: settings.socials.filter((item) => item.active && item.url).sort((a, b) => a.order - b.order).map((item) => ({ id: item.id, label: item.label, url: item.url })),
  }
}

export function acceptSettings(value: unknown, current: InboxSettings): InboxSettings | null {
  if (!value || typeof value !== "object") return null
  const row = value as Partial<InboxSettings>
  const title = plain(row.title, 120)
  const summary = plain(row.summary, 240)
  const seoTitle = plain(row.seoTitle, 160)
  const seoDescription = plain(row.seoDescription, 240)
  const email = plain(row.email, 120)
  const phone = plain(row.phone, 24)
  if (!title || !summary || !seoTitle || !seoDescription || !email || title.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  if (phone === null || (phone && !/^[\d+\-() ]{7,24}$/.test(phone))) return null
  const messageMax = typeof row.messageMax === "number" ? Math.max(400, Math.min(4000, Math.round(row.messageMax))) : current.messageMax
  if (!Array.isArray(row.topics) || !Array.isArray(row.socials)) return null
  const topics: Topic[] = []
  for (const item of row.topics.slice(0, 20)) {
    if (!item || typeof item !== "object") return null
    const topicRow = item as Partial<Topic>
    const id = typeof topicRow.id === "string" ? topicRow.id : ""
    const label = plain(topicRow.label, 60)
    if (!/^[a-z0-9-]{2,24}$/.test(id) || !label || label.length < 2) return null
    topics.push({ id, label, active: topicRow.active !== false, order: typeof topicRow.order === "number" ? topicRow.order : 100, reference: topicRow.reference === true })
  }
  if (new Set(topics.map((item) => item.id)).size !== topics.length || !topics.some((item) => item.active)) return null
  const socials: Social[] = []
  for (const id of socialOrder) {
    const found = row.socials.find((item) => item && typeof item === "object" && (item as Social).id === id) as Partial<Social> | undefined
    const href = socialHref(id, typeof found?.url === "string" ? found.url : "")
    if (typeof found?.url === "string" && found.url.trim() && !href) return null
    const known = current.socials.find((item) => item.id === id)
    socials.push({
      id,
      label: known?.label || id,
      url: href,
      active: Boolean(href) && found?.active !== false,
      order: typeof found?.order === "number" ? found.order : known?.order || 100,
    })
  }
  return {
    title,
    summary,
    seoTitle,
    seoDescription,
    published: row.published !== false,
    email,
    phone: phone || "",
    phoneEnabled: row.phoneEnabled !== false,
    messageMax,
    topics,
    socials,
  }
}

function asStatus(value: unknown): InboxStatus | null {
  return inboxStatuses.includes(value as InboxStatus) ? value as InboxStatus : null
}

function asMessage(value: unknown): InboxMessage | null {
  if (!value || typeof value !== "object") return null
  const row = value as Partial<InboxMessage>
  const status = asStatus(row.status)
  if (!status || typeof row.id !== "string" || typeof row.createdAt !== "string") return null
  return {
    id: row.id.slice(0, 40),
    name: typeof row.name === "string" ? row.name.slice(0, 80) : "",
    email: typeof row.email === "string" ? row.email.slice(0, 120) : "",
    phone: typeof row.phone === "string" ? row.phone.slice(0, 24) : "",
    topicId: typeof row.topicId === "string" ? row.topicId.slice(0, 24) : "",
    topicLabel: typeof row.topicLabel === "string" ? row.topicLabel.slice(0, 60) : "",
    reference: typeof row.reference === "string" ? row.reference.slice(0, 160) : "",
    body: typeof row.body === "string" ? row.body.slice(0, 4000) : "",
    status,
    createdAt: row.createdAt.slice(0, 40),
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt.slice(0, 40) : row.createdAt,
    seenAt: typeof row.seenAt === "string" ? row.seenAt.slice(0, 40) : "",
    assignee: typeof row.assignee === "string" ? row.assignee.slice(0, 40) : "",
    accountId: typeof row.accountId === "string" ? row.accountId.slice(0, 40) : "",
    source: row.source === "musteri" || row.source === "isletme" ? row.source : "misafir",
    notice: row.notice === "gitti" || row.notice === "hata" ? row.notice : "yok",
    reply: row.reply === "gitti" || row.reply === "hata" ? row.reply : "yok",
    fingerprint: typeof row.fingerprint === "string" ? row.fingerprint.slice(0, 80) : "",
    redacted: row.redacted === true,
    events: Array.isArray(row.events) ? row.events.filter((item) => item && typeof item === "object" && typeof (item as InboxEvent).at === "string").slice(-20).map((item) => ({
      at: (item as InboxEvent).at.slice(0, 40),
      kind: (item as InboxEvent).kind,
      text: typeof (item as InboxEvent).text === "string" ? (item as InboxEvent).text.slice(0, 500) : "",
    })) : [],
  }
}

export function parseBook(raw: string | null): InboxBook | null {
  if (raw === null) return { settings: seedSettings(), messages: [] }
  try {
    const data = JSON.parse(raw) as { settings?: unknown; messages?: unknown }
    const settings = acceptSettings(data.settings, seedSettings())
    if (!settings || !Array.isArray(data.messages)) return null
    const messages = data.messages.map(asMessage)
    if (messages.some((item) => item === null)) return null
    return { settings, messages: messages as InboxMessage[] }
  } catch {
    return null
  }
}

export function roomFor(messages: InboxMessage[], next: InboxMessage) {
  const list = [next, ...messages]
  if (list.length <= messageCap) return list
  const droppable = new Set(list.filter((item) => item.redacted || item.status === "spam" || item.status === "kapatildi").slice(-(list.length - messageCap)).map((item) => item.id))
  const kept = list.filter((item) => !droppable.has(item.id))
  return kept.length <= messageCap ? kept : null
}
