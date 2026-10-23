import type { CustomerRow } from "@/lib/customers"
import { fold } from "@/lib/format"

export const commsPrefsKey = "commprefs:v1"
export const commsTemplatesKey = "commtpl:v1"
export const commsJobsKey = "commjobs:v1"

export const channels = ["eposta", "sms", "whatsapp"] as const
export type Channel = (typeof channels)[number]
export const channelLabel: Record<Channel, string> = { eposta: "E-posta", sms: "SMS", whatsapp: "WhatsApp" }

export const consentSources = ["kayit", "hesap", "yonetici", "yazili", "iys", "cikis"] as const
export type ConsentSource = (typeof consentSources)[number]
export const sourceLabel: Record<ConsentSource, string> = {
  kayit: "Kayıt formu",
  hesap: "Hesap sayfası",
  yonetici: "Yönetici",
  yazili: "Yazılı onay",
  iys: "İYS kaydı",
  cikis: "Ret bağlantısı",
}

export type ChannelConsent = { accepted: boolean; source: ConsentSource; at: string; note: string }

export const blockKinds = ["pazarlama", "iletisim"] as const
export type BlockKind = (typeof blockKinds)[number]
export const blockLabel: Record<BlockKind, string> = { pazarlama: "Pazarlama engeli", iletisim: "İletişim engeli" }
export type Block = { kind: BlockKind; reason: string; at: string }

export type CustomerPrefs = {
  sms?: ChannelConsent
  whatsapp?: ChannelConsent
  block?: Block
  cikis?: string
}

export type ConsentEvent = {
  accountId: string
  channel: Channel | "engel"
  accepted: boolean
  source: ConsentSource
  at: string
  note: string
}

export type CommsAudit = { at: string; action: string; detail: string }

export type CommsState = { version: 1; prefs: Record<string, CustomerPrefs>; history: ConsentEvent[]; audits: CommsAudit[] }

export type Template = {
  id: string
  name: string
  channel: Channel
  subject: string
  body: string
  waName: string
  waLanguage: string
  updatedAt: string
}

export type MessageKind = "kampanya" | "hizmet"
export type JobMode = "tek" | "toplu" | "manuel"
export type JobStatus = "kuyrukta" | "tamam" | "iptal"
export type ResultStatus = "gonderildi" | "hata" | "atlandi"
export type SkipReason = "engel" | "durum" | "izin" | "adres" | "sinir" | "sayfa"

export type JobResult = { id: string; status: ResultStatus; reason: string; at: string }

export type SendJob = {
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
  status: JobStatus
  total: number
  sent: number
  failed: number
  skipped: Record<string, number>
  pending: string[]
  results: JobResult[]
  error: string
}

export type Channels = Record<Channel, boolean>

export type EnrichedCustomer = CustomerRow & { channels: Channels; block: Block | null }

export type CustomerFilter = {
  q: string
  status: string
  verified: string
  channel: string
  permission: string
  block: string
  from: string
  to: string
}

export const historyCap = 3000
export const jobCap = 120
export const resultCap = 600
export const templateCap = 60
export const bulkCap = 2000
export const stepSize = 20

function clip(value: unknown, max: number) {
  if (typeof value !== "string") return ""
  return value.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, " ").replace(/[ \t]+/g, " ").trim().slice(0, max)
}

function isSource(value: unknown): value is ConsentSource {
  return typeof value === "string" && (consentSources as readonly string[]).includes(value)
}

function isChannel(value: unknown): value is Channel {
  return typeof value === "string" && (channels as readonly string[]).includes(value)
}

function asConsent(value: unknown): ChannelConsent | undefined {
  if (!value || typeof value !== "object") return undefined
  const row = value as Partial<ChannelConsent>
  if (typeof row.accepted !== "boolean" || !isSource(row.source) || typeof row.at !== "string") return undefined
  return { accepted: row.accepted, source: row.source, at: row.at, note: clip(row.note, 200) }
}

function asBlock(value: unknown): Block | undefined {
  if (!value || typeof value !== "object") return undefined
  const row = value as Partial<Block>
  if ((row.kind !== "pazarlama" && row.kind !== "iletisim") || typeof row.at !== "string") return undefined
  return { kind: row.kind, reason: clip(row.reason, 200), at: row.at }
}

export const auditCap = 200

export function emptyComms(): CommsState {
  return { version: 1, prefs: {}, history: [], audits: [] }
}

export function noteAudit(state: CommsState, action: string, detail: string, nowIso: string): CommsState {
  return { ...state, audits: [{ at: nowIso, action: clip(action, 40), detail: clip(detail, 240) }, ...state.audits].slice(0, auditCap) }
}

export function parseComms(raw: string | null): CommsState | null {
  if (raw === null) return emptyComms()
  try {
    const data = JSON.parse(raw) as Partial<CommsState>
    if (!data || typeof data !== "object" || !data.prefs || typeof data.prefs !== "object") return null
    const prefs: Record<string, CustomerPrefs> = {}
    for (const [id, value] of Object.entries(data.prefs)) {
      if (!value || typeof value !== "object" || !id) continue
      const row = value as Partial<CustomerPrefs>
      const next: CustomerPrefs = {}
      const sms = asConsent(row.sms)
      const whatsapp = asConsent(row.whatsapp)
      const block = asBlock(row.block)
      if (sms) next.sms = sms
      if (whatsapp) next.whatsapp = whatsapp
      if (block) next.block = block
      if (typeof row.cikis === "string" && row.cikis.length >= 20) next.cikis = row.cikis
      prefs[id] = next
    }
    const history = Array.isArray(data.history)
      ? data.history.filter((item): item is ConsentEvent => {
          if (!item || typeof item !== "object") return false
          const row = item as Partial<ConsentEvent>
          return typeof row.accountId === "string" && (isChannel(row.channel) || row.channel === "engel") && typeof row.accepted === "boolean" && isSource(row.source) && typeof row.at === "string"
        }).slice(-historyCap)
      : []
    const audits = Array.isArray(data.audits)
      ? data.audits.filter((item): item is CommsAudit => {
          if (!item || typeof item !== "object") return false
          const row = item as Partial<CommsAudit>
          return typeof row.at === "string" && typeof row.action === "string" && typeof row.detail === "string"
        }).slice(0, auditCap)
      : []
    return { version: 1, prefs, history, audits }
  } catch {
    return null
  }
}

export function channelsOf(prefs: CustomerPrefs | undefined, emailMarketing: boolean): Channels {
  return {
    eposta: emailMarketing,
    sms: prefs?.sms?.accepted === true,
    whatsapp: prefs?.whatsapp?.accepted === true,
  }
}

export function enrichCustomers(items: CustomerRow[], state: CommsState): EnrichedCustomer[] {
  return items.map((item) => {
    const prefs = state.prefs[item.id]
    return { ...item, channels: channelsOf(prefs, item.marketing), block: prefs?.block ?? null }
  })
}

export function setChannelConsent(
  state: CommsState,
  accountId: string,
  channel: "sms" | "whatsapp",
  accepted: boolean,
  source: ConsentSource,
  nowIso: string,
  note = "",
): CommsState {
  const prefs = { ...(state.prefs[accountId] ?? {}) }
  prefs[channel] = { accepted, source, at: nowIso, note: clip(note, 200) }
  const event: ConsentEvent = { accountId, channel, accepted, source, at: nowIso, note: clip(note, 200) }
  return { ...state, prefs: { ...state.prefs, [accountId]: prefs }, history: [...state.history, event].slice(-historyCap) }
}

export function noteEmailConsent(state: CommsState, accountId: string, accepted: boolean, source: ConsentSource, nowIso: string, note = ""): CommsState {
  const event: ConsentEvent = { accountId, channel: "eposta", accepted, source, at: nowIso, note: clip(note, 200) }
  return { ...state, history: [...state.history, event].slice(-historyCap) }
}

export function setBlock(state: CommsState, accountId: string, block: { kind: BlockKind; reason: string } | null, nowIso: string): CommsState {
  const prefs = { ...(state.prefs[accountId] ?? {}) }
  if (block) prefs.block = { kind: block.kind, reason: clip(block.reason, 200), at: nowIso }
  else delete prefs.block
  const event: ConsentEvent = {
    accountId,
    channel: "engel",
    accepted: block === null,
    source: "yonetici",
    at: nowIso,
    note: block ? `${blockLabel[block.kind]}: ${clip(block.reason, 160)}` : "Engel kaldırıldı",
  }
  return { ...state, prefs: { ...state.prefs, [accountId]: prefs }, history: [...state.history, event].slice(-historyCap) }
}

export function forgetCustomer(state: CommsState, accountId: string, nowIso: string): CommsState {
  const prefs = { ...(state.prefs[accountId] ?? {}) }
  const next: CustomerPrefs = {}
  if (prefs.block) next.block = prefs.block
  const events: ConsentEvent[] = []
  for (const channel of ["sms", "whatsapp"] as const) {
    if (prefs[channel]?.accepted) {
      next[channel] = { accepted: false, source: "yonetici", at: nowIso, note: "Hesap silindi" }
      events.push({ accountId, channel, accepted: false, source: "yonetici", at: nowIso, note: "Hesap silindi" })
    }
  }
  return { ...state, prefs: { ...state.prefs, [accountId]: next }, history: [...state.history, ...events].slice(-historyCap) }
}

export function ensureOptOutToken(state: CommsState, accountId: string, token: string): CommsState {
  const prefs = state.prefs[accountId] ?? {}
  if (prefs.cikis) return state
  return { ...state, prefs: { ...state.prefs, [accountId]: { ...prefs, cikis: token } } }
}

export function accountByOptOut(state: CommsState, token: string) {
  if (token.length < 20 || token.length > 200) return ""
  for (const [id, prefs] of Object.entries(state.prefs)) {
    if (prefs.cikis && prefs.cikis.length === token.length) {
      let diff = 0
      for (let index = 0; index < token.length; index += 1) diff |= prefs.cikis.charCodeAt(index) ^ token.charCodeAt(index)
      if (diff === 0) return id
    }
  }
  return ""
}

export function historyFor(state: CommsState, accountId: string, max = 60) {
  return state.history.filter((item) => item.accountId === accountId).slice(-max).reverse()
}

export type Eligibility = { ok: true } | { ok: false; reason: SkipReason }

export function eligibility(row: EnrichedCustomer, channel: Channel, kind: MessageKind): Eligibility {
  if (row.block?.kind === "iletisim") return { ok: false, reason: "engel" }
  if (kind === "kampanya" && row.block?.kind === "pazarlama") return { ok: false, reason: "engel" }
  if (row.status !== "aktif") return { ok: false, reason: "durum" }
  if (channel === "eposta" && !row.verifiedAt) return { ok: false, reason: "durum" }
  if (kind === "kampanya" && !row.channels[channel]) return { ok: false, reason: "izin" }
  if (channel === "eposta" && !row.email.includes("@")) return { ok: false, reason: "adres" }
  if (channel !== "eposta" && !e164Digits(row.phone)) return { ok: false, reason: "adres" }
  return { ok: true }
}

export function e164Digits(phone: string) {
  const compact = phone.trim().replace(/[\s().-]/g, "")
  if (compact.startsWith("+")) {
    const digits = compact.slice(1)
    return /^\d{8,15}$/.test(digits) ? digits : ""
  }
  const digits = compact.replace(/\D/g, "").replace(/^00/, "")
  if (digits.length === 10 && digits.startsWith("5")) return `90${digits}`
  if (digits.length === 11 && digits.startsWith("05")) return `90${digits.slice(1)}`
  if (digits.length === 12 && digits.startsWith("905")) return digits
  return ""
}

export function whatsappLink(phone: string, text = "") {
  const digits = e164Digits(phone)
  if (!digits) return ""
  return text ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : `https://wa.me/${digits}`
}

export function filterCustomers(items: EnrichedCustomer[], filter: Partial<CustomerFilter>) {
  const needle = fold((filter.q ?? "").trim())
  const digits = (filter.q ?? "").replace(/\D/g, "")
  return items.filter((item) => {
    if (needle) {
      const hay = fold(`${item.firstName} ${item.lastName} ${item.email} ${item.id}`)
      const phoneHit = digits.length >= 4 && item.phone.replace(/\D/g, "").includes(digits)
      if (!hay.includes(needle) && !phoneHit) return false
    }
    if (filter.status && item.status !== filter.status) return false
    if (filter.verified === "evet" && !item.verifiedAt) return false
    if (filter.verified === "hayir" && item.verifiedAt) return false
    if (isChannel(filter.channel)) {
      const allowed = item.channels[filter.channel]
      if (filter.permission === "hayir" ? allowed : !allowed) return false
    }
    if (filter.block === "var" && !item.block) return false
    if (filter.block === "yok" && item.block) return false
    if (filter.block === "pazarlama" && item.block?.kind !== "pazarlama") return false
    if (filter.block === "iletisim" && item.block?.kind !== "iletisim") return false
    const day = item.createdAt.slice(0, 10)
    if (filter.from && day < filter.from) return false
    if (filter.to && day > filter.to) return false
    return true
  })
}

export function describeFilter(filter: Partial<CustomerFilter>) {
  const parts: string[] = []
  if (filter.q) parts.push(`arama "${clip(filter.q, 40)}"`)
  if (filter.status) parts.push(`durum ${filter.status}`)
  if (filter.verified) parts.push(filter.verified === "evet" ? "doğrulanmış" : "doğrulanmamış")
  if (isChannel(filter.channel)) parts.push(`${channelLabel[filter.channel]} izni ${filter.permission === "hayir" ? "yok" : "var"}`)
  if (filter.block) parts.push(`engel ${filter.block}`)
  if (filter.from) parts.push(`kayıt ≥ ${filter.from}`)
  if (filter.to) parts.push(`kayıt ≤ ${filter.to}`)
  return parts.length ? parts.join(", ") : "tüm müşteriler"
}

export function paginate<T>(items: T[], page: number, size: number) {
  const adet = Math.min(200, Math.max(10, Math.floor(size) || 50))
  const sayfaSayisi = Math.max(1, Math.ceil(items.length / adet))
  const sayfa = Math.min(sayfaSayisi, Math.max(1, Math.floor(page) || 1))
  return { items: items.slice((sayfa - 1) * adet, sayfa * adet), page: { sayfa, adet, toplam: items.length, sayfaSayisi } }
}

export function renderTemplate(text: string, row: { firstName: string; lastName: string; email: string; phone: string }, extra: Record<string, string> = {}) {
  const values: Record<string, string> = {
    ad: row.firstName || "Müşterimiz",
    soyad: row.lastName,
    eposta: row.email,
    gsm: row.phone,
    ...extra,
  }
  return text.replace(/\{([a-zçğıöşü]+)\}/gi, (match, key: string) => {
    const name = key.toLowerCase()
    return name in values ? values[name] : match
  })
}

export function templateParams(body: string) {
  return body
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10)
}

export function parseTemplates(raw: string | null): Template[] | null {
  if (raw === null) return seedTemplates()
  try {
    const data = JSON.parse(raw) as { items?: unknown }
    if (!data || !Array.isArray(data.items)) return null
    return data.items.map(asTemplate).filter((item): item is Template => item !== null).slice(0, templateCap)
  } catch {
    return null
  }
}

function asTemplate(value: unknown): Template | null {
  if (!value || typeof value !== "object") return null
  const row = value as Partial<Template>
  if (typeof row.id !== "string" || !isChannel(row.channel) || typeof row.name !== "string") return null
  return {
    id: row.id.slice(0, 40),
    name: clip(row.name, 80),
    channel: row.channel,
    subject: clip(row.subject, 160),
    body: typeof row.body === "string" ? row.body.slice(0, 6000) : "",
    waName: clip(row.waName, 80),
    waLanguage: clip(row.waLanguage, 12) || "tr",
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : "",
  }
}

export function seedTemplates(): Template[] {
  return [
    {
      id: "hosgeldin",
      name: "Hoş geldin",
      channel: "eposta",
      subject: "Pinwego’ya hoş geldin, {ad}",
      body: "Merhaba {ad},\n\nPinwego’da yakınındaki işletmeleri tek cümleyle bulabilir, randevu ve teklif alabilirsin.\n\nİyi günler dileriz.\nPinwego",
      waName: "",
      waLanguage: "tr",
      updatedAt: "",
    },
    {
      id: "kampanya-duyuru",
      name: "Kampanya duyurusu",
      channel: "eposta",
      subject: "Bu hafta yakınındaki kampanyalar",
      body: "Merhaba {ad},\n\nYakınındaki işletmelerin güncel kampanyaları pinwego.com/kampanyalar sayfasında.\n\nPinwego",
      waName: "",
      waLanguage: "tr",
      updatedAt: "",
    },
    {
      id: "wa-manuel",
      name: "WhatsApp kısa not",
      channel: "whatsapp",
      subject: "",
      body: "Merhaba {ad}, Pinwego destek ekibinden yazıyoruz.",
      waName: "",
      waLanguage: "tr",
      updatedAt: "",
    },
  ]
}

export function saveTemplate(items: Template[], input: Record<string, unknown>, nowIso: string): { ok: true; items: Template[]; item: Template } | { ok: false; error: string } {
  const channel = input.channel
  if (!isChannel(channel)) return { ok: false, error: "Kanal seçilmeli." }
  const name = clip(input.name, 80)
  if (name.length < 2) return { ok: false, error: "Şablon adı en az 2 karakter olmalı." }
  const subject = clip(input.subject, 160)
  const body = typeof input.body === "string" ? input.body.replace(/\r\n/g, "\n").slice(0, 6000) : ""
  if (channel === "eposta" && subject.length < 2) return { ok: false, error: "E-posta şablonu konu ister." }
  if (body.trim().length < 2) return { ok: false, error: "Mesaj metni boş olamaz." }
  const given = clip(input.id, 40)
  const id = given || `tpl-${nowIso.replace(/\D/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 6)}`
  const item: Template = {
    id,
    name,
    channel,
    subject,
    body,
    waName: clip(input.waName, 80),
    waLanguage: clip(input.waLanguage, 12) || "tr",
    updatedAt: nowIso,
  }
  const exists = items.some((row) => row.id === id)
  if (!exists && items.length >= templateCap) return { ok: false, error: "Şablon sınırına ulaşıldı." }
  const next = exists ? items.map((row) => (row.id === id ? item : row)) : [item, ...items]
  return { ok: true, items: next, item }
}

export function removeTemplate(items: Template[], id: string) {
  return items.filter((row) => row.id !== id)
}

export function parseJobs(raw: string | null): SendJob[] | null {
  if (raw === null) return []
  try {
    const data = JSON.parse(raw) as { items?: unknown }
    if (!data || !Array.isArray(data.items)) return null
    return data.items.map(asJob).filter((item): item is SendJob => item !== null).slice(0, jobCap)
  } catch {
    return null
  }
}

function asJob(value: unknown): SendJob | null {
  if (!value || typeof value !== "object") return null
  const row = value as Partial<SendJob>
  if (typeof row.id !== "string" || !isChannel(row.channel)) return null
  const kind: MessageKind = row.kind === "hizmet" ? "hizmet" : "kampanya"
  const mode: JobMode = row.mode === "tek" || row.mode === "manuel" ? row.mode : "toplu"
  const status: JobStatus = row.status === "kuyrukta" || row.status === "iptal" ? row.status : "tamam"
  const skipped: Record<string, number> = {}
  if (row.skipped && typeof row.skipped === "object") {
    for (const [key, count] of Object.entries(row.skipped)) if (typeof count === "number") skipped[key] = count
  }
  return {
    id: row.id.slice(0, 60),
    kind,
    channel: row.channel,
    mode,
    subject: clip(row.subject, 160),
    body: typeof row.body === "string" ? row.body.slice(0, 6000) : "",
    waName: clip(row.waName, 80),
    waLanguage: clip(row.waLanguage, 12),
    filter: clip(row.filter, 240),
    createdAt: typeof row.createdAt === "string" ? row.createdAt : "",
    finishedAt: typeof row.finishedAt === "string" ? row.finishedAt : "",
    status,
    total: typeof row.total === "number" ? row.total : 0,
    sent: typeof row.sent === "number" ? row.sent : 0,
    failed: typeof row.failed === "number" ? row.failed : 0,
    skipped,
    pending: Array.isArray(row.pending) ? row.pending.filter((item): item is string => typeof item === "string").slice(0, bulkCap) : [],
    results: Array.isArray(row.results)
      ? row.results.filter((item): item is JobResult => {
          if (!item || typeof item !== "object") return false
          const result = item as Partial<JobResult>
          return typeof result.id === "string" && (result.status === "gonderildi" || result.status === "hata" || result.status === "atlandi") && typeof result.at === "string"
        }).slice(0, resultCap)
      : [],
    error: clip(row.error, 200),
  }
}

export type JobDraft = {
  kind: MessageKind
  channel: Channel
  mode: JobMode
  subject: string
  body: string
  waName: string
  waLanguage: string
  filter: string
  recipients: string[]
  skipped: Record<string, number>
}

export function newJob(draft: JobDraft, nowIso: string): SendJob {
  const stamp = nowIso.replace(/\D/g, "").slice(0, 14)
  const id = `job-${stamp}-${Math.random().toString(36).slice(2, 8)}`
  return {
    id,
    kind: draft.kind,
    channel: draft.channel,
    mode: draft.mode,
    subject: clip(draft.subject, 160),
    body: draft.body.slice(0, 6000),
    waName: clip(draft.waName, 80),
    waLanguage: clip(draft.waLanguage, 12),
    filter: clip(draft.filter, 240),
    createdAt: nowIso,
    finishedAt: draft.recipients.length ? "" : nowIso,
    status: draft.recipients.length ? "kuyrukta" : "tamam",
    total: draft.recipients.length,
    sent: 0,
    failed: 0,
    skipped: { ...draft.skipped },
    pending: draft.recipients.slice(0, bulkCap),
    results: [],
    error: "",
  }
}

export function recordResult(job: SendJob, result: JobResult): SendJob {
  const next: SendJob = {
    ...job,
    pending: job.pending.filter((id) => id !== result.id),
    results: [result, ...job.results].slice(0, resultCap),
  }
  if (result.status === "gonderildi") next.sent += 1
  else if (result.status === "hata") next.failed += 1
  else next.skipped = { ...next.skipped, [result.reason]: (next.skipped[result.reason] ?? 0) + 1 }
  return next
}

export function finishIfDone(job: SendJob, nowIso: string): SendJob {
  if (job.pending.length || job.status !== "kuyrukta") return job
  return { ...job, status: "tamam", finishedAt: nowIso }
}

export function cancelJob(job: SendJob, nowIso: string): SendJob {
  if (job.status !== "kuyrukta") return job
  return { ...job, status: "iptal", finishedAt: nowIso, pending: [], skipped: { ...job.skipped, iptal: (job.skipped.iptal ?? 0) + job.pending.length } }
}

export function upsertJob(items: SendJob[], job: SendJob) {
  const exists = items.some((row) => row.id === job.id)
  const next = exists ? items.map((row) => (row.id === job.id ? job : row)) : [job, ...items]
  return next.slice(0, jobCap)
}

export function jobsFor(items: SendJob[], accountId: string, max = 20) {
  const rows: Array<{ jobId: string; channel: Channel; kind: MessageKind; mode: JobMode; subject: string; status: ResultStatus; reason: string; at: string }> = []
  for (const job of items) {
    for (const result of job.results) {
      if (result.id !== accountId) continue
      rows.push({ jobId: job.id, channel: job.channel, kind: job.kind, mode: job.mode, subject: job.subject, status: result.status, reason: result.reason, at: result.at })
      if (rows.length >= max) return rows
    }
  }
  return rows
}

export function publicJob(job: SendJob) {
  return { ...job, pending: undefined, pendingCount: job.pending.length, body: job.body.slice(0, 400) }
}

export type ChannelCounts = Record<Channel, number>

export type CommsReport = {
  total: number
  aktif: number
  bekliyor: number
  askida: number
  silindi: number
  verified: number
  permitted: ChannelCounts
  blocked: { pazarlama: number; iletisim: number }
  reachable: ChannelCounts
  optOuts30: number
  jobs: { total: number; sent: number; failed: number; skipped: number; queued: number; byChannel: ChannelCounts }
}

export function commsReport(items: EnrichedCustomer[], state: CommsState, jobs: SendJob[], nowIso: string): CommsReport {
  const counts = { permitted: { eposta: 0, sms: 0, whatsapp: 0 }, reachable: { eposta: 0, sms: 0, whatsapp: 0 } }
  let pazarlama = 0
  let iletisim = 0
  for (const item of items) {
    if (item.block?.kind === "pazarlama") pazarlama += 1
    if (item.block?.kind === "iletisim") iletisim += 1
    for (const channel of channels) {
      if (item.channels[channel]) counts.permitted[channel] += 1
      if (eligibility(item, channel, "kampanya").ok) counts.reachable[channel] += 1
    }
  }
  const since = new Date(new Date(nowIso).getTime() - 30 * 86_400_000).toISOString()
  const optOuts30 = state.history.filter((item) => item.channel !== "engel" && !item.accepted && item.at >= since).length
  const byChannel: Record<Channel, number> = { eposta: 0, sms: 0, whatsapp: 0 }
  let sent = 0
  let failed = 0
  let skipped = 0
  let queued = 0
  for (const job of jobs) {
    byChannel[job.channel] += 1
    sent += job.sent
    failed += job.failed
    skipped += Object.values(job.skipped).reduce((sum, count) => sum + count, 0)
    if (job.status === "kuyrukta") queued += job.pending.length
  }
  return {
    total: items.length,
    aktif: items.filter((item) => item.status === "aktif").length,
    bekliyor: items.filter((item) => item.status === "bekliyor").length,
    askida: items.filter((item) => item.status === "askida").length,
    silindi: items.filter((item) => item.status === "silindi").length,
    verified: items.filter((item) => item.verifiedAt.length > 0).length,
    permitted: counts.permitted,
    blocked: { pazarlama, iletisim },
    reachable: counts.reachable,
    optOuts30,
    jobs: { total: jobs.length, sent, failed, skipped, queued, byChannel },
  }
}

function csvCell(value: string) {
  const text = value.replace(/\r?\n/g, " ")
  if (/^[=+\-@\t\r]/.test(text)) return `"'${text.replace(/"/g, '""')}"`
  return /[;"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function customersCsv(items: EnrichedCustomer[]) {
  const header = ["Müşteri ID", "Adı", "Soyadı", "GSM", "E-posta", "Kayıt tarihi", "E-posta doğrulama", "Hesap durumu", "E-posta izni", "SMS izni", "WhatsApp izni", "Engel", "Son giriş"]
  const lines = [header.join(";")]
  for (const item of items) {
    lines.push(
      [
        item.id,
        item.firstName,
        item.lastName,
        item.phone,
        item.email,
        item.createdAt.slice(0, 10),
        item.verifiedAt ? "doğrulandı" : "bekliyor",
        item.status,
        item.channels.eposta ? "izinli" : "izinsiz",
        item.channels.sms ? "izinli" : "izinsiz",
        item.channels.whatsapp ? "izinli" : "izinsiz",
        item.block ? blockLabel[item.block.kind] : "",
        item.lastLoginAt.slice(0, 16).replace("T", " "),
      ]
        .map(csvCell)
        .join(";"),
    )
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`
}

export function optOutFooter(url: string) {
  return {
    text: `\n\n—\nBu kampanya postasını Pinwego hesabındaki tercih kutusuyla veya şu bağlantıyla kapatabilirsin: ${url}\nPinwego · destek@pinwego.com`,
    html: `<hr style="border:none;border-top:1px solid #ddd;margin:24px 0"><p style="font-size:12px;color:#666">Bu kampanya postasını Pinwego hesabındaki tercih kutusuyla veya <a href="${url}">bu bağlantıyla</a> kapatabilirsin.<br>Pinwego · destek@pinwego.com</p>`,
  }
}

export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export function textToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 12px;line-height:1.6">${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("")
}
