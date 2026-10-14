import { adminSessionOpen, readAdminCookie } from "@/lib/admin-gate"
import { adminSecrets } from "@/lib/admin-secrets"
import { accountStore } from "@/lib/account-kv"
import { emailSlot, guardChallenge, jsonReply, readJson, requestIp, sendLogged, takeIpSlot } from "@/lib/account-route"
import {
  acceptSettings,
  inboxKey,
  parseBook,
  plain,
  publicSettings,
  roomFor,
  type InboxBook,
  type InboxMessage,
  type InboxStatus,
  inboxStatuses,
} from "@/lib/inbox"
import { validEmail } from "@/lib/identity"
import { linkBase, sha256Hex } from "@/lib/mail-policy"
import { memberEmail, publicAccount, readMemberCookie } from "@/lib/member-session"

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

async function readBook(store: NonNullable<Awaited<ReturnType<typeof accountStore>>>) {
  return parseBook(await store.get(inboxKey))
}

async function senderOf(store: NonNullable<Awaited<ReturnType<typeof accountStore>>>, request: Request) {
  try {
    const email = await memberEmail(store, readMemberCookie(request.headers.get("cookie")))
    const account = email ? await publicAccount(store, email) : null
    if (!account) return { source: "misafir" as const, accountId: "" }
    return { source: account.role, accountId: account.id }
  } catch {
    return { source: "misafir" as const, accountId: "" }
  }
}

export async function contactPublished() {
  const store = await accountStore()
  const book = store ? await readBook(store) : parseBook(null)
  if (!book?.settings.published) return null
  return { title: book.settings.seoTitle, description: book.settings.seoDescription }
}

export async function iletisimGetFlow(request: Request) {
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  const book = await readBook(store)
  if (!book) return jsonReply({ ok: false, reason: "bozuk" }, 500)
  const admin = await adminSessionOpen(store, readAdminCookie(request.headers.get("cookie")))
  if (!admin) return jsonReply({ ok: true, settings: publicSettings(book.settings) })
  const offset = Math.max(0, Number(new URL(request.url).searchParams.get("offset")) || 0)
  const counts = {
    yeni: book.messages.filter((item) => item.status === "yeni" && !item.redacted).length,
    bekleyen: book.messages.filter((item) => (item.status === "yeni" || item.status === "inceleniyor") && !item.redacted).length,
  }
  return jsonReply({ ok: true, settings: book.settings, messages: book.messages.slice(offset, offset + 80), counts, total: book.messages.length })
}

async function notifyAdmin(store: NonNullable<Awaited<ReturnType<typeof accountStore>>>, message: InboxMessage, origin: string | null) {
  const secrets = await adminSecrets()
  const to = secrets?.otpTo ?? ""
  if (!validEmail(to)) return "yok" as const
  const summary = message.body.slice(0, 140)
  const link = `${linkBase(origin)}/yonetim?m=${encodeURIComponent(message.id)}`
  const text = `Yeni iletişim mesajı\nKonu: ${message.topicLabel}\nGönderen: ${message.name}\nE-posta: ${message.email}\nÖzet: ${summary}\nKayıt: ${message.id}\nPanel: ${link}`
  const html = `<p>Yeni iletişim mesajı</p><p>Konu: ${escapeHtml(message.topicLabel)}</p><p>Gönderen: ${escapeHtml(message.name)}</p><p>E-posta: ${escapeHtml(message.email)}</p><p>Özet: ${escapeHtml(summary)}</p><p><a href="${escapeHtml(link)}">Yönetim kaydı</a></p>`
  try {
    const sent = await sendLogged(store, { to, purpose: "notice", subject: "Yeni iletişim mesajı", text, html })
    return sent.ok ? "gitti" as const : "hata" as const
  } catch {
    return "hata" as const
  }
}

export async function iletisimPostFlow(request: Request, now = Date.now()) {
  const body = await readJson(request, 12000)
  if (!body) return jsonReply({ ok: false, reason: "invalid" }, 400)
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  const op = typeof body.op === "string" ? body.op : "send"
  if (op !== "send") {
    if (!(await adminSessionOpen(store, readAdminCookie(request.headers.get("cookie"))))) return jsonReply({ ok: false, reason: "yetki" }, 401)
    return adminOp(store, body, now)
  }
  if (typeof body.website === "string" && body.website.trim()) return jsonReply({ ok: true })
  if (!(await takeIpSlot(requestIp(request), "iletisim", now, 5, 10 * 60 * 1000))) return jsonReply({ ok: false, reason: "limited" })
  const book = await readBook(store)
  if (!book) return jsonReply({ ok: false, reason: "bozuk" }, 500)
  if (!book.settings.published) return jsonReply({ ok: false, reason: "kapali" }, 404)
  const name = plain(body.name, 80)
  const email = plain(body.email, 120)
  const phone = plain(body.phone, 24)
  const topicId = typeof body.topicId === "string" ? body.topicId : ""
  const messageBody = plain(body.body, book.settings.messageMax)
  const reference = plain(body.reference, 160)
  const topic = book.settings.topics.find((item) => item.id === topicId && item.active)
  const phoneDigits = (phone || "").replace(/\D/g, "")
  if (!name || name.length < 5 || !name.includes(" ") || !email || !validEmail(email) || !topic || !messageBody || messageBody.length < 10 || reference === null || phone === null) {
    return jsonReply({ ok: false, reason: "invalid" })
  }
  if (book.settings.phoneEnabled && phone && (phoneDigits.length < 10 || phoneDigits.length > 15)) return jsonReply({ ok: false, reason: "invalid" })
  if (!book.settings.phoneEnabled && phone) return jsonReply({ ok: false, reason: "invalid" })
  const challenge = await guardChallenge(body, request)
  if (!challenge.ok) return jsonReply({ ok: false, reason: "challenge" }, 400)
  if (!(await emailSlot(store, "iletisim", email, now, 3, 60 * 60 * 1000))) return jsonReply({ ok: false, reason: "limited" })
  const fingerprint = await sha256Hex(`${email}\0${topic.id}\0${messageBody}`)
  const duplicate = book.messages.find((item) => item.fingerprint === fingerprint && now - Date.parse(item.createdAt) < 10 * 60 * 1000)
  if (duplicate) return jsonReply({ ok: true, id: duplicate.id })
  const actor = await senderOf(store, request)
  const at = new Date(now).toISOString()
  const message: InboxMessage = {
    id: `msg-${crypto.randomUUID().slice(0, 8)}`,
    name,
    email,
    phone: book.settings.phoneEnabled ? phone : "",
    topicId: topic.id,
    topicLabel: topic.label,
    reference: topic.reference ? reference : "",
    body: messageBody,
    status: "yeni",
    createdAt: at,
    updatedAt: at,
    seenAt: "",
    assignee: "",
    accountId: actor.accountId,
    source: actor.source,
    notice: "yok",
    reply: "yok",
    fingerprint,
    redacted: false,
    events: [],
  }
  const messages = roomFor(book.messages, message)
  if (!messages) return jsonReply({ ok: false, reason: "dolu" }, 429)
  await store.put(inboxKey, JSON.stringify({ settings: book.settings, messages }))
  message.notice = await notifyAdmin(store, message, request.headers.get("origin"))
  const saved = messages.map((item) => item.id === message.id ? message : item)
  await store.put(inboxKey, JSON.stringify({ settings: book.settings, messages: saved }))
  return jsonReply({ ok: true, id: message.id, notice: message.notice })
}

async function adminOp(store: NonNullable<Awaited<ReturnType<typeof accountStore>>>, body: Record<string, unknown>, now: number) {
  const book = await readBook(store)
  if (!book) return jsonReply({ ok: false, reason: "bozuk" }, 500)
  const at = new Date(now).toISOString()
  if (body.op === "settings") {
    const settings = acceptSettings(body.settings, book.settings)
    if (!settings) return jsonReply({ ok: false, reason: "invalid" })
    await store.put(inboxKey, JSON.stringify({ settings, messages: book.messages }))
    return jsonReply({ ok: true, settings })
  }
  const id = typeof body.id === "string" ? body.id : ""
  const current = book.messages.find((item) => item.id === id)
  if (!current) return jsonReply({ ok: false, reason: "yok" }, 404)
  if (current.redacted && body.op !== "seen" && body.op !== "status") return jsonReply({ ok: false, reason: "yok" }, 404)
  const next = { ...current, events: [...current.events], updatedAt: at }
  if (body.op === "seen") {
    if (!next.seenAt) {
      next.seenAt = at
      next.events.push({ at, kind: "goruldu", text: "" })
    }
  } else if (body.op === "status") {
    const status = inboxStatuses.find((item) => item === body.status)
    const assignee = plain(body.assignee, 40)
    if (!status || assignee === null) return jsonReply({ ok: false, reason: "invalid" })
    if (status !== next.status) next.events.push({ at, kind: "durum", text: `${next.status} → ${status}` })
    next.status = status as InboxStatus
    next.assignee = assignee
  } else if (body.op === "note") {
    const text = plain(body.text, 500)
    if (!text || text.length < 2) return jsonReply({ ok: false, reason: "invalid" })
    next.events.push({ at, kind: "not", text })
  } else if (body.op === "reply") {
    const text = plain(body.text, 2000)
    if (!text || text.length < 4 || !validEmail(next.email)) return jsonReply({ ok: false, reason: "invalid" })
    try {
      const sent = await sendLogged(store, {
        to: next.email,
        purpose: "notice",
        subject: "Pinwego yanıtı",
        text,
        html: `<p>${escapeHtml(text)}</p>`,
      })
      next.reply = sent.ok ? "gitti" : "hata"
      next.events.push({ at, kind: "yanit", text: sent.ok ? text : "Yanıt gönderilemedi" })
      if (sent.ok) {
        next.events.push({ at, kind: "durum", text: `${next.status} → yanitlandi` })
        next.status = "yanitlandi"
      }
    } catch {
      next.reply = "hata"
      next.events.push({ at, kind: "yanit", text: "Yanıt gönderilemedi" })
    }
  } else if (body.op === "redact") {
    next.name = ""
    next.email = ""
    next.phone = ""
    next.body = ""
    next.reference = ""
    next.fingerprint = ""
    next.redacted = true
    next.events = [...next.events.map((item) => item.kind === "not" || item.kind === "yanit" ? { ...item, text: "" } : item), { at, kind: "sil", text: "Kişisel alanlar silindi" }].slice(-20)
  } else return jsonReply({ ok: false, reason: "invalid" }, 400)
  next.events = next.events.slice(-20)
  const messages = book.messages.map((item) => item.id === next.id ? next : item)
  await store.put(inboxKey, JSON.stringify({ ...book, messages }))
  return jsonReply({ ok: true, message: next })
}

export async function footerSocials() {
  const store = await accountStore()
  const book = store ? await readBook(store) : parseBook(null)
  if (!book) return []
  return publicSettings(book.settings).socials
}

export type { InboxBook }
