import type { AccountStore } from "@/lib/account-record"
import { accountStore } from "@/lib/account-kv"
import { emailSlot, jsonReply, mailReady, readJson, requestIp, sendLogged, takeIpSlot } from "@/lib/account-route"
import { adminSessionOpen, readAdminCookie } from "@/lib/admin-gate"
import {
  accountByOptOut,
  bulkCap,
  cancelJob,
  channelLabel,
  channels,
  commsJobsKey,
  commsPrefsKey,
  commsReport,
  commsTemplatesKey,
  customersCsv,
  describeFilter,
  e164Digits,
  eligibility,
  emptyComms,
  enrichCustomers,
  ensureOptOutToken,
  escapeHtml,
  filterCustomers,
  finishIfDone,
  historyFor,
  jobsFor,
  newJob,
  noteAudit,
  noteEmailConsent,
  optOutFooter,
  parseComms,
  parseJobs,
  parseTemplates,
  publicJob,
  recordResult,
  removeTemplate,
  renderTemplate,
  saveTemplate,
  setBlock,
  setChannelConsent,
  stepSize,
  templateParams,
  textToHtml,
  upsertJob,
  whatsappLink,
  type Channel,
  type CommsState,
  type CustomerFilter,
  type EnrichedCustomer,
  type JobResult,
  type MessageKind,
  type SendJob,
  type SkipReason,
} from "@/lib/comms"
import { noteCustomerAudit, readCustomers, rememberCustomer } from "@/lib/customers"
import { allowedOrigin, linkBase, newSecret } from "@/lib/mail-policy"
import { publicAccount } from "@/lib/member-session"
import { latestMarketing, setMarketingConsent } from "@/lib/pages-flow"
import { sendSms, smsSender } from "@/lib/sms"
import { sendWhatsAppTemplate, whatsappConfig } from "@/lib/whatsapp"

type Store = AccountStore

async function gate(request: Request) {
  const store = await accountStore()
  if (!store) return { store: null, open: false }
  const open = await adminSessionOpen(store, readAdminCookie(request.headers.get("cookie")))
  return { store, open }
}

export async function readComms(store: Store) {
  const raw = await store.get(commsPrefsKey)
  return raw === null ? emptyComms() : parseComms(raw)
}

async function writeComms(store: Store, state: CommsState) {
  await store.put(commsPrefsKey, JSON.stringify(state))
}

async function readTemplates(store: Store) {
  return parseTemplates(await store.get(commsTemplatesKey))
}

async function readJobs(store: Store) {
  return parseJobs(await store.get(commsJobsKey))
}

async function writeJobs(store: Store, items: SendJob[]) {
  await store.put(commsJobsKey, JSON.stringify({ items }))
}

export async function enrichedCustomers(store: Store, state?: CommsState) {
  const comms = state ?? (await readComms(store))
  if (!comms) return null
  return enrichCustomers(await readCustomers(store), comms)
}

function filterFrom(source: Record<string, unknown> | URLSearchParams): CustomerFilter {
  const read = (key: string) => {
    const value = source instanceof URLSearchParams ? source.get(key) : source[key]
    return typeof value === "string" ? value.slice(0, 120) : ""
  }
  return {
    q: read("q"),
    status: read("durum"),
    verified: read("dogrulama"),
    channel: read("kanal"),
    permission: read("izin"),
    block: read("engel"),
    from: /^\d{4}-\d{2}-\d{2}$/.test(read("from")) ? read("from") : "",
    to: /^\d{4}-\d{2}-\d{2}$/.test(read("to")) ? read("to") : "",
  }
}

export { filterFrom as readCustomerFilter }

function isChannel(value: unknown): value is Channel {
  return typeof value === "string" && (channels as readonly string[]).includes(value)
}

function kindOf(value: unknown): MessageKind {
  return value === "hizmet" ? "hizmet" : "kampanya"
}

async function providerStatus() {
  return {
    mail: await mailReady(),
    whatsapp: (await whatsappConfig()) !== null,
    sms: (await smsSender()) !== null,
  }
}

async function overview(store: Store, now: number) {
  const state = await readComms(store)
  const templates = await readTemplates(store)
  const jobs = await readJobs(store)
  if (!state || !templates || !jobs) return jsonReply({ ok: false, reason: "bozuk" }, 500)
  const items = enrichCustomers(await readCustomers(store), state)
  return jsonReply({
    ok: true,
    templates,
    jobs: jobs.map(publicJob),
    report: commsReport(items, state, jobs, new Date(now).toISOString()),
    providers: await providerStatus(),
    audits: state.audits.slice(0, 40),
  })
}

export async function iletisimGetFlow(request: Request, now = Date.now()) {
  const { store, open } = await gate(request)
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  if (!open) return jsonReply({ ok: false, reason: "yetki" }, 401)
  const url = new URL(request.url)
  if (url.searchParams.get("disa") === "csv") {
    if (url.searchParams.get("onay") !== "1") return jsonReply({ ok: false, reason: "onay" }, 400)
    const state = await readComms(store)
    if (!state) return jsonReply({ ok: false, reason: "bozuk" }, 500)
    const filter = filterFrom(url.searchParams)
    const items = enrichCustomers(await readCustomers(store), state)
    const rows = filterCustomers(items, filter).filter((item) => item.status !== "silindi")
    const stamp = new Date(now).toISOString()
    await writeComms(store, noteAudit(state, "disa-aktar", `${rows.length} satır; ${describeFilter(filter)}`, stamp))
    return new Response(customersCsv(rows), {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="pinwego-musteriler-${stamp.slice(0, 10)}.csv"`,
        "cache-control": "no-store",
      },
    })
  }
  const jobId = url.searchParams.get("is")?.slice(0, 60) ?? ""
  if (jobId) {
    const jobs = await readJobs(store)
    const job = jobs?.find((item) => item.id === jobId)
    if (!job) return jsonReply({ ok: false, reason: "unknown" }, 404)
    return jsonReply({ ok: true, job: publicJob(job) })
  }
  return overview(store, now)
}

export async function customerCommsDetail(store: Store, id: string) {
  const state = await readComms(store)
  const jobs = await readJobs(store)
  if (!state || !jobs) return null
  const prefs = state.prefs[id] ?? {}
  return {
    sms: prefs.sms ?? null,
    whatsapp: prefs.whatsapp ?? null,
    block: prefs.block ?? null,
    history: historyFor(state, id),
    sends: jobsFor(jobs, id),
  }
}

function preview(items: EnrichedCustomer[], channel: Channel, kind: MessageKind) {
  const recipients: string[] = []
  const skipped: Record<string, number> = {}
  for (const row of items) {
    const check = eligibility(row, channel, kind)
    if (check.ok) recipients.push(row.id)
    else skipped[check.reason] = (skipped[check.reason] ?? 0) + 1
  }
  return { recipients, skipped, matched: items.length }
}

async function targetRows(store: Store, state: CommsState, body: Record<string, unknown>) {
  const items = enrichCustomers(await readCustomers(store), state)
  const id = typeof body.id === "string" ? body.id.slice(0, 80) : ""
  if (id) {
    const row = items.find((item) => item.id === id)
    return { rows: row ? [row] : [], label: row ? `tek müşteri ${row.id}` : "", single: true as const }
  }
  const filter = filterFrom(body.filter && typeof body.filter === "object" ? (body.filter as Record<string, unknown>) : {})
  return { rows: filterCustomers(items, filter), label: describeFilter(filter), single: false as const }
}

async function sendOne(store: Store, state: CommsState, job: SendJob, row: EnrichedCustomer, now: number, origin: string | null): Promise<{ result: JobResult; state: CommsState }> {
  const at = new Date(now).toISOString()
  const skip = (reason: SkipReason | string, status: JobResult["status"] = "atlandi"): { result: JobResult; state: CommsState } => ({
    result: { id: row.id, status, reason, at },
    state,
  })
  const check = eligibility(row, job.channel, job.kind)
  if (!check.ok) return skip(check.reason)
  if (job.channel === "eposta") {
    if (!(await mailReady())) return skip("posta-hazir-degil", "hata")
    if (!(await emailSlot(store, "kampanya", row.email, now, 3, 24 * 60 * 60 * 1000))) return skip("sinir")
    let next = state
    let footer = { text: "", html: "" }
    if (job.kind === "kampanya") {
      next = ensureOptOutToken(state, row.id, newSecret())
      const token = next.prefs[row.id]?.cikis ?? ""
      footer = optOutFooter(`${linkBase(origin)}/api/musteri/cikis?t=${encodeURIComponent(token)}`)
    }
    const subject = renderTemplate(job.subject, row)
    const text = renderTemplate(job.body, row)
    const sent = await sendLogged(store, {
      to: row.email,
      purpose: job.kind,
      subject,
      text: `${text}${footer.text}`,
      html: `<div style="font-family:sans-serif;font-size:15px;color:#222">${textToHtml(text)}${footer.html}</div>`,
    })
    return { result: { id: row.id, status: sent.ok ? "gonderildi" : "hata", reason: sent.ok ? "" : sent.reason, at }, state: next }
  }
  const to = e164Digits(row.phone)
  if (job.channel === "whatsapp") {
    const config = await whatsappConfig()
    if (!config) return skip("whatsapp-bagli-degil", "hata")
    const params = templateParams(job.body).map((item) => renderTemplate(item, row))
    const sent = await sendWhatsAppTemplate(config, { to, name: job.waName, language: job.waLanguage || "tr", params })
    return { result: { id: row.id, status: sent.ok ? "gonderildi" : "hata", reason: sent.ok ? "" : sent.detail.slice(0, 120), at }, state }
  }
  const sender = await smsSender()
  if (!sender) return skip("sms-bagli-degil", "hata")
  const sent = await sendSms(sender, { to, text: renderTemplate(job.body, row) })
  return { result: { id: row.id, status: sent.ok ? "gonderildi" : "hata", reason: sent.ok ? "" : sent.detail.slice(0, 120), at }, state }
}

async function runStep(store: Store, job: SendJob, now: number, origin: string | null) {
  let state = await readComms(store)
  if (!state) return job
  const items = enrichCustomers(await readCustomers(store), state)
  const byId = new Map(items.map((item) => [item.id, item]))
  let current = job
  const batch = current.pending.slice(0, stepSize)
  const at = new Date(now).toISOString()
  for (const id of batch) {
    const row = byId.get(id)
    if (!row) {
      current = recordResult(current, { id, status: "atlandi", reason: "durum", at })
      continue
    }
    const outcome = await sendOne(store, state, current, row, now, origin)
    state = outcome.state
    current = recordResult(current, outcome.result)
    if (outcome.result.status === "hata" && (outcome.result.reason === "whatsapp-bagli-degil" || outcome.result.reason === "sms-bagli-degil" || outcome.result.reason === "posta-hazir-degil")) {
      for (const rest of current.pending) current = recordResult(current, { id: rest, status: "hata", reason: outcome.result.reason, at })
      current = { ...current, error: outcome.result.reason }
      break
    }
  }
  await writeComms(store, state)
  return finishIfDone(current, at)
}

export async function commsQueueSweep(now = Date.now()) {
  try {
    const store = await accountStore()
    if (!store) return
    const jobs = await readJobs(store)
    if (!jobs) return
    const job = jobs.find((item) => item.status === "kuyrukta" && item.pending.length > 0)
    if (!job) return
    const next = await runStep(store, job, now, "https://pinwego.com")
    await writeJobs(store, upsertJob(jobs, next))
  } catch {
    return
  }
}

export async function iletisimPostFlow(request: Request, now = Date.now()) {
  const { store, open } = await gate(request)
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  if (!open) return jsonReply({ ok: false, reason: "yetki" }, 401)
  const body = await readJson(request, 30_000)
  if (!body || typeof body.op !== "string") return jsonReply({ ok: false, reason: "invalid" }, 400)
  const stamp = new Date(now).toISOString()
  const origin = request.headers.get("origin")
  const state = await readComms(store)
  if (!state) return jsonReply({ ok: false, reason: "bozuk" }, 500)

  if (body.op === "sablon.kaydet") {
    const templates = await readTemplates(store)
    if (!templates) return jsonReply({ ok: false, reason: "bozuk" }, 500)
    const saved = saveTemplate(templates, body, stamp)
    if (!saved.ok) return jsonReply({ ok: false, error: saved.error })
    await store.put(commsTemplatesKey, JSON.stringify({ items: saved.items }))
    return jsonReply({ ok: true, templates: saved.items, item: saved.item })
  }
  if (body.op === "sablon.sil") {
    const templates = await readTemplates(store)
    if (!templates) return jsonReply({ ok: false, reason: "bozuk" }, 500)
    const items = removeTemplate(templates, typeof body.id === "string" ? body.id : "")
    await store.put(commsTemplatesKey, JSON.stringify({ items }))
    return jsonReply({ ok: true, templates: items })
  }

  const id = typeof body.id === "string" ? body.id.slice(0, 80) : ""
  const customers = await readCustomers(store)
  const target = id ? customers.find((row) => row.id === id) : undefined

  if (body.op === "izin.kapat") {
    if (!target) return jsonReply({ ok: false, reason: "unknown" }, 404)
    const channel = body.channel
    if (!isChannel(channel)) return jsonReply({ ok: false, reason: "invalid" }, 400)
    let next = state
    if (channel === "eposta") {
      if (!(await setMarketingConsent(store, target.id, false, now))) return jsonReply({ ok: false, reason: "invalid" }, 400)
      const account = await publicAccount(store, target.email)
      if (account) await rememberCustomer(store, account, false)
      next = noteEmailConsent(state, target.id, false, "yonetici", stamp, "Yönetici kapattı")
    } else {
      next = setChannelConsent(state, target.id, channel, false, "yonetici", stamp, "Yönetici kapattı")
    }
    await writeComms(store, next)
    await noteCustomerAudit(store, target.id, "yonetici", "izin", `${channelLabel[channel]} pazarlama izni kapatıldı`, stamp)
    return jsonReply({ ok: true })
  }
  if (body.op === "izin.kanit") {
    if (!target) return jsonReply({ ok: false, reason: "unknown" }, 404)
    const channel = body.channel
    const source = body.source === "iys" ? "iys" : body.source === "yazili" ? "yazili" : ""
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) : ""
    if (!isChannel(channel) || !source || note.length < 5) return jsonReply({ ok: false, reason: "kanit" }, 400)
    if (target.status === "silindi") return jsonReply({ ok: false, reason: "invalid" }, 400)
    let next = state
    if (channel === "eposta") {
      if (!(await setMarketingConsent(store, target.id, true, now, "kanit"))) return jsonReply({ ok: false, reason: "invalid" }, 400)
      const account = await publicAccount(store, target.email)
      if (account) await rememberCustomer(store, account, true)
      next = noteEmailConsent(state, target.id, true, source, stamp, note)
    } else {
      next = setChannelConsent(state, target.id, channel, true, source, stamp, note)
    }
    await writeComms(store, next)
    await noteCustomerAudit(store, target.id, "yonetici", "izin", `${channelLabel[channel]} izni kanıtla açıldı (${source}): ${note.slice(0, 80)}`, stamp)
    return jsonReply({ ok: true })
  }
  if (body.op === "engel.koy") {
    if (!target) return jsonReply({ ok: false, reason: "unknown" }, 404)
    const kind = body.kind === "iletisim" ? "iletisim" : body.kind === "pazarlama" ? "pazarlama" : ""
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 200) : ""
    if (!kind || reason.length < 3) return jsonReply({ ok: false, reason: "invalid" }, 400)
    await writeComms(store, setBlock(state, target.id, { kind, reason }, stamp))
    await noteCustomerAudit(store, target.id, "yonetici", "engel", `${kind}: ${reason.slice(0, 120)}`, stamp)
    return jsonReply({ ok: true })
  }
  if (body.op === "engel.kaldir") {
    if (!target) return jsonReply({ ok: false, reason: "unknown" }, 404)
    await writeComms(store, setBlock(state, target.id, null, stamp))
    await noteCustomerAudit(store, target.id, "yonetici", "engel", "engel kaldırıldı", stamp)
    return jsonReply({ ok: true })
  }
  if (body.op === "manuel") {
    if (!target) return jsonReply({ ok: false, reason: "unknown" }, 404)
    const kind = kindOf(body.kind)
    const [row] = enrichCustomers([target], state)
    const check = eligibility(row, "whatsapp", kind)
    if (!check.ok) return jsonReply({ ok: false, reason: check.reason })
    const text = typeof body.text === "string" ? renderTemplate(body.text.slice(0, 1000), row) : ""
    const link = whatsappLink(row.phone, text)
    if (!link) return jsonReply({ ok: false, reason: "adres" })
    const jobs = await readJobs(store)
    if (!jobs) return jsonReply({ ok: false, reason: "bozuk" }, 500)
    let job = newJob({ kind, channel: "whatsapp", mode: "manuel", subject: "WhatsApp sohbeti açıldı", body: "", waName: "", waLanguage: "", filter: `tek müşteri ${row.id}`, recipients: [row.id], skipped: {} }, stamp)
    job = finishIfDone(recordResult(job, { id: row.id, status: "gonderildi", reason: "manuel", at: stamp }), stamp)
    await writeJobs(store, upsertJob(jobs, job))
    await noteCustomerAudit(store, target.id, "yonetici", "whatsapp", `manuel sohbet açıldı (${kind})`, stamp)
    return jsonReply({ ok: true, link })
  }

  if (body.op === "onizle") {
    const channel = body.channel
    if (!isChannel(channel)) return jsonReply({ ok: false, reason: "invalid" }, 400)
    const kind = kindOf(body.kind)
    const found = await targetRows(store, state, body)
    if (kind === "hizmet" && !found.single) return jsonReply({ ok: false, reason: "hizmet-toplu" }, 400)
    const result = preview(found.rows, channel, kind)
    return jsonReply({ ok: true, matched: result.matched, eligible: result.recipients.length, skipped: result.skipped, filter: found.label, providers: await providerStatus() })
  }
  if (body.op === "gonder") {
    if (!(await takeIpSlot(requestIp(request), "toplu-gonderim", now, 30, 60 * 60 * 1000))) return jsonReply({ ok: false, reason: "limited" })
    const channel = body.channel
    if (!isChannel(channel)) return jsonReply({ ok: false, reason: "invalid" }, 400)
    if (body.confirm !== true) return jsonReply({ ok: false, reason: "onay" }, 400)
    const kind = kindOf(body.kind)
    const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 160) : ""
    const text = typeof body.body === "string" ? body.body.replace(/\r\n/g, "\n").slice(0, 6000) : ""
    const waName = typeof body.waName === "string" ? body.waName.trim().slice(0, 80) : ""
    const waLanguage = typeof body.waLanguage === "string" ? body.waLanguage.trim().slice(0, 12) : "tr"
    if (channel === "eposta" && subject.length < 2) return jsonReply({ ok: false, reason: "konu" }, 400)
    if (channel === "whatsapp" && !waName) return jsonReply({ ok: false, reason: "sablon" }, 400)
    if (text.trim().length < 2 && channel !== "whatsapp") return jsonReply({ ok: false, reason: "metin" }, 400)
    const found = await targetRows(store, state, body)
    if (kind === "hizmet" && !found.single) return jsonReply({ ok: false, reason: "hizmet-toplu" }, 400)
    const result = preview(found.rows, channel, kind)
    if (typeof body.expected !== "number" || body.expected !== result.recipients.length) {
      return jsonReply({ ok: false, reason: "degisti", eligible: result.recipients.length, skipped: result.skipped })
    }
    if (result.recipients.length === 0) return jsonReply({ ok: false, reason: "alici-yok", skipped: result.skipped })
    if (result.recipients.length > bulkCap) return jsonReply({ ok: false, reason: "sinir", eligible: result.recipients.length })
    const providers = await providerStatus()
    if (channel === "eposta" && !providers.mail) return jsonReply({ ok: false, reason: "posta-hazir-degil" })
    if (channel === "whatsapp" && !providers.whatsapp) return jsonReply({ ok: false, reason: "whatsapp-bagli-degil" })
    if (channel === "sms" && !providers.sms) return jsonReply({ ok: false, reason: "sms-bagli-degil" })
    const jobs = await readJobs(store)
    if (!jobs) return jsonReply({ ok: false, reason: "bozuk" }, 500)
    let job = newJob(
      { kind, channel, mode: found.single ? "tek" : "toplu", subject, body: text, waName, waLanguage, filter: found.label, recipients: result.recipients, skipped: result.skipped },
      stamp,
    )
    await writeJobs(store, upsertJob(jobs, job))
    job = await runStep(store, job, now, origin)
    const latest = await readJobs(store)
    await writeJobs(store, upsertJob(latest ?? jobs, job))
    const after = await readComms(store)
    if (after) await writeComms(store, noteAudit(after, "gonderim", `${channelLabel[channel]} · ${kind} · ${job.total} alıcı · ${found.label}`, stamp))
    if (found.single && target) await noteCustomerAudit(store, target.id, "yonetici", "gonderim", `${channelLabel[channel]} · ${kind} · ${subject || waName}`.slice(0, 180), stamp)
    return jsonReply({ ok: true, job: publicJob(job) })
  }
  if (body.op === "kuyruk.isle" || body.op === "kuyruk.iptal") {
    const jobs = await readJobs(store)
    if (!jobs) return jsonReply({ ok: false, reason: "bozuk" }, 500)
    const jobId = typeof body.job === "string" ? body.job.slice(0, 60) : ""
    const job = jobs.find((item) => item.id === jobId)
    if (!job) return jsonReply({ ok: false, reason: "unknown" }, 404)
    const next = body.op === "kuyruk.iptal" ? cancelJob(job, stamp) : job.status === "kuyrukta" ? await runStep(store, job, now, origin) : job
    const latest = await readJobs(store)
    await writeJobs(store, upsertJob(latest ?? jobs, next))
    return jsonReply({ ok: true, job: publicJob(next) })
  }
  return jsonReply({ ok: false, reason: "invalid" }, 400)
}

function optOutPage(title: string, text: string, token = "") {
  const form = token
    ? `<form method="post" action="/api/musteri/cikis"><input type="hidden" name="t" value="${escapeHtml(token)}"><button type="submit" style="margin-top:16px;padding:12px 20px;border-radius:12px;border:0;background:#111;color:#fff;font-size:15px">Kampanya postasını kapat</button></form>`
    : `<p style="margin-top:16px"><a href="/hesap">Hesabına dön</a></p>`
  return `<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title><body style="font-family:sans-serif;padding:4rem 1rem;max-width:32rem;margin:0 auto"><h1 style="font-size:24px">${escapeHtml(title)}</h1><p style="line-height:1.6;color:#444">${escapeHtml(text)}</p>${form}<p style="margin-top:24px;font-size:12px;color:#777">Pinwego · destek@pinwego.com</p></body></html>`
}

function html(markup: string, status = 200) {
  return new Response(markup, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } })
}

export async function cikisGetFlow(request: Request) {
  const token = new URL(request.url).searchParams.get("t")?.trim() ?? ""
  const store = await accountStore()
  if (!store) return html(optOutPage("Şu an işlem yapılamıyor", "Tercih kaydı daha sonra yeniden denenebilir."), 503)
  const state = await readComms(store)
  const id = state ? accountByOptOut(state, token) : ""
  if (!id) return html(optOutPage("Bağlantı geçersiz", "Bu ret bağlantısı tanınmadı. Kampanya postasını hesap sayfandaki tercih kutusundan da kapatabilirsin."), 404)
  return html(optOutPage("Kampanya postasını kapat", "Onaylarsan Pinwego sana kampanya e-postası göndermez. Hesap güvenliği ve zorunlu hizmet bildirimleri bundan etkilenmez.", token))
}

export async function cikisPostFlow(request: Request, now = Date.now()) {
  if (!allowedOrigin(request.headers.get("origin"))) return html(optOutPage("İstek reddedildi", "Bu sayfa yalnızca pinwego.com üzerinden çalışır."), 403)
  if (!(await takeIpSlot(requestIp(request), "cikis", now, 20, 10 * 60 * 1000))) return html(optOutPage("Çok fazla deneme", "Biraz sonra yeniden dene."), 429)
  const text = await request.text()
  const token = new URLSearchParams(text.slice(0, 2000)).get("t")?.trim() ?? ""
  const store = await accountStore()
  if (!store) return html(optOutPage("Şu an işlem yapılamıyor", "Tercih kaydı daha sonra yeniden denenebilir."), 503)
  const state = await readComms(store)
  const id = state ? accountByOptOut(state, token) : ""
  if (!state || !id) return html(optOutPage("Bağlantı geçersiz", "Bu ret bağlantısı tanınmadı."), 404)
  const row = (await readCustomers(store)).find((item) => item.id === id)
  const stamp = new Date(now).toISOString()
  if (row && (await latestMarketing(store, id))) {
    await setMarketingConsent(store, id, false, now, "cikis")
    const account = await publicAccount(store, row.email)
    if (account) await rememberCustomer(store, account, false)
    await noteCustomerAudit(store, id, "musteri", "pazarlama", "ret bağlantısıyla kampanya postası kapatıldı", stamp)
  }
  await writeComms(store, noteEmailConsent(state, id, false, "cikis", stamp, "Ret bağlantısı"))
  return html(optOutPage("Kampanya postası kapatıldı", "Artık Pinwego kampanya e-postası almayacaksın. Hesap sayfandan istediğin zaman yeniden açabilirsin."))
}
