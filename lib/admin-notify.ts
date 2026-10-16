import { validEmail } from "@/lib/identity"
import { isMonday, isoWeek, reportDay, reportHour, type StatsReport } from "@/lib/stats"

export const noticeKinds = ["musteri", "isletme", "dogrulama", "suphe", "guvenlik", "sistem", "odeme", "ozet"] as const
export type NoticeKind = (typeof noticeKinds)[number]
export type NoticeLevel = "bilgi" | "onemli" | "kritik"
export type NoticeStatus = "kayit" | "gonderildi" | "hata" | "atlandi"

export type NotifySettings = {
  recipients: string[]
  routes: Partial<Record<NoticeKind, string[]>>
  musteri: boolean
  isletme: boolean
  dogrulama: boolean
  onay: boolean
  sonuc: boolean
  guvenlik: boolean
  sistem: boolean
  odeme: boolean
  gunluk: boolean
  haftalik: boolean
  minLevel: NoticeLevel
  repeatMinutes: number
}

export type NotifyEvent = {
  id: string
  key: string
  kind: NoticeKind
  level: NoticeLevel
  title: string
  detail: string
  ref: string
  at: string
  status: NoticeStatus
  attempts: number
  error: string
  to: string
}

export type NotifyAudit = { at: string; action: string }

export type NotifyState = {
  version: 1
  settings: NotifySettings
  events: NotifyEvent[]
  digests: string[]
  audits: NotifyAudit[]
}

export type NoticeDraft = {
  key: string
  kind: NoticeKind
  level: NoticeLevel
  title: string
  detail: string
  ref: string
  to: string
}

const levels: NoticeLevel[] = ["bilgi", "onemli", "kritik"]

export function emptySettings(): NotifySettings {
  return {
    recipients: [],
    routes: {},
    musteri: true,
    isletme: true,
    dogrulama: true,
    onay: false,
    sonuc: false,
    guvenlik: true,
    sistem: true,
    odeme: false,
    gunluk: false,
    haftalik: false,
    minLevel: "bilgi",
    repeatMinutes: 60,
  }
}

export function emptyNotify(): NotifyState {
  return { version: 1, settings: emptySettings(), events: [], digests: [], audits: [] }
}

function clip(value: unknown, max: number) {
  if (typeof value !== "string") return ""
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
}

function flag(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback
}

function emails(value: unknown, max: number) {
  if (!Array.isArray(value)) return { ok: false as const, error: "Alıcı listesi okunamadı." }
  const list: string[] = []
  for (const item of value) {
    const email = clip(item, 80).toLowerCase()
    if (!email) continue
    if (!validEmail(email)) return { ok: false as const, error: "Alıcı adresi e-posta biçiminde olmalı." }
    if (!list.includes(email)) list.push(email)
    if (list.length > max) return { ok: false as const, error: "Alıcı sayısı sınırı aşıyor." }
  }
  return { ok: true as const, emails: list }
}

function routesOf(value: unknown) {
  const routes: Partial<Record<NoticeKind, string[]>> = {}
  if (value === undefined) return { ok: true as const, routes }
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false as const, error: "Kategori alıcıları okunamadı." }
  let total = 0
  for (const kind of noticeKinds) {
    const row = (value as Record<string, unknown>)[kind]
    if (row === undefined) continue
    const parsed = emails(row, 3)
    if (!parsed.ok) return parsed
    if (parsed.emails.length) routes[kind] = parsed.emails
    total += parsed.emails.length
    if (total > 12) return { ok: false as const, error: "Kategori alıcı sayısı sınırı aşıyor." }
  }
  return { ok: true as const, routes }
}

export function settingsFrom(value: unknown): { ok: true; settings: NotifySettings } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "Ayarlar okunamadı." }
  const input = value as Record<string, unknown>
  const recipients = emails(input.recipients ?? [], 5)
  if (!recipients.ok) return recipients
  const routes = routesOf(input.routes)
  if (!routes.ok) return routes
  const base = emptySettings()
  const repeat = Number(input.repeatMinutes)
  if (!Number.isInteger(repeat) || repeat < 15 || repeat > 1440) return { ok: false, error: "Tekrar aralığı 15 ile 1440 dakika arasında olmalı." }
  const minLevel = input.minLevel
  if (minLevel !== "bilgi" && minLevel !== "onemli" && minLevel !== "kritik") return { ok: false, error: "Önem seviyesi seçilmeli." }
  return {
    ok: true,
    settings: {
      recipients: recipients.emails,
      routes: routes.routes,
      musteri: flag(input.musteri, base.musteri),
      isletme: flag(input.isletme, base.isletme),
      dogrulama: flag(input.dogrulama, base.dogrulama),
      onay: flag(input.onay, false),
      sonuc: flag(input.sonuc, false),
      guvenlik: flag(input.guvenlik, base.guvenlik),
      sistem: flag(input.sistem, base.sistem),
      odeme: flag(input.odeme, false),
      gunluk: flag(input.gunluk, false),
      haftalik: flag(input.haftalik, false),
      minLevel,
      repeatMinutes: repeat,
    },
  }
}

function eventOf(value: unknown): NotifyEvent | null {
  if (!value || typeof value !== "object") return null
  const row = value as Partial<NotifyEvent>
  if (!noticeKinds.includes(row.kind as NoticeKind) || !levels.includes(row.level as NoticeLevel)) return null
  const status = row.status
  if (status !== "kayit" && status !== "gonderildi" && status !== "hata" && status !== "atlandi") return null
  const id = clip(row.id, 80)
  const key = clip(row.key, 120)
  if (!id || !key) return null
  return {
    id,
    key,
    kind: row.kind as NoticeKind,
    level: row.level as NoticeLevel,
    title: clip(row.title, 140),
    detail: clip(row.detail, 500),
    ref: clip(row.ref, 80),
    at: clip(row.at, 40),
    status,
    attempts: typeof row.attempts === "number" && row.attempts > 0 ? Math.min(20, Math.floor(row.attempts)) : 0,
    error: clip(row.error, 80),
    to: clip(row.to, 180),
  }
}

export function parseNotify(raw: string | null): NotifyState | null {
  if (raw === null) return emptyNotify()
  try {
    const data = JSON.parse(raw) as Partial<NotifyState>
    if (!data || data.version !== 1) return null
    const settings = settingsFrom(data.settings ?? emptySettings())
    if (!settings.ok) return null
    return {
      version: 1,
      settings: settings.settings,
      events: Array.isArray(data.events) ? data.events.map(eventOf).filter((item): item is NotifyEvent => Boolean(item)).slice(-200) : [],
      digests: Array.isArray(data.digests) ? data.digests.filter((item): item is string => typeof item === "string" && item.length <= 40).slice(-40) : [],
      audits: Array.isArray(data.audits)
        ? data.audits
            .map((item) => {
              if (!item || typeof item !== "object") return null
              const row = item as Partial<NotifyAudit>
              const action = clip(row.action, 180)
              const at = clip(row.at, 40)
              return action && at ? { at, action } : null
            })
            .filter((item): item is NotifyAudit => Boolean(item))
            .slice(0, 80)
        : [],
    }
  } catch {
    return null
  }
}

function rank(level: NoticeLevel) {
  return levels.indexOf(level)
}

export function kindEnabled(settings: NotifySettings, kind: NoticeKind) {
  if (kind === "musteri") return settings.musteri
  if (kind === "isletme") return settings.isletme
  if (kind === "dogrulama") return settings.dogrulama
  if (kind === "suphe" || kind === "guvenlik") return settings.guvenlik
  if (kind === "sistem") return settings.sistem
  if (kind === "odeme") return settings.odeme
  return true
}

export function resolveRecipients(settings: NotifySettings, kind: NoticeKind, fallback: string | null) {
  const list = [...settings.recipients]
  for (const email of settings.routes[kind] ?? []) {
    if (!list.includes(email)) list.push(email)
  }
  const addresses = list.slice(0, 8)
  if (addresses.length) return { addresses, label: addresses.join(", ") }
  if (fallback && validEmail(fallback)) return { addresses: [fallback], label: "yönetici kutusu" }
  return { addresses: [], label: "" }
}

export function acceptNotice(state: NotifyState, draft: NoticeDraft, now: number, force = false) {
  const key = clip(draft.key, 120)
  const existing = state.events.find((item) => item.key === key)
  if (existing) return { state, event: existing, deliver: false, changed: false }
  if (!force && !kindEnabled(state.settings, draft.kind)) return { state, event: null, deliver: false, changed: false }
  if (!force && rank(draft.level) < rank(state.settings.minLevel)) return { state, event: null, deliver: false, changed: false }
  const ref = clip(draft.ref, 80)
  const windowMs = state.settings.repeatMinutes * 60 * 1000
  const recent = state.events.find((item) => item.kind === draft.kind && item.ref === ref && now - Date.parse(item.at) < windowMs)
  if (recent && !force) return { state, event: recent, deliver: false, changed: false }
  const event: NotifyEvent = {
    id: crypto.randomUUID(),
    key,
    kind: draft.kind,
    level: draft.level,
    title: clip(draft.title, 140),
    detail: clip(draft.detail, 500),
    ref,
    at: new Date(now).toISOString(),
    status: "kayit",
    attempts: 0,
    error: "",
    to: clip(draft.to, 180),
  }
  if (!event.key || !event.title) return { state, event: null, deliver: false, changed: false }
  return { state: { ...state, events: [...state.events, event].slice(-200) }, event, deliver: true, changed: true }
}

export function markSent(state: NotifyState, id: string, status: NoticeStatus, attempts: number, error: string) {
  return {
    ...state,
    events: state.events.map((item) => (item.id === id ? { ...item, status, attempts: Math.min(20, attempts), error: clip(error, 80) } : item)),
  }
}

export function saveSettings(state: NotifyState, input: unknown, now: number) {
  const settings = settingsFrom(input)
  if (!settings.ok) return settings
  const audit: NotifyAudit = { at: new Date(now).toISOString(), action: `Bildirim ayarları güncellendi. Alıcı: ${settings.settings.recipients.length}.` }
  return { ok: true as const, state: { ...state, settings: settings.settings, audits: [audit, ...state.audits].slice(0, 80) } }
}

export function rememberDigest(state: NotifyState, key: string) {
  if (state.digests.includes(key)) return state
  return { ...state, digests: [...state.digests, key].slice(-40) }
}

export function digestSlots(state: NotifyState, now: number) {
  if (reportHour(now) !== 8) return { day: null as string | null, week: null as string | null }
  const yesterday = shiftLabel(reportDay(now))
  const day = state.settings.gunluk && yesterday && !state.digests.includes(`day:${yesterday}`) ? `day:${yesterday}` : null
  let week: string | null = null
  if (state.settings.haftalik && isMonday(now) && yesterday) {
    const key = `week:${isoWeek(yesterday)}`
    if (!state.digests.includes(key)) week = key
  }
  return { day, week }
}

function shiftLabel(today: string) {
  if (!today) return ""
  const [year, month, day] = today.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export function safePanelLink(value: string) {
  try {
    const url = new URL(value)
    const local = (url.hostname === "localhost" || url.hostname === "127.0.0.1") && (url.protocol === "http:" || url.protocol === "https:")
    const live = (url.hostname === "pinwego.com" || url.hostname === "www.pinwego.com") && url.protocol === "https:"
    if (!local && !live) return "https://pinwego.com/yonetim"
    return `${url.origin}/yonetim`
  } catch {
    return "https://pinwego.com/yonetim"
  }
}

export function brandMail(input: { subject: string; heading: string; lines: string[]; link: string; linkLabel: string }) {
  const link = safePanelLink(input.link)
  const lines = input.lines.map((line) => escapeHtml(line))
  const html = `<!DOCTYPE html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:18px">
<tr><td style="padding:28px 24px 8px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#0063f7">pinwego</td></tr>
<tr><td style="padding:0 24px 12px;font-size:26px;line-height:1.3;color:#172033">${escapeHtml(input.heading)}</td></tr>
${lines.map((line) => `<tr><td style="padding:0 24px 10px;font-size:15px;line-height:1.55;color:#3d4654">${line}</td></tr>`).join("")}
<tr><td style="padding:8px 24px 28px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#0063f7;color:#ffffff;text-decoration:none;border-radius:999px;padding:12px 18px;font-size:14px">${escapeHtml(input.linkLabel)}</a></td></tr>
</table>
<p style="max-width:560px;font-size:12px;line-height:1.5;color:#7b8494">Bu mektup parola, oturum kodu veya kimlik numarası taşımaz.</p>
</td></tr></table></body></html>`
  const text = [input.heading, ...input.lines, link, "Bu mektup parola, oturum kodu veya kimlik numarası taşımaz."].join("\n")
  return { subject: clip(input.subject, 140), html, text }
}

export function noticeLetter(event: NotifyEvent, link: string) {
  return brandMail({
    subject: `pinwego · ${event.title}`,
    heading: event.title,
    lines: [event.detail, event.ref ? `Kayıt: ${event.ref}` : ""].filter(Boolean),
    link,
    linkLabel: "Yönetim panelini aç",
  })
}

export function digestLetter(slot: string, report: StatsReport, critical: number, link: string) {
  const weekly = slot.startsWith("week:")
  const change = (value: number | null) => (value === null ? "önceki dönem 0" : `${value > 0 ? "+" : ""}${value}%`)
  const lines = [
    `Yeni müşteri: ${report.totals.newCustomers} (${change(report.change.newCustomers)})`,
    `Yeni işletme: ${report.totals.newBusinesses} (${change(report.change.newBusinesses)})`,
    `Misafir ziyareti: ${report.totals.views} (${change(report.change.views)})`,
    `Misafir oturumu: ${report.totals.sessions} (${change(report.change.sessions)})`,
    `Müşteri girişi: ${report.totals.customerLogins} (${change(report.change.customerLogins)})`,
    `İşletme girişi: ${report.totals.businessLogins} (${change(report.change.businessLogins)})`,
    `Kritik kayıt: ${critical}`,
    "Bekleyen sunucu onayı: 0. Kampanya, galeri ve profil incelemesi tarayıcıda kalır.",
  ]
  return brandMail({
    subject: weekly ? `pinwego · Haftalık özet ${slot.slice(5)}` : `pinwego · Günlük özet ${report.from}`,
    heading: weekly ? "Haftalık performans" : "Günlük özet",
    lines,
    link,
    linkLabel: "Raporu panelde aç",
  })
}

export function criticalBetween(state: NotifyState, from: string, to: string) {
  return state.events.filter((item) => item.level === "kritik" && reportDay(item.at) >= from && reportDay(item.at) <= to).length
}
