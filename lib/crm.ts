export const workspaces = ["pinwego", "personal"] as const
export type Workspace = (typeof workspaces)[number]
export const currencies = ["TRY", "USD", "EUR"] as const
export type Currency = (typeof currencies)[number]
export const stages = ["yeni", "temas", "ihtiyac", "teklif", "gonderildi", "karar", "kazanildi", "kaybedildi"] as const
export type Stage = (typeof stages)[number]
export const taskStatuses = ["yapilacak", "devam", "bekliyor", "tamamlandi", "iptal"] as const
export type TaskStatus = (typeof taskStatuses)[number]
export const priorities = ["dusuk", "normal", "yuksek", "acil"] as const
export const quoteStatuses = ["taslak", "onay", "gonderildi", "kabul", "red", "suresi"] as const
export const subStatuses = ["deneme", "aktif", "odeme", "askida", "iptal", "suresi"] as const
export const ticketStatuses = ["yeni", "inceleniyor", "yanit", "cozuldu", "kapali"] as const

const zone = "Europe/Istanbul"
const dayMs = 86_400_000

export type Contact = {
  id: string
  workspace: Workspace
  contactType: "kisi" | "isletme" | "platform"
  businessId: string
  firstName: string
  lastName: string
  company: string
  jobTitle: string
  email: string
  phone: string
  source: string
  status: "aday" | "aktif" | "beklemede"
  assignee: string
  notes: string
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export type Interaction = {
  id: string
  contactId: string
  type: "telefon" | "eposta" | "toplanti" | "mesaj" | "not" | "diger"
  subject: string
  description: string
  occurredAt: string
  origin: "manuel"
  createdAt: string
}

export type Deal = {
  id: string
  workspace: Workspace
  contactId: string
  title: string
  stage: Stage
  amountCents: number
  currency: Currency
  probability: number
  expectedClose: string
  assignee: string
  source: string
  lostReason: string
  createdAt: string
  updatedAt: string
  closedAt: string | null
}

export type Task = {
  id: string
  workspace: Workspace
  title: string
  description: string
  contactId: string
  dealId: string
  priority: (typeof priorities)[number]
  status: TaskStatus
  dueAt: string
  reminderAt: string
  recurrence: "" | "gun" | "hafta" | "ay"
  mail: boolean
  until: string
  seriesKey: string
  spawned: number
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export type CalendarEvent = {
  id: string
  workspace: Workspace
  title: string
  description: string
  eventType: "randevu" | "toplanti" | "arama" | "kisisel" | "son"
  contactId: string
  dealId: string
  taskId: string
  startAt: string
  endAt: string
  allDay: boolean
  location: string
  mail: boolean
  status: "planli" | "tamamlandi" | "iptal"
  createdAt: string
  updatedAt: string
}

export type QuoteItem = { id: string; description: string; quantity: number; unitCents: number; taxBps: number }
export type Quote = {
  id: string
  number: string
  workspace: Workspace
  contactId: string
  dealId: string
  status: (typeof quoteStatuses)[number]
  currency: Currency
  items: QuoteItem[]
  validUntil: string
  notes: string
  mail: boolean
  createdAt: string
  updatedAt: string
}

export type PaymentMark = { id: string; amountCents: number; paidAt: string; reference: string; clientKey: string; manual: true }
export type Payment = {
  id: string
  workspace: Workspace
  contactId: string
  dealId: string
  quoteId: string
  subscriptionId: string
  amountCents: number
  currency: Currency
  dueDate: string
  method: string
  reference: string
  clientKey: string
  notes: string
  mail: boolean
  cancelled: boolean
  marks: PaymentMark[]
  createdAt: string
  updatedAt: string
}

export type Subscription = {
  id: string
  workspace: Workspace
  contactId: string
  businessId: string
  plan: string
  status: (typeof subStatuses)[number]
  currency: Currency
  amountCents: number
  period: "aylik" | "yillik"
  startsAt: string
  periodEnd: string
  nextRenewal: string
  autoRenew: boolean
  mail: boolean
  notes: string
  createdAt: string
  updatedAt: string
}

export type TicketMessage = { id: string; body: string; internal: boolean; createdAt: string }
export type Ticket = {
  id: string
  number: string
  workspace: Workspace
  contactId: string
  businessId: string
  subject: string
  description: string
  category: string
  priority: (typeof priorities)[number]
  status: (typeof ticketStatuses)[number]
  assignee: string
  dueAt: string
  mail: boolean
  resolvedAt: string | null
  messages: TicketMessage[]
  createdAt: string
  updatedAt: string
}

export type Audit = { id: string; actor: string; entity: string; entityId: string; action: string; at: string; meta: string }
export type WatchKind = "kampanya" | "uyelik" | "not"
export type Watch = { id: string; workspace: Workspace; kind: WatchKind; title: string; detail: string; endDate: string; mail: boolean; createdAt: string }
export type Notice = { id: string; key: string; title: string; message: string; entity: string; entityId: string; at: string; readAt: string | null; workspace?: Workspace; mail?: boolean; mailedAt?: string | null }

export type CrmState = {
  version: 1
  settings: { taxBps: number; remindDays: number; mailOn: boolean }
  seq: { quote: number; ticket: number }
  contacts: Contact[]
  interactions: Interaction[]
  deals: Deal[]
  tasks: Task[]
  events: CalendarEvent[]
  quotes: Quote[]
  payments: Payment[]
  subscriptions: Subscription[]
  tickets: Ticket[]
  watches: Watch[]
  audits: Audit[]
  notices: Notice[]
}

export type CrmResult = { ok: true; state: CrmState; warning: string } | { ok: false; error: string }

export function emptyCrm(): CrmState {
  return {
    version: 1,
    settings: { taxBps: 2000, remindDays: 3, mailOn: false },
    seq: { quote: 0, ticket: 0 },
    contacts: [],
    interactions: [],
    deals: [],
    tasks: [],
    events: [],
    quotes: [],
    payments: [],
    subscriptions: [],
    tickets: [],
    watches: [],
    audits: [],
    notices: [],
  }
}

export function parseCrm(raw: string | null): CrmState | null {
  if (!raw) return emptyCrm()
  try {
    const data = JSON.parse(raw) as CrmState
    if (data?.version !== 1 || !Array.isArray(data.contacts) || !Array.isArray(data.payments)) return null
    if (!data.settings) data.settings = { taxBps: 2000, remindDays: 3, mailOn: false }
    if (typeof data.settings.mailOn !== "boolean") data.settings.mailOn = false
    if (!Array.isArray(data.watches)) data.watches = []
    return data
  } catch {
    return null
  }
}

export function istanbulDay(value: string | number) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date)
}

export function money(cents: number, currency: Currency) {
  const amount = `${Math.floor(Math.abs(cents) / 100)}.${String(Math.abs(cents) % 100).padStart(2, "0")}`
  return `${cents < 0 ? "-" : ""}${amount} ${currency}`
}

export function quoteTotals(items: QuoteItem[]) {
  let subtotal = 0
  let tax = 0
  const lines = items.map((item) => {
    const net = item.quantity * item.unitCents
    const lineTax = Math.round((net * item.taxBps) / 10_000)
    subtotal += net
    tax += lineTax
    return { ...item, net, lineTax, lineTotal: net + lineTax }
  })
  return { lines, subtotal, tax, total: subtotal + tax }
}

export function receivedCents(payment: Payment) {
  return payment.marks.reduce((sum, mark) => sum + mark.amountCents, 0)
}

export function paymentStatus(payment: Payment, now: number) {
  if (payment.cancelled) return "iptal" as const
  const received = receivedCents(payment)
  if (received >= payment.amountCents && payment.amountCents > 0) return "odendi" as const
  if (received > 0) return "kismi" as const
  if (payment.dueDate && payment.dueDate < istanbulDay(now)) return "gecikti" as const
  return "bekliyor" as const
}

function text(value: unknown, max: number) {
  if (typeof value !== "string") return ""
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

function cents(value: unknown) {
  const number = typeof value === "number" ? value : Number(text(value, 12))
  if (!Number.isInteger(number) || number < 0 || number > 100_000_000_00) return null
  return number
}

function when(value: unknown) {
  const raw = text(value, 40)
  if (!raw) return ""
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function day(value: unknown) {
  const raw = text(value, 10)
  if (!raw) return ""
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null
}

function id() {
  return crypto.randomUUID()
}

function audit(state: CrmState, entity: string, entityId: string, action: string, at: string, meta = "") {
  state.audits.unshift({ id: id(), actor: "yonetici", entity, entityId, action, at, meta: meta.slice(0, 180) })
  state.audits = state.audits.slice(0, 400)
}

function notice(state: CrmState, key: string, title: string, message: string, entity: string, entityId: string, at: string, workspace: Workspace, mail = false) {
  const prior = state.notices.find((item) => item.key === key)
  if (prior) {
    if (mail && !prior.mailedAt) prior.mail = true
    return false
  }
  state.notices.unshift({ id: id(), key, title, message, entity, entityId, at, readAt: null, workspace, mail, mailedAt: null })
  state.notices = state.notices.slice(0, 200)
  return true
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

const remindLabel: Record<string, string> = {
  task: "Görev",
  event: "Ajanda",
  quote: "Teklif",
  payment: "Tahsilat",
  subscription: "Üyelik",
  ticket: "Destek",
  watch: "Tarih",
}

export function reminderDigest(state: CrmState) {
  if (!state.settings.mailOn) return null
  const items = state.notices.filter((item) => item.mail && !item.mailedAt)
  if (!items.length) return null
  const lines = items.map((item) => `${remindLabel[item.entity] || "Kayıt"} · ${item.title} · ${item.message}`)
  const text = ["Pinwego hatırlatması", "", ...lines, "", "Bu posta, mail ile işaretlediğiniz kayıtlar için bir kez gider."].join("\n")
  const html = `<p>Pinwego hatırlatması</p><ul>${items.map((item) => `<li><strong>${escapeHtml(remindLabel[item.entity] || "Kayıt")}</strong> · ${escapeHtml(item.title)} · ${escapeHtml(item.message)}</li>`).join("")}</ul><p>Bu posta, mail ile işaretlediğiniz kayıtlar için bir kez gider.</p>`
  return {
    subject: items.length === 1 ? `Hatırlatma: ${items[0].title}`.slice(0, 140) : `Pinwego hatırlatması (${items.length})`,
    text,
    html,
    ids: items.map((item) => item.id),
  }
}

export function markReminded(state: CrmState, ids: string[], at: string) {
  for (const item of state.notices) {
    if (ids.includes(item.id)) item.mailedAt = at
  }
  return state
}

export function noticeWorkspace(state: CrmState, item: Notice): Workspace | "" {
  if (item.workspace) return item.workspace
  const rows = item.entity === "task" ? state.tasks : item.entity === "quote" ? state.quotes : item.entity === "payment" ? state.payments : item.entity === "subscription" ? state.subscriptions : item.entity === "ticket" ? state.tickets : []
  return rows.find((row) => row.id === item.entityId)?.workspace || ""
}

function workspaceOf(value: unknown): Workspace | null {
  return value === "pinwego" || value === "personal" ? value : null
}

function contact(state: CrmState, contactId: string) {
  return state.contacts.find((item) => item.id === contactId && !item.archivedAt)
}

export function sweep(state: CrmState, now: number) {
  const at = new Date(now).toISOString()
  const today = istanbulDay(now)
  const lead = new Date(now + state.settings.remindDays * dayMs)
  const leadDay = istanbulDay(lead.getTime())
  const renewLead = istanbulDay(now + 7 * dayMs)
  for (const task of state.tasks) {
    if (task.status === "tamamlandi" || task.status === "iptal") continue
    if (task.reminderAt && new Date(task.reminderAt).getTime() <= now) {
      notice(state, `task-remind:${task.id}:${task.reminderAt}`, "Görev hatırlatması", task.title, "task", task.id, at, task.workspace, task.mail === true)
    }
    if (task.dueAt && new Date(task.dueAt).getTime() < now) {
      notice(state, `task-late:${task.id}:${task.dueAt}`, "Görev gecikti", task.title, "task", task.id, at, task.workspace, task.mail === true)
    }
  }
  for (const quote of state.quotes) {
    if (!quote.validUntil || quote.validUntil < today || quote.validUntil > leadDay) continue
    if (quote.status === "red" || quote.status === "kabul" || quote.status === "suresi") continue
    notice(state, `quote:${quote.id}:${quote.validUntil}`, "Teklifin süresi yaklaşıyor", quote.number, "quote", quote.id, at, quote.workspace, quote.mail === true)
  }
  for (const payment of state.payments) {
    const status = paymentStatus(payment, now)
    if (status === "odendi" || status === "iptal" || !payment.dueDate) continue
    if (payment.dueDate > leadDay) continue
    notice(state, `pay:${payment.id}:${payment.dueDate}`, status === "gecikti" ? "Tahsilat gecikti" : "Tahsilat vadesi yaklaşıyor", money(payment.amountCents, payment.currency), "payment", payment.id, at, payment.workspace, payment.mail === true)
  }
  for (const item of state.subscriptions) {
    if (item.status === "iptal" || item.status === "suresi" || !item.nextRenewal) continue
    if (item.nextRenewal < today || item.nextRenewal > renewLead) continue
    const key = `sub:${item.id}:${item.nextRenewal}`
    if (state.tasks.some((task) => task.seriesKey === key)) continue
    state.tasks.unshift({
      id: id(),
      workspace: item.workspace,
      title: `${item.plan} yenilemesi`,
      description: "Abonelik yenileme takibi. Ödeme kendiliğinden alınmış sayılmaz.",
      contactId: item.contactId,
      dealId: "",
      priority: "yuksek",
      status: "yapilacak",
      dueAt: new Date(`${item.nextRenewal}T09:00:00+03:00`).toISOString(),
      reminderAt: "",
      recurrence: "",
      until: "",
      seriesKey: key,
      spawned: 0,
      createdAt: at,
      updatedAt: at,
      completedAt: null,
    })
    notice(state, key, "Üyelik bitişi", item.plan, "subscription", item.id, at, item.workspace, item.mail === true)
  }
  for (const ticket of state.tickets) {
    if (!ticket.dueAt || ticket.status === "cozuldu" || ticket.status === "kapali") continue
    if (new Date(ticket.dueAt).getTime() >= now) continue
    notice(state, `ticket:${ticket.id}:${ticket.dueAt}`, "Destek talebi gecikti", ticket.subject, "ticket", ticket.id, at, ticket.workspace, ticket.mail === true)
  }
  for (const event of state.events) {
    if (event.status !== "planli") continue
    const startDay = istanbulDay(event.startAt)
    if (!startDay || startDay < today || startDay > leadDay) continue
    notice(state, `event:${event.id}:${startDay}`, "Ajanda", event.title, "event", event.id, at, event.workspace, event.mail === true)
  }
  const watchLabel = { kampanya: "Kampanya bitişi", uyelik: "Üyelik bitişi", not: "Not" } as const
  for (const item of state.watches) {
    if (!item.endDate || item.endDate < today || item.endDate > leadDay) continue
    notice(state, `watch:${item.id}:${item.endDate}`, watchLabel[item.kind], `${item.title}${item.detail ? ` · ${item.detail}` : ""}`, "watch", item.id, at, item.workspace, item.mail)
  }
  return state
}

function bag(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

export function applyCrm(input: CrmState, action: Record<string, unknown>, now = Date.now()): CrmResult {
  const state: CrmState = structuredClone(input)
  const at = new Date(now).toISOString()
  const op = text(action.op, 40)
  let warning = ""

  if (op === "settings.save") {
    const taxBps = cents(action.taxBps)
    const remindDays = cents(action.remindDays)
    if (taxBps === null || taxBps > 10_000 || remindDays === null || remindDays > 30) return { ok: false, error: "Ayar kabul edilmedi." }
    state.settings = { taxBps, remindDays, mailOn: action.mailOn === true }
    audit(state, "settings", "crm", "guncelle", at)
  } else if (op === "contact.save") {
    const body = bag(action.contact)
    const workspace = workspaceOf(body.workspace)
    const contactType = oneOf(body.contactType, ["kisi", "isletme", "platform"] as const, "kisi")
    const businessId = text(body.businessId, 80)
    if (!workspace) return { ok: false, error: "Çalışma alanı seç." }
    if (contactType === "platform" && !businessId) return { ok: false, error: "Platform işletmesini seç." }
    const firstName = text(body.firstName, 80)
    const company = text(body.company, 120)
    if (!firstName && !company) return { ok: false, error: "Ad veya işletme adı yaz." }
    const email = text(body.email, 120)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "E-posta geçersiz." }
    const current = text(body.id, 80)
    const prior = state.contacts.find((item) => item.id === current)
    const next: Contact = {
      id: prior?.id || id(),
      workspace,
      contactType,
      businessId,
      firstName,
      lastName: text(body.lastName, 80),
      company,
      jobTitle: text(body.jobTitle, 80),
      email,
      phone: text(body.phone, 30),
      source: text(body.source, 80),
      status: oneOf(body.status, ["aday", "aktif", "beklemede"] as const, "aday"),
      assignee: text(body.assignee, 80),
      notes: text(body.notes, 2000),
      createdAt: prior?.createdAt || at,
      updatedAt: at,
      archivedAt: prior?.archivedAt || null,
    }
    if (!prior && state.contacts.length >= 500) return { ok: false, error: "Müşteri listesi dolu." }
    state.contacts = [next, ...state.contacts.filter((item) => item.id !== next.id)]
    audit(state, "contact", next.id, prior ? "guncelle" : "ekle", at, next.workspace)
  } else if (op === "contact.archive") {
    const item = state.contacts.find((row) => row.id === text(action.id, 80))
    if (!item) return { ok: false, error: "Müşteri bulunamadı." }
    item.archivedAt = at
    item.updatedAt = at
    audit(state, "contact", item.id, "arsiv", at)
  } else if (op === "interaction.add") {
    const owner = contact(state, text(action.contactId, 80))
    const subject = text(action.subject, 140)
    const occurredAt = when(action.occurredAt)
    if (!owner || !subject || !occurredAt) return { ok: false, error: "Görüşme bilgisi eksik." }
    state.interactions.unshift({
      id: id(),
      contactId: owner.id,
      type: oneOf(action.type, ["telefon", "eposta", "toplanti", "mesaj", "not", "diger"] as const, "not"),
      subject,
      description: text(action.description, 2000),
      occurredAt,
      origin: "manuel",
      createdAt: at,
    })
    state.interactions = state.interactions.slice(0, 2000)
    audit(state, "interaction", owner.id, "ekle", at)
  } else if (op === "deal.save" || op === "deal.stage") {
    const body = op === "deal.stage" ? action : bag(action.deal)
    const current = text(body.id, 80)
    const prior = state.deals.find((item) => item.id === current)
    const owner = contact(state, text(body.contactId, 80) || prior?.contactId || "")
    const title = text(body.title, 140) || prior?.title || ""
    const stage = oneOf(body.stage, stages, prior?.stage || "yeni")
    const amountCents = body.amountCents === undefined && prior ? prior.amountCents : cents(body.amountCents)
    const currency = oneOf(body.currency, currencies, prior?.currency || "TRY")
    const probability = body.probability === undefined && prior ? prior.probability : cents(body.probability)
    const lostReason = text(body.lostReason, 180) || (stage === prior?.stage ? prior?.lostReason || "" : "")
    if (!owner || !title || amountCents === null || probability === null || probability > 100) return { ok: false, error: "Fırsat bilgisi eksik." }
    if (stage === "kaybedildi" && !lostReason) return { ok: false, error: "Kaybedilen fırsat için neden yaz." }
    const next: Deal = {
      id: prior?.id || id(),
      workspace: owner.workspace,
      contactId: owner.id,
      title,
      stage,
      amountCents,
      currency,
      probability,
      expectedClose: day(body.expectedClose) || prior?.expectedClose || "",
      assignee: text(body.assignee, 80) || prior?.assignee || "",
      source: text(body.source, 80) || prior?.source || "",
      lostReason,
      createdAt: prior?.createdAt || at,
      updatedAt: at,
      closedAt: stage === "kazanildi" || stage === "kaybedildi" ? prior?.closedAt || at : null,
    }
    if (day(body.expectedClose) === null) return { ok: false, error: "Kapanış tarihi geçersiz." }
    state.deals = [next, ...state.deals.filter((item) => item.id !== next.id)].slice(0, 500)
    audit(state, "deal", next.id, stage, at, `${next.amountCents} ${next.currency}`)
  } else if (op === "task.save" || op === "task.status" || op === "task.postpone") {
    const body = op === "task.save" ? bag(action.task) : action
    const current = text(body.id, 80)
    const prior = state.tasks.find((item) => item.id === current)
    const linked = text(body.contactId, 80) || prior?.contactId || ""
    const owner = linked ? contact(state, linked) : undefined
    if (linked && !owner) return { ok: false, error: "Müşteri bulunamadı." }
    const workspace = owner?.workspace || workspaceOf(body.workspace) || prior?.workspace
    const title = text(body.title, 140) || prior?.title || ""
    const dueAt = body.dueAt === undefined && prior ? prior.dueAt : when(body.dueAt)
    const reminderAt = body.reminderAt === undefined && prior ? prior.reminderAt : when(body.reminderAt)
    if (!workspace || !title || dueAt === null || reminderAt === null) return { ok: false, error: "Görev bilgisi eksik." }
    const status = oneOf(body.status, taskStatuses, prior?.status || "yapilacak")
    const next: Task = {
      id: prior?.id || id(),
      workspace,
      title,
      description: text(body.description, 2000) || prior?.description || "",
      contactId: owner?.id || "",
      dealId: text(body.dealId, 80) || prior?.dealId || "",
      priority: oneOf(body.priority, priorities, prior?.priority || "normal"),
      status,
      dueAt: dueAt || "",
      reminderAt: reminderAt || "",
      recurrence: oneOf(body.recurrence, ["", "gun", "hafta", "ay"] as const, prior?.recurrence || ""),
      mail: body.mail === undefined && prior ? prior.mail === true : body.mail === true,
      until: day(body.until) || prior?.until || "",
      seriesKey: prior?.seriesKey || "",
      spawned: prior?.spawned || 0,
      createdAt: prior?.createdAt || at,
      updatedAt: at,
      completedAt: status === "tamamlandi" ? prior?.completedAt || at : null,
    }
    if (day(body.until) === null) return { ok: false, error: "Tekrar bitişi geçersiz." }
    state.tasks = [next, ...state.tasks.filter((item) => item.id !== next.id)].slice(0, 800)
    if (status === "tamamlandi" && next.recurrence && next.spawned < 24 && next.dueAt) {
      const nextDue = new Date(next.dueAt)
      if (next.recurrence === "gun") nextDue.setUTCDate(nextDue.getUTCDate() + 1)
      if (next.recurrence === "hafta") nextDue.setUTCDate(nextDue.getUTCDate() + 7)
      if (next.recurrence === "ay") nextDue.setUTCMonth(nextDue.getUTCMonth() + 1)
      const untilOk = !next.until || istanbulDay(nextDue.toISOString()) <= next.until
      if (untilOk) {
        const shift = next.reminderAt ? new Date(next.reminderAt).getTime() - new Date(next.dueAt).getTime() : 0
        state.tasks.unshift({
          ...next,
          id: id(),
          status: "yapilacak",
          dueAt: nextDue.toISOString(),
          reminderAt: next.reminderAt ? new Date(nextDue.getTime() + shift).toISOString() : "",
          completedAt: null,
          spawned: next.spawned + 1,
          createdAt: at,
          updatedAt: at,
        })
        next.spawned += 1
      }
    }
    audit(state, "task", next.id, status, at)
  } else if (op === "event.save" || op === "event.cancel") {
    const body = op === "event.cancel" ? action : bag(action.event)
    const current = text(body.id, 80)
    const prior = state.events.find((item) => item.id === current)
    if (op === "event.cancel") {
      if (!prior) return { ok: false, error: "Etkinlik bulunamadı." }
      prior.status = "iptal"
      prior.updatedAt = at
      audit(state, "event", prior.id, "iptal", at)
    } else {
      const linked = text(body.contactId, 80)
      const owner = linked ? contact(state, linked) : undefined
      if (linked && !owner) return { ok: false, error: "Müşteri bulunamadı." }
      const workspace = owner?.workspace || workspaceOf(body.workspace) || prior?.workspace
      const title = text(body.title, 140)
      const startAt = when(body.startAt)
      const endAt = when(body.endAt)
      if (!workspace || !title || !startAt || !endAt || new Date(endAt) < new Date(startAt)) return { ok: false, error: "Etkinlik tarihi geçersiz." }
      const next: CalendarEvent = {
        id: prior?.id || id(),
        workspace,
        title,
        description: text(body.description, 2000),
        eventType: oneOf(body.eventType, ["randevu", "toplanti", "arama", "kisisel", "son"] as const, "randevu"),
        contactId: owner?.id || "",
        dealId: text(body.dealId, 80),
        taskId: text(body.taskId, 80),
        startAt,
        endAt,
        allDay: body.allDay === true,
        location: text(body.location, 160),
        mail: body.mail === undefined && prior ? prior.mail === true : body.mail === true,
        status: oneOf(body.status, ["planli", "tamamlandi", "iptal"] as const, "planli"),
        createdAt: prior?.createdAt || at,
        updatedAt: at,
      }
      const clash = state.events.find((item) => item.id !== next.id && item.workspace === next.workspace && item.status !== "iptal" && new Date(item.startAt) < new Date(next.endAt) && new Date(next.startAt) < new Date(item.endAt))
      if (clash) warning = `Aynı aralıkta başka kayıt var: ${clash.title}`
      state.events = [next, ...state.events.filter((item) => item.id !== next.id)].slice(0, 800)
      audit(state, "event", next.id, prior ? "guncelle" : "ekle", at)
    }
  } else if (op === "quote.save" || op === "quote.status") {
    const body = op === "quote.status" ? action : bag(action.quote)
    const current = text(body.id, 80)
    const prior = state.quotes.find((item) => item.id === current)
    const owner = contact(state, text(body.contactId, 80) || prior?.contactId || "")
    if (!owner) return { ok: false, error: "Müşteri bulunamadı." }
    const rawItems = Array.isArray(body.items) ? body.items : prior?.items || []
    const items: QuoteItem[] = []
    for (const row of rawItems.slice(0, 40)) {
      const item = bag(row)
      const quantity = cents(item.quantity)
      const unitCents = cents(item.unitCents)
      const taxBps = item.taxBps === undefined ? state.settings.taxBps : cents(item.taxBps)
      const description = text(item.description, 180)
      if (!description || quantity === null || quantity < 1 || unitCents === null || taxBps === null || taxBps > 10_000) return { ok: false, error: "Teklif kalemi geçersiz." }
      items.push({ id: text(item.id, 80) || id(), description, quantity, unitCents, taxBps })
    }
    if (!items.length) return { ok: false, error: "Teklife en az bir kalem ekle." }
    const validUntil = body.validUntil === undefined && prior ? prior.validUntil : day(body.validUntil)
    if (validUntil === null) return { ok: false, error: "Geçerlilik tarihi geçersiz." }
    const number = prior?.number || `PW-${istanbulDay(now).slice(0, 4)}-${String(++state.seq.quote).padStart(4, "0")}`
    const next: Quote = {
      id: prior?.id || id(),
      number,
      workspace: owner.workspace,
      contactId: owner.id,
      dealId: text(body.dealId, 80) || prior?.dealId || "",
      status: oneOf(body.status, quoteStatuses, prior?.status || "taslak"),
      currency: oneOf(body.currency, currencies, prior?.currency || "TRY"),
      items,
      validUntil: validUntil || "",
      notes: text(body.notes, 2000) || prior?.notes || "",
      mail: body.mail === undefined && prior ? prior.mail === true : body.mail === true,
      createdAt: prior?.createdAt || at,
      updatedAt: at,
    }
    state.quotes = [next, ...state.quotes.filter((item) => item.id !== next.id)].slice(0, 400)
    audit(state, "quote", next.id, next.status, at, String(quoteTotals(next.items).total))
  } else if (op === "payment.save" || op === "payment.receive" || op === "payment.cancel") {
    const clientKey = text(action.clientKey, 80)
    if (op === "payment.save" && clientKey && state.payments.some((item) => item.clientKey === clientKey)) {
      warning = "Bu tahsilat zaten kayıtlı."
    } else if (op === "payment.receive") {
      const item = state.payments.find((row) => row.id === text(action.id, 80))
      const amount = cents(action.amountCents)
      if (!item || item.cancelled || amount === null || amount < 1) return { ok: false, error: "Tahsilat hareketi geçersiz." }
      if (clientKey && item.marks.some((mark) => mark.clientKey === clientKey)) warning = "Bu ödeme hareketi zaten kayıtlı."
      else if (receivedCents(item) + amount > item.amountCents) return { ok: false, error: "Ödeme kalan tutarı aşıyor." }
      else {
        item.marks.push({ id: id(), amountCents: amount, paidAt: at, reference: text(action.reference, 80), clientKey, manual: true })
        item.updatedAt = at
        audit(state, "payment", item.id, "hareket", at, String(amount))
      }
    } else if (op === "payment.cancel") {
      const item = state.payments.find((row) => row.id === text(action.id, 80))
      if (!item) return { ok: false, error: "Tahsilat bulunamadı." }
      item.cancelled = true
      item.updatedAt = at
      audit(state, "payment", item.id, "iptal", at)
    } else {
      const body = bag(action.payment)
      const owner = contact(state, text(body.contactId, 80))
      const amountCents = cents(body.amountCents)
      const dueDate = day(body.dueDate)
      if (!owner || amountCents === null || amountCents < 1 || dueDate === null) return { ok: false, error: "Tahsilat bilgisi eksik." }
      const next: Payment = {
        id: id(),
        workspace: owner.workspace,
        contactId: owner.id,
        dealId: text(body.dealId, 80),
        quoteId: text(body.quoteId, 80),
        subscriptionId: text(body.subscriptionId, 80),
        amountCents,
        currency: oneOf(body.currency, currencies, "TRY"),
        dueDate: dueDate || "",
        method: text(body.method, 40),
        reference: text(body.reference, 80),
        clientKey,
        notes: text(body.notes, 1000),
        mail: body.mail === true,
        cancelled: false,
        marks: [],
        createdAt: at,
        updatedAt: at,
      }
      state.payments.unshift(next)
      state.payments = state.payments.slice(0, 500)
      audit(state, "payment", next.id, "ekle", at, `${amountCents}`)
    }
  } else if (op === "subscription.save") {
    const body = bag(action.subscription)
    const current = text(body.id, 80)
    const prior = state.subscriptions.find((item) => item.id === current)
    const owner = contact(state, text(body.contactId, 80) || prior?.contactId || "")
    const amountCents = body.amountCents === undefined && prior ? prior.amountCents : cents(body.amountCents)
    const startsAt = day(body.startsAt) || prior?.startsAt || ""
    const periodEnd = day(body.periodEnd) || prior?.periodEnd || ""
    const nextRenewal = day(body.nextRenewal) || prior?.nextRenewal || ""
    if (!owner || !text(body.plan, 80) && !prior || amountCents === null || day(body.startsAt) === null) return { ok: false, error: "Abonelik bilgisi eksik." }
    const next: Subscription = {
      id: prior?.id || id(),
      workspace: owner.workspace,
      contactId: owner.id,
      businessId: text(body.businessId, 80),
      plan: text(body.plan, 80) || prior?.plan || "",
      status: oneOf(body.status, subStatuses, prior?.status || "aktif"),
      currency: oneOf(body.currency, currencies, prior?.currency || "TRY"),
      amountCents,
      period: oneOf(body.period, ["aylik", "yillik"] as const, prior?.period || "aylik"),
      startsAt,
      periodEnd,
      nextRenewal,
      autoRenew: body.autoRenew === true,
      mail: body.mail === undefined && prior ? prior.mail === true : body.mail === true,
      notes: text(body.notes, 1000),
      createdAt: prior?.createdAt || at,
      updatedAt: at,
    }
    state.subscriptions = [next, ...state.subscriptions.filter((item) => item.id !== next.id)].slice(0, 300)
    audit(state, "subscription", next.id, next.status, at)
  } else if (op === "ticket.save" || op === "ticket.note" || op === "ticket.status") {
    if (op === "ticket.note" || op === "ticket.status") {
      const item = state.tickets.find((row) => row.id === text(action.id, 80))
      if (!item) return { ok: false, error: "Talep bulunamadı." }
      if (op === "ticket.note") {
        const message = text(action.message, 2000)
        if (!message) return { ok: false, error: "Not boş olamaz." }
        item.messages.push({ id: id(), body: message, internal: action.internal !== false, createdAt: at })
      } else {
        item.status = oneOf(action.status, ticketStatuses, item.status)
        item.resolvedAt = item.status === "cozuldu" || item.status === "kapali" ? item.resolvedAt || at : null
      }
      item.updatedAt = at
      audit(state, "ticket", item.id, op, at)
    } else {
      const body = bag(action.ticket)
      const current = text(body.id, 80)
      const prior = state.tickets.find((item) => item.id === current)
      const owner = contact(state, text(body.contactId, 80) || prior?.contactId || "")
      const subject = text(body.subject, 160) || prior?.subject || ""
      const dueAt = body.dueAt === undefined && prior ? prior.dueAt : when(body.dueAt)
      if (!owner || !subject || dueAt === null) return { ok: false, error: "Talep bilgisi eksik." }
      const number = prior?.number || `DS-${istanbulDay(now).slice(0, 4)}-${String(++state.seq.ticket).padStart(4, "0")}`
      const next: Ticket = {
        id: prior?.id || id(),
        number,
        workspace: owner.workspace,
        contactId: owner.id,
        businessId: text(body.businessId, 80),
        subject,
        description: text(body.description, 4000) || prior?.description || "",
        category: text(body.category, 80) || prior?.category || "",
        priority: oneOf(body.priority, priorities, prior?.priority || "normal"),
        status: oneOf(body.status, ticketStatuses, prior?.status || "yeni"),
        assignee: text(body.assignee, 80) || prior?.assignee || "",
        dueAt: dueAt || "",
        mail: body.mail === undefined && prior ? prior.mail === true : body.mail === true,
        resolvedAt: prior?.resolvedAt || null,
        messages: prior?.messages || [],
        createdAt: prior?.createdAt || at,
        updatedAt: at,
      }
      state.tickets = [next, ...state.tickets.filter((item) => item.id !== next.id)].slice(0, 400)
      audit(state, "ticket", next.id, next.status, at)
    }
  } else if (op === "watch.save") {
    const body = bag(action.watch)
    const workspace = workspaceOf(body.workspace)
    const kind = oneOf(body.kind, ["kampanya", "uyelik", "not"] as const, "not")
    const title = text(body.title, 140)
    const endDate = day(body.endDate)
    if (!workspace || !title || !endDate) return { ok: false, error: "Tarih bilgisi eksik." }
    const detail = text(body.detail, 180)
    const exists = state.watches.some((item) => item.workspace === workspace && item.kind === kind && item.title === title && item.endDate === endDate)
    if (exists) warning = "Bu tarih zaten izleniyor."
    else {
      state.watches.unshift({ id: id(), workspace, kind, title, detail, endDate, mail: body.mail === true, createdAt: at })
      state.watches = state.watches.slice(0, 200)
      audit(state, "watch", kind, "ekle", at, endDate)
    }
  } else if (op === "watch.remove") {
    const current = text(action.id, 80)
    if (!state.watches.some((item) => item.id === current)) return { ok: false, error: "Tarih bulunamadı." }
    state.watches = state.watches.filter((item) => item.id !== current)
    audit(state, "watch", current, "kaldir", at)
  } else if (op === "notice.read") {
    const item = state.notices.find((row) => row.id === text(action.id, 80))
    if (!item) return { ok: false, error: "Bildirim bulunamadı." }
    item.readAt = at
  } else return { ok: false, error: "İşlem tanınmadı." }

  sweep(state, now)
  return { ok: true, state, warning }
}

export function customerTicket(ticket: Ticket) {
  return { ...ticket, messages: ticket.messages.filter((item) => !item.internal) }
}

export function openDeals(state: CrmState, workspace: Workspace) {
  return state.deals.filter((item) => item.workspace === workspace && item.stage !== "kazanildi" && item.stage !== "kaybedildi")
}

export function report(state: CrmState, workspace: Workspace, currency: Currency, from: string, to: string) {
  const inRange = (dayValue: string) => (!from || dayValue >= from) && (!to || dayValue <= to)
  const won = state.deals.filter((item) => item.workspace === workspace && item.stage === "kazanildi" && item.currency === currency && inRange(istanbulDay(item.closedAt || item.updatedAt)))
  const lost = state.deals.filter((item) => item.workspace === workspace && item.stage === "kaybedildi" && inRange(istanbulDay(item.closedAt || item.updatedAt)))
  const quoted = state.quotes.filter((item) => item.workspace === workspace && item.currency === currency && inRange(istanbulDay(item.createdAt)))
  const collected = state.payments.filter((item) => item.workspace === workspace && item.currency === currency && !item.cancelled).flatMap((item) => item.marks.filter((mark) => inRange(istanbulDay(mark.paidAt))).map((mark) => mark.amountCents))
  const overdue = state.payments.filter((item) => item.workspace === workspace && item.currency === currency && paymentStatus(item, Date.parse(`${to || "2099-01-01"}T12:00:00Z`) || Date.now()) === "gecikti")
  const fresh = state.contacts.filter((item) => item.workspace === workspace && !item.archivedAt && inRange(istanbulDay(item.createdAt)))
  const sources: { source: string; count: number }[] = []
  for (const item of fresh) {
    const source = item.source || "belirtilmedi"
    const row = sources.find((entry) => entry.source === source)
    if (row) row.count += 1
    else sources.push({ source, count: 1 })
  }
  const tasks = state.tasks.filter((item) => item.workspace === workspace && item.dueAt && inRange(istanbulDay(item.dueAt)))
  const openTasks = tasks.filter((item) => item.status !== "tamamlandi" && item.status !== "iptal")
  const tickets = state.tickets.filter((item) => item.workspace === workspace)
  const resolved = tickets.filter((item) => item.resolvedAt && inRange(istanbulDay(item.resolvedAt)))
  const hours = resolved.map((item) => Math.max(0, new Date(item.resolvedAt || item.updatedAt).getTime() - new Date(item.createdAt).getTime()) / 3600000)
  return {
    contacts: fresh.length,
    sources,
    pipeline: stages.map((stage) => ({ stage, count: state.deals.filter((item) => item.workspace === workspace && item.stage === stage).length })),
    wonCents: won.reduce((sum, item) => sum + item.amountCents, 0),
    wonCount: won.length,
    lostCount: lost.length,
    quoteCents: quoted.reduce((sum, item) => sum + quoteTotals(item.items).total, 0),
    collectedCents: collected.reduce((sum, item) => sum + item, 0),
    overdueCount: overdue.length,
    taskDone: tasks.filter((item) => item.status === "tamamlandi").length,
    taskLate: openTasks.filter((item) => to && istanbulDay(item.dueAt) < to).length,
    taskOpen: openTasks.length,
    ticketsOpen: tickets.filter((item) => item.status !== "cozuldu" && item.status !== "kapali").length,
    ticketsResolved: resolved.length,
    ticketHours: hours.length ? Math.round(hours.reduce((sum, item) => sum + item, 0) / hours.length) : 0,
    renewals: state.subscriptions.filter((item) => item.workspace === workspace && item.nextRenewal && inRange(item.nextRenewal) && item.status !== "iptal").map((item) => ({ plan: item.plan, nextRenewal: item.nextRenewal, status: item.status, currency: item.currency, amountCents: item.amountCents })),
  }
}
