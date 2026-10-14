import type { AccountStore, PublicAccount } from "@/lib/account-record"
import { accountStore } from "@/lib/account-kv"
import { emailSlot, jsonReply, mailReady, readJson, requestIp, sendLogged, takeIpSlot } from "@/lib/account-route"
import { adminSessionOpen, readAdminCookie } from "@/lib/admin-gate"
import { adminSecrets } from "@/lib/admin-secrets"
import { linkBase } from "@/lib/mail-policy"
import {
  acceptNotice,
  criticalBetween,
  digestLetter,
  digestSlots,
  emptyNotify,
  markSent,
  noticeLetter,
  parseNotify,
  rememberDigest,
  resolveRecipients,
  saveSettings,
  type NoticeDraft,
  type NoticeStatus,
  type NotifyState,
} from "@/lib/admin-notify"
import {
  botUserAgent,
  emptyStats,
  noteAccount,
  noteVisit,
  parseStats,
  reportDay,
  reportHour,
  shiftDay,
  sourceHost,
  statsReport,
  visitPath,
  type StatsState,
} from "@/lib/stats"

const notifyKey = "notify:v1"
const statsKey = "stats:v1"
const visitName = "pinwego_visit"

async function safely(task: () => Promise<void>) {
  try {
    await task()
  } catch {
    return
  }
}

async function loadNotify(store: AccountStore) {
  const raw = await store.get(notifyKey)
  if (raw === null) return emptyNotify()
  return parseNotify(raw)
}

async function loadStats(store: AccountStore) {
  const raw = await store.get(statsKey)
  if (raw === null) return emptyStats()
  return parseStats(raw)
}

function istanbulStamp(now: number) {
  return new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" }).format(new Date(now))
}

async function deliver(
  store: AccountStore,
  draft: Omit<NoticeDraft, "to">,
  now: number,
  origin: string | null,
  force: boolean,
  letter?: { subject: string; html: string; text: string },
  digestKey?: string,
) {
  const loaded = await loadNotify(store)
  if (!loaded) return
  const secrets = await adminSecrets()
  const targets = resolveRecipients(loaded.settings, draft.kind, secrets?.otpTo ?? null)
  const accepted = acceptNotice(loaded, { ...draft, to: targets.label }, now, force)
  if (!accepted.changed || !accepted.event) return
  let state: NotifyState = accepted.state
  await store.put(notifyKey, JSON.stringify(state))
  if (!accepted.deliver) return
  let status: NoticeStatus = "hata"
  let attempts = 0
  let error = targets.addresses.length ? "posta-hazir-degil" : "alici-yok"
  if (targets.addresses.length && (await mailReady())) {
    const content = letter ?? noticeLetter(accepted.event, `${linkBase(origin)}/yonetim`)
    let ok = true
    error = ""
    for (const to of targets.addresses) {
      if (!(await emailSlot(store, "bildirim", to, now, 30, 60 * 60 * 1000))) {
        ok = false
        error = "sinir"
        continue
      }
      const sent = await sendLogged(store, { to, purpose: "notice", subject: content.subject, html: content.html, text: content.text })
      attempts += sent.attempts
      if (!sent.ok) {
        ok = false
        error = sent.reason
      }
    }
    status = ok ? "gonderildi" : "hata"
  }
  const current = await loadNotify(store)
  if (!current) return
  state = markSent(current, accepted.event.id, status, attempts, error)
  if (digestKey) state = rememberDigest(state, digestKey)
  await store.put(notifyKey, JSON.stringify(state))
}

export async function noteRegistered(store: AccountStore, account: PublicAccount, now: number, origin: string | null) {
  await safely(async () => {
    const stats = await loadStats(store)
    if (stats) await store.put(statsKey, JSON.stringify(noteAccount(stats, { at: now, role: account.role, kind: "kayit", id: account.id })))
    const business = account.role === "isletme"
    await deliver(
      store,
      {
        key: `kayit:${account.id}`,
        kind: business ? "isletme" : "musteri",
        level: "bilgi",
        title: business ? "Yeni işletme kaydı" : "Yeni müşteri kaydı",
        detail: `Kayıt numarası ${account.id}. Tür: ${business ? "işletme" : "müşteri"}. Zaman: ${istanbulStamp(now)}. Durum: ${account.emailVerified ? "e-posta doğrulandı" : "e-posta doğrulaması bekleniyor"}.`,
        ref: account.id,
      },
      now,
      origin,
      false,
    )
  })
}

export async function noteVerified(store: AccountStore, account: PublicAccount, now: number, origin: string | null) {
  await safely(async () => {
    const stats = await loadStats(store)
    if (stats) await store.put(statsKey, JSON.stringify(noteAccount(stats, { at: now, role: account.role, kind: "dogrula", id: account.id })))
    await deliver(
      store,
      {
        key: `dogrula:${account.id}`,
        kind: "dogrulama",
        level: "bilgi",
        title: "E-posta doğrulaması tamamlandı",
        detail: `Kayıt numarası ${account.id}. Tür: ${account.role === "isletme" ? "işletme" : "müşteri"}. Zaman: ${istanbulStamp(now)}. Durum: e-posta doğrulandı.`,
        ref: account.id,
      },
      now,
      origin,
      false,
    )
  })
}

export async function noteSignedIn(store: AccountStore, account: PublicAccount, now: number) {
  await safely(async () => {
    const stats = await loadStats(store)
    if (stats) await store.put(statsKey, JSON.stringify(noteAccount(stats, { at: now, role: account.role, kind: "giris", id: account.id })))
  })
}

export async function noteSuspicious(store: AccountStore, now: number, origin: string | null, scope = "kayit") {
  const verify = scope === "dogrula"
  await safely(async () => {
    await deliver(
      store,
      {
        key: `suphe:${scope}:${reportDay(now)}:${reportHour(now)}`,
        kind: "suphe",
        level: "onemli",
        title: verify ? "Doğrulama denemesi sınırı aştı" : "Kayıt denemesi sınırı aştı",
        detail: `Tekrarlanan ${verify ? "doğrulama" : "kayıt"} denemesi sınırlandı. Zaman: ${istanbulStamp(now)}. Adres, parola ve bağlantı bu kayda yazılmadı.`,
        ref: verify ? "dogrulama-siniri" : "kayit-siniri",
      },
      now,
      origin,
      false,
    )
  })
}

export async function noteExpired(store: AccountStore, accountId: string, now: number, origin: string | null) {
  await safely(async () => {
    await deliver(
      store,
      {
        key: `sure:${accountId}:${reportDay(now)}`,
        kind: "dogrulama",
        level: "bilgi",
        title: "Doğrulama bağlantısının süresi doldu",
        detail: `Kayıt numarası ${accountId}. Zaman: ${istanbulStamp(now)}. Bağlantı bu kayda yazılmadı.`,
        ref: accountId,
      },
      now,
      origin,
      false,
    )
  })
}

export async function noteMailFailed(store: AccountStore, now: number, scope: string) {
  await safely(async () => {
    await deliver(
      store,
      {
        key: `posta:${scope}:${reportDay(now)}:${reportHour(now)}`,
        kind: "sistem",
        level: "kritik",
        title: "Posta gönderilemedi",
        detail: `${scope} postası gidemedi. Kullanıcı işlemi silinmedi. Zaman: ${istanbulStamp(now)}.`,
        ref: scope,
      },
      now,
      null,
      false,
    )
  })
}

export async function noteAdminSession(store: AccountStore, now: number, origin: string | null) {
  await safely(async () => {
    await deliver(
      store,
      {
        key: `oturum:${reportDay(now)}:${Math.floor(now / 900000)}`,
        kind: "guvenlik",
        level: "onemli",
        title: "Yönetici oturumu açıldı",
        detail: `Kod doğrulandı ve oturum açıldı. Zaman: ${istanbulStamp(now)}. Parola ve kod bu postada yok.`,
        ref: "yonetici",
      },
      now,
      origin,
      false,
    )
  })
}

export async function noteAdminLimit(store: AccountStore, now: number) {
  await safely(async () => {
    await deliver(
      store,
      {
        key: `sinir:yonetici:${reportDay(now)}:${reportHour(now)}`,
        kind: "guvenlik",
        level: "kritik",
        title: "Yönetici giriş denemesi sınırlandı",
        detail: `Çok sayıda yönetici giriş denemesi durduruldu. Zaman: ${istanbulStamp(now)}.`,
        ref: "yonetici-siniri",
      },
      now,
      null,
      false,
    )
  })
}

async function sendDigest(store: AccountStore, slot: string, now: number) {
  const notify = await loadNotify(store)
  const stats = await loadStats(store)
  if (!notify || !stats || notify.digests.includes(slot)) return
  const yesterday = shiftDay(reportDay(now), -1)
  const from = slot.startsWith("day:") ? slot.slice(4) : shiftDay(yesterday, -6)
  const to = slot.startsWith("day:") ? slot.slice(4) : yesterday
  const report = statsReport(stats, from, to)
  if (!report) return
  const letter = digestLetter(slot, report, criticalBetween(notify, from, to), "https://pinwego.com/yonetim")
  await deliver(
    store,
    {
      key: slot,
      kind: "ozet",
      level: "bilgi",
      title: letter.subject.replace(/^pinwego · /, ""),
      detail: `Aralık ${report.from} – ${report.to}. Yeni müşteri ${report.totals.newCustomers}, yeni işletme ${report.totals.newBusinesses}, ziyaret ${report.totals.views}.`,
      ref: slot,
    },
    now,
    "https://pinwego.com",
    true,
    letter,
    slot,
  )
}

export async function notifyDigestSweep(now = Date.now()) {
  await safely(async () => {
    const store = await accountStore()
    if (!store) return
    const state = await loadNotify(store)
    if (!state) return
    const slots = digestSlots(state, now)
    if (slots.day) await sendDigest(store, slots.day, now)
    const again = await loadNotify(store)
    if (!again) return
    const week = digestSlots(again, now).week
    if (week) await sendDigest(store, week, now)
  })
}

async function gate(request: Request) {
  const store = await accountStore()
  if (!store) return { store: null, open: false }
  const open = await adminSessionOpen(store, readAdminCookie(request.headers.get("cookie")))
  return { store, open }
}

function present(state: NotifyState, now: number) {
  return {
    ok: true,
    now,
    today: reportDay(now),
    settings: state.settings,
    events: state.events.slice().reverse(),
    audits: state.audits,
    digests: state.digests,
    usingFallback: state.settings.recipients.length === 0,
  }
}

export async function bildirimGetFlow(request: Request, now = Date.now()) {
  const { store, open } = await gate(request)
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  if (!open) return jsonReply({ ok: false, reason: "yetki" }, 401)
  const raw = await store.get(notifyKey)
  if (raw !== null && !parseNotify(raw)) return jsonReply({ ok: false, reason: "bozuk" }, 500)
  return jsonReply(present(raw === null ? emptyNotify() : parseNotify(raw)!, now))
}

export async function bildirimPostFlow(request: Request, now = Date.now()) {
  const { store, open } = await gate(request)
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  if (!open) return jsonReply({ ok: false, reason: "yetki" }, 401)
  const body = await readJson(request, 20_000)
  if (!body || typeof body.op !== "string") return jsonReply({ ok: false, reason: "invalid" }, 400)
  const raw = await store.get(notifyKey)
  const state = raw === null ? emptyNotify() : parseNotify(raw)
  if (!state) return jsonReply({ ok: false, reason: "bozuk" }, 500)
  if (body.op === "settings.save") {
    const saved = saveSettings(state, body.settings, now)
    if (!saved.ok) return jsonReply({ ok: false, error: saved.error })
    await store.put(notifyKey, JSON.stringify(saved.state))
    return jsonReply({ ok: true, settings: saved.state.settings, audits: saved.state.audits })
  }
  if (body.op === "test.send") {
    if (!(await takeIpSlot(requestIp(request), "bildirim-deneme", now, 5, 15 * 60 * 1000))) return jsonReply({ ok: false, reason: "limited" })
    await deliver(
      store,
      {
        key: `deneme:${Math.floor(now / 60_000)}`,
        kind: "sistem",
        level: "bilgi",
        title: "Deneme bildirimi",
        detail: `Yönetici deneme postası istedi. Zaman: ${istanbulStamp(now)}.`,
        ref: "deneme",
      },
      now,
      request.headers.get("origin"),
      true,
    )
    const current = await loadNotify(store)
    if (current) {
      current.audits = [{ at: new Date(now).toISOString(), action: "Deneme postası istendi." }, ...current.audits].slice(0, 80)
      await store.put(notifyKey, JSON.stringify(current))
    }
    return bildirimGetFlow(request, now)
  }
  return jsonReply({ ok: false, reason: "invalid" }, 400)
}

export async function analitikGetFlow(request: Request, now = Date.now()) {
  const { store, open } = await gate(request)
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  if (!open) return jsonReply({ ok: false, reason: "yetki" }, 401)
  const statsRaw = await store.get(statsKey)
  const stats = statsRaw === null ? emptyStats() : parseStats(statsRaw)
  if (!stats) return jsonReply({ ok: false, reason: "bozuk" }, 500)
  const today = reportDay(now)
  const url = new URL(request.url)
  let from = url.searchParams.get("from") || shiftDay(today, -6)
  let to = url.searchParams.get("to") || today
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return jsonReply({ ok: false, reason: "invalid" }, 400)
  if (from > to) [from, to] = [to, from]
  if (shiftDay(from, 399) < to) from = shiftDay(to, -399)
  const report = statsReport(stats, from, to)
  if (!report) return jsonReply({ ok: false, reason: "invalid" }, 400)
  const notifyRaw = await store.get(notifyKey)
  const notify = notifyRaw === null ? emptyNotify() : parseNotify(notifyRaw)
  return jsonReply({ ok: true, now, today, report, audits: notify?.audits.slice(0, 12) ?? [] })
}

function readVisitCookie(header: string | null) {
  if (!header) return ""
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=")
    if (name === visitName) return decodeURIComponent(rest.join("="))
  }
  return ""
}

function visitToken() {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function quiet(session: string, fresh: boolean, secure: boolean) {
  const headers = new Headers({ "cache-control": "no-store" })
  if (fresh) {
    const parts = [`${visitName}=${encodeURIComponent(session)}`, "HttpOnly", "Path=/", "Max-Age=34560000", "SameSite=Lax"]
    if (secure) parts.push("Secure")
    headers.set("set-cookie", parts.join("; "))
  }
  return new Response(null, { status: 204, headers })
}

export async function visitFlow(request: Request, now = Date.now()) {
  const secure = new URL(request.url).protocol === "https:"
  try {
    if (botUserAgent(request.headers.get("user-agent"))) return quiet("", false, secure)
    const purpose = `${request.headers.get("sec-purpose") || ""} ${request.headers.get("purpose") || ""}`.toLowerCase()
    if (purpose.includes("prefetch")) return quiet("", false, secure)
    if (!(await takeIpSlot(requestIp(request), "olay", now, 60, 60_000))) return quiet("", false, secure)
    const body = await readJson(request, 500)
    const path = visitPath(body?.path)
    if (!path) return quiet("", false, secure)
    const store = await accountStore()
    if (!store) return quiet("", false, secure)
    const admin = readAdminCookie(request.headers.get("cookie"))
    if (admin && (await adminSessionOpen(store, admin))) return quiet("", false, secure)
    let session = readVisitCookie(request.headers.get("cookie")).toLowerCase()
    const fresh = !/^[a-f0-9]{24}$/.test(session)
    if (fresh) session = visitToken()
    const stats = await loadStats(store)
    if (!stats) return quiet(session, fresh, secure)
    const noted = noteVisit(stats, { at: now, session, path, source: sourceHost(request.headers.get("referer")) })
    if (noted.fresh) await store.put(statsKey, JSON.stringify(noted.state))
    return quiet(session, fresh, secure)
  } catch {
    return quiet("", false, secure)
  }
}

export async function readStats(store: AccountStore): Promise<StatsState | null> {
  return loadStats(store)
}
