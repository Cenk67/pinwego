import assert from "node:assert/strict"
import { registerInStore } from "./account-record"
import { accountStore } from "./account-kv"
import { openAdminSession } from "./admin-gate"
import {
  accountByOptOut,
  cancelJob,
  commsJobsKey,
  commsPrefsKey,
  commsReport,
  customersCsv,
  e164Digits,
  eligibility,
  emptyComms,
  ensureOptOutToken,
  filterCustomers,
  finishIfDone,
  forgetCustomer,
  newJob,
  paginate,
  parseComms,
  parseJobs,
  recordResult,
  renderTemplate,
  saveTemplate,
  seedTemplates,
  setBlock,
  setChannelConsent,
  templateParams,
  whatsappLink,
  type EnrichedCustomer,
} from "./comms"
import { cikisGetFlow, cikisPostFlow, commsQueueSweep, iletisimGetFlow, iletisimPostFlow } from "./comms-flow"
import { readCustomers, rememberCustomer } from "./customers"
import { musteriGetFlow, musteriPostFlow } from "./customers-flow"
import { clearDevMail, readDevMail } from "./mailer"
import { openMemberSession } from "./member-session"
import { latestMarketing, noteConsents } from "./pages-flow"
import { sendSms, smsSenderFrom } from "./sms"
import { sendWhatsAppTemplate, whatsappConfigFrom, whatsappPayload } from "./whatsapp"

const holder = globalThis as typeof globalThis & { __pinwegoAccounts?: Map<string, unknown> }
holder.__pinwegoAccounts = new Map()
process.env.ADMIN_LOGIN = "a@pinwego.test"
process.env.ADMIN_PASSWORD_SALT = "salt"
process.env.ADMIN_PASSWORD_HASH = "hash"
process.env.ADMIN_OTP_TO = "yonetici@pinwego.test"
delete process.env.RESEND_API_KEY
delete process.env.WHATSAPP_TOKEN
delete process.env.SMS_PROVIDER

// --- saf katman -------------------------------------------------------------

assert.equal(e164Digits("0555 123 45 67"), "905551234567")
assert.equal(e164Digits("5551234567"), "905551234567")
assert.equal(e164Digits("+44 20 7946 0958"), "442079460958")
assert.equal(e164Digits("12345"), "")
assert.equal(whatsappLink("0555 123 45 67", "Merhaba Ece"), "https://wa.me/905551234567?text=Merhaba%20Ece")
assert.equal(whatsappLink("123"), "")

assert.equal(renderTemplate("Merhaba {ad} {soyad} ({eposta})", { firstName: "Ece", lastName: "Demir", email: "ece@x.test", phone: "" }), "Merhaba Ece Demir (ece@x.test)")
assert.equal(renderTemplate("Merhaba {ad}", { firstName: "", lastName: "", email: "", phone: "" }), "Merhaba Müşterimiz")
assert.equal(renderTemplate("{bilinmeyen}", { firstName: "A", lastName: "B", email: "", phone: "" }), "{bilinmeyen}")
assert.deepEqual(templateParams("{ad}, {soyad} ,, Pinwego"), ["{ad}", "{soyad}", "Pinwego"])

const base: EnrichedCustomer = {
  id: "c1",
  email: "ece@pinwego.test",
  firstName: "Ece",
  lastName: "Demir",
  phone: "05551234567",
  birthDate: "1992-03-03",
  occupation: "Mimar",
  status: "aktif",
  createdAt: "2026-10-01T09:00:00.000Z",
  verifiedAt: "2026-10-01T09:05:00.000Z",
  updatedAt: "",
  lastLoginAt: "",
  marketing: true,
  legacyId: false,
  channels: { eposta: true, sms: false, whatsapp: true },
  block: null,
}

assert.deepEqual(eligibility(base, "eposta", "kampanya"), { ok: true })
assert.deepEqual(eligibility(base, "sms", "kampanya"), { ok: false, reason: "izin" })
assert.deepEqual(eligibility(base, "sms", "hizmet"), { ok: true })
assert.deepEqual(eligibility({ ...base, status: "askida" }, "eposta", "kampanya"), { ok: false, reason: "durum" })
assert.deepEqual(eligibility({ ...base, verifiedAt: "" }, "eposta", "kampanya"), { ok: false, reason: "durum" })
assert.deepEqual(eligibility({ ...base, phone: "" }, "whatsapp", "kampanya"), { ok: false, reason: "adres" })
assert.deepEqual(eligibility({ ...base, block: { kind: "pazarlama", reason: "istek", at: "" } }, "eposta", "kampanya"), { ok: false, reason: "engel" })
assert.deepEqual(eligibility({ ...base, block: { kind: "pazarlama", reason: "istek", at: "" } }, "eposta", "hizmet"), { ok: true })
assert.deepEqual(eligibility({ ...base, block: { kind: "iletisim", reason: "hukuki", at: "" } }, "eposta", "hizmet"), { ok: false, reason: "engel" })

let state = emptyComms()
state = setChannelConsent(state, "c1", "sms", true, "hesap", "2026-10-02T00:00:00.000Z")
state = setChannelConsent(state, "c2", "whatsapp", true, "iys", "2026-10-02T00:00:00.000Z", "İYS kaydı 123")
state = setBlock(state, "c3", { kind: "pazarlama", reason: "Müşteri istedi" }, "2026-10-03T00:00:00.000Z")
assert.equal(state.prefs.c1.sms?.accepted, true)
assert.equal(state.prefs.c2.whatsapp?.source, "iys")
assert.equal(state.prefs.c3.block?.kind, "pazarlama")
assert.equal(state.history.length, 3)
const reparsed = parseComms(JSON.stringify(state))
assert.deepEqual(reparsed, state)
assert.equal(parseComms("bozuk"), null)
assert.deepEqual(parseComms(null), emptyComms())
const forgotten = forgetCustomer(state, "c1", "2026-10-04T00:00:00.000Z")
assert.equal(forgotten.prefs.c1.sms?.accepted, false)
assert.equal(forgotten.prefs.c1.sms?.note, "Hesap silindi")
const unblocked = setBlock(state, "c3", null, "2026-10-05T00:00:00.000Z")
assert.equal(unblocked.prefs.c3.block, undefined)
assert.equal(unblocked.history.at(-1)?.note, "Engel kaldırıldı")

const tokened = ensureOptOutToken(state, "c1", "token-aaaaaaaaaaaaaaaaaaaaaaaaaaaa")
assert.equal(accountByOptOut(tokened, "token-aaaaaaaaaaaaaaaaaaaaaaaaaaaa"), "c1")
assert.equal(accountByOptOut(tokened, "token-bbbbbbbbbbbbbbbbbbbbbbbbbbbb"), "")
assert.equal(accountByOptOut(tokened, "kisa"), "")
assert.equal(ensureOptOutToken(tokened, "c1", "baska").prefs.c1.cikis, "token-aaaaaaaaaaaaaaaaaaaaaaaaaaaa")

const rows: EnrichedCustomer[] = [
  base,
  { ...base, id: "c2", email: "ali@pinwego.test", firstName: "Ali", lastName: "Kaya", phone: "+44 20 7946 0958", marketing: false, channels: { eposta: false, sms: true, whatsapp: false }, createdAt: "2026-09-01T00:00:00.000Z" },
  { ...base, id: "c3", email: "veli@pinwego.test", firstName: "Veli", lastName: "Can", status: "askida", block: { kind: "iletisim", reason: "hukuk", at: "" }, verifiedAt: "" },
]
assert.deepEqual(filterCustomers(rows, { q: "5551" }).map((row) => row.id), ["c1", "c3"])
assert.deepEqual(filterCustomers(rows, { q: "kaya" }).map((row) => row.id), ["c2"])
assert.deepEqual(filterCustomers(rows, { channel: "eposta", permission: "evet" }).map((row) => row.id), ["c1", "c3"])
assert.deepEqual(filterCustomers(rows, { channel: "sms", permission: "hayir" }).map((row) => row.id), ["c1", "c3"])
assert.deepEqual(filterCustomers(rows, { block: "var" }).map((row) => row.id), ["c3"])
assert.deepEqual(filterCustomers(rows, { block: "iletisim" }).map((row) => row.id), ["c3"])
assert.deepEqual(filterCustomers(rows, { status: "askida" }).map((row) => row.id), ["c3"])
assert.deepEqual(filterCustomers(rows, { from: "2026-09-15" }).map((row) => row.id), ["c1", "c3"])
assert.deepEqual(filterCustomers(rows, { to: "2026-09-15" }).map((row) => row.id), ["c2"])
const page = paginate(rows, 2, 2)
assert.equal(page.items.length, 3)
assert.deepEqual(page.page, { sayfa: 1, adet: 10, toplam: 3, sayfaSayisi: 1 })
const twelve = Array.from({ length: 12 }, (_, index) => ({ ...base, id: `p${index}` }))
const second12 = paginate(twelve, 2, 10)
assert.deepEqual(second12.items.map((row) => row.id), ["p10", "p11"])
assert.deepEqual(second12.page, { sayfa: 2, adet: 10, toplam: 12, sayfaSayisi: 2 })
assert.equal(paginate(rows, 99, 50).page.sayfa, 1)

const csv = customersCsv(rows)
assert.equal(csv.startsWith("\uFEFFMüşteri ID;Adı;Soyadı;GSM;E-posta"), true)
assert.equal(csv.includes("c1;Ece;Demir;05551234567;ece@pinwego.test;2026-10-01;doğrulandı;aktif;izinli;izinsiz;izinli;;"), true)
assert.equal(csv.includes("İletişim engeli"), true)
assert.equal(customersCsv([{ ...base, firstName: "=HESAP()" }]).includes("\"'=HESAP()\""), true)

const templates = seedTemplates()
const badTemplate = saveTemplate(templates, { channel: "eposta", name: "X", subject: "", body: "" }, "2026-10-10T00:00:00.000Z")
assert.equal(badTemplate.ok, false)
const goodTemplate = saveTemplate(templates, { channel: "sms", name: "Kısa SMS", subject: "", body: "Merhaba {ad}" }, "2026-10-10T00:00:00.000Z")
assert.equal(goodTemplate.ok, true)
if (!goodTemplate.ok) throw new Error("şablon kaydedilmedi")
assert.equal(goodTemplate.items.length, templates.length + 1)
const edited = saveTemplate(goodTemplate.items, { id: goodTemplate.item.id, channel: "sms", name: "Kısa SMS 2", body: "Selam {ad}" }, "2026-10-11T00:00:00.000Z")
assert.equal(edited.ok && edited.items.length, templates.length + 1)

let job = newJob({ kind: "kampanya", channel: "eposta", mode: "toplu", subject: "Konu", body: "Metin", waName: "", waLanguage: "", filter: "tüm", recipients: ["c1", "c2"], skipped: { izin: 1 } }, "2026-10-12T00:00:00.000Z")
assert.equal(job.status, "kuyrukta")
assert.equal(job.total, 2)
job = recordResult(job, { id: "c1", status: "gonderildi", reason: "", at: "2026-10-12T00:00:01.000Z" })
job = recordResult(job, { id: "c2", status: "atlandi", reason: "sinir", at: "2026-10-12T00:00:02.000Z" })
assert.equal(job.sent, 1)
assert.deepEqual(job.skipped, { izin: 1, sinir: 1 })
assert.equal(job.pending.length, 0)
job = finishIfDone(job, "2026-10-12T00:00:03.000Z")
assert.equal(job.status, "tamam")
const parsedJobs = parseJobs(JSON.stringify({ items: [job] }))
assert.deepEqual(parsedJobs, [job])
const cancelled = cancelJob(newJob({ kind: "kampanya", channel: "sms", mode: "toplu", subject: "", body: "x", waName: "", waLanguage: "", filter: "", recipients: ["a", "b"], skipped: {} }, "2026-10-12T00:00:00.000Z"), "2026-10-12T00:01:00.000Z")
assert.equal(cancelled.status, "iptal")
assert.equal(cancelled.skipped.iptal, 2)

const report = commsReport(rows, state, [job], "2026-10-13T00:00:00.000Z")
assert.equal(report.total, 3)
assert.deepEqual(report.permitted, { eposta: 2, sms: 1, whatsapp: 2 })
assert.deepEqual(report.reachable, { eposta: 1, sms: 1, whatsapp: 1 })
assert.deepEqual(report.blocked, { pazarlama: 0, iletisim: 1 })
assert.equal(report.jobs.sent, 1)

// --- sağlayıcılar: bağlı değilken sahte başarı yok ---------------------------

assert.equal(whatsappConfigFrom(undefined), null)
assert.equal(whatsappConfigFrom({ WHATSAPP_TOKEN: "abc", WHATSAPP_PHONE_ID: "x" }), null)
const waConfig = whatsappConfigFrom({ WHATSAPP_TOKEN: "abc", WHATSAPP_PHONE_ID: "123456789" })
assert.deepEqual(waConfig, { token: "abc", phoneId: "123456789", version: "v21.0" })
const offline = await sendWhatsAppTemplate(null, { to: "905551234567", name: "hosgeldin", language: "tr", params: [] })
assert.equal(offline.ok, false)
if (offline.ok) throw new Error("bağlantısız gönderim başarılı göründü")
assert.equal(offline.reason, "unconfigured")
const badName = await sendWhatsAppTemplate(waConfig, { to: "905551234567", name: "Büyük Harf", language: "tr", params: [] })
assert.equal(!badName.ok && badName.reason, "invalid")
const calls: Array<{ url: string; body: string }> = []
const okSend = await sendWhatsAppTemplate(waConfig, { to: "905551234567", name: "hosgeldin", language: "tr", params: ["Ece"] }, (async (url: string | URL | Request, init?: RequestInit) => {
  calls.push({ url: String(url), body: String(init?.body) })
  return new Response(JSON.stringify({ messages: [{ id: "wamid.1" }] }), { status: 200 })
}) as typeof fetch)
assert.deepEqual(okSend, { ok: true, id: "wamid.1" })
assert.equal(calls.length, 1)
assert.equal(calls[0].url, "https://graph.facebook.com/v21.0/123456789/messages")
assert.deepEqual(JSON.parse(calls[0].body), whatsappPayload({ to: "905551234567", name: "hosgeldin", language: "tr", params: ["Ece"] }))
const failSend = await sendWhatsAppTemplate(waConfig, { to: "905551234567", name: "hosgeldin", language: "tr", params: [] }, (async () =>
  new Response(JSON.stringify({ error: { code: 131026, message: "Message undeliverable" } }), { status: 400 })) as typeof fetch)
assert.equal(!failSend.ok && failSend.reason, "failed")
assert.equal(!failSend.ok && failSend.detail.includes("131026"), true)

assert.equal(smsSenderFrom({ SMS_PROVIDER: "netgsm", SMS_API_KEY: "k", SMS_SENDER: "PINWEGO" }), null)
const smsOffline = await sendSms(null, { to: "905551234567", text: "x" })
assert.equal(!smsOffline.ok && smsOffline.reason, "unconfigured")

// --- akış: yönetici kapısı, izin, engel, kuyruk, ret bağlantısı -------------

const store = await accountStore()
assert.ok(store)

function call(path: string, body?: unknown, cookie = "") {
  return new Request(`http://127.0.0.1:43123${path}`, {
    method: body ? "POST" : "GET",
    headers: { origin: "http://127.0.0.1:43123", "content-type": "application/json", cookie },
    body: body ? JSON.stringify(body) : undefined,
  })
}

async function json(response: Response) {
  // Test gövdesi iç içe alanlara serbestçe bakar; tip denetimi akış dosyalarında yapılır.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await response.json()) as Record<string, any>
}

const ece = await registerInStore(store, { role: "musteri", email: "ece@pinwego.test", password: "sifre1234", name: "x", phone: "05551234567", customer: { firstName: "Ece", lastName: "Demir", birthDate: "1992-03-03", occupation: "Mimar" } }, "2026-10-14T09:00:00.000Z")
const ali = await registerInStore(store, { role: "musteri", email: "ali@pinwego.test", password: "sifre1234", name: "x", phone: "05551234568", customer: { firstName: "Ali", lastName: "Kaya", birthDate: "1990-01-01", occupation: "Usta" } }, "2026-10-14T09:10:00.000Z")
const veli = await registerInStore(store, { role: "musteri", email: "veli@pinwego.test", password: "sifre1234", name: "x", phone: "05551234569", customer: { firstName: "Veli", lastName: "Can", birthDate: "1990-01-01", occupation: "Aşçı" } }, "2026-10-14T09:20:00.000Z")
if (!ece.ok || !ali.ok || !veli.ok) throw new Error("kayıtlar açılmadı")
await noteConsents(store, ece.account.id, true, 1_000)
await noteConsents(store, ali.account.id, true, 1_000)
await noteConsents(store, veli.account.id, false, 1_000)
await rememberCustomer(store, ece.account, true)
await rememberCustomer(store, ali.account, true)
await rememberCustomer(store, veli.account, false)

assert.equal((await iletisimGetFlow(call("/api/musteri/iletisim"))).status, 401)
assert.equal((await iletisimPostFlow(call("/api/musteri/iletisim", { op: "onizle", channel: "eposta" }))).status, 401)
assert.equal((await iletisimGetFlow(call("/api/musteri/iletisim?disa=csv&onay=1"))).status, 401)

const admin = await openAdminSession(store)
const cookie = `pinwego_admin=${encodeURIComponent(admin)}`

const overview = await json(await iletisimGetFlow(call("/api/musteri/iletisim", undefined, cookie)))
assert.equal(overview.ok, true)
assert.equal(overview.templates.length, 3)
assert.equal(overview.report.total, 3)
assert.deepEqual(overview.report.permitted, { eposta: 2, sms: 0, whatsapp: 0 })
assert.equal(overview.providers.whatsapp, false)
assert.equal(overview.providers.sms, false)
assert.equal(overview.providers.mail, true)

// Sayfalı liste ve kanal süzgeci
const paged = await json(await musteriGetFlow(call("/api/musteri?sayfa=1&adet=10&kanal=eposta&izin=evet", undefined, cookie)))
assert.equal(paged.ok, true)
assert.equal(paged.page.toplam, 2)
assert.equal(paged.items.every((row: { channels: { eposta: boolean } }) => row.channels.eposta), true)
const byPhone = await json(await musteriGetFlow(call("/api/musteri?sayfa=1&q=1234569", undefined, cookie)))
assert.equal(byPhone.page.toplam, 1)
assert.equal(byPhone.items[0].id, veli.account.id)
const legacy = await json(await musteriGetFlow(call("/api/musteri", undefined, cookie)))
assert.equal(legacy.items.length, 3)
assert.equal(legacy.page, undefined)

// Yönetici izni yalnız kanıtla açar, kanıtsız açamaz
const noEvidence = await iletisimPostFlow(call("/api/musteri/iletisim", { op: "izin.kanit", id: ali.account.id, channel: "sms", source: "yazili", note: "kısa" }, cookie))
assert.equal(noEvidence.status, 400)
const evidence = await iletisimPostFlow(call("/api/musteri/iletisim", { op: "izin.kanit", id: ali.account.id, channel: "sms", source: "yazili", note: "Mağazada imzalı form 12.10.2026" }, cookie))
assert.equal(evidence.status, 200)
const aliDetail = await json(await musteriGetFlow(call(`/api/musteri?id=${ali.account.id}`, undefined, cookie)))
assert.equal(aliDetail.item.channels.sms, true)
assert.equal(aliDetail.comms.sms.source, "yazili")
assert.equal(aliDetail.comms.history[0].channel, "sms")

// Engel: pazarlama engeli kampanyadan düşürür
const blocked = await iletisimPostFlow(call("/api/musteri/iletisim", { op: "engel.koy", id: ali.account.id, kind: "pazarlama", reason: "Müşteri telefonla istedi" }, cookie))
assert.equal(blocked.status, 200)

// Ön izleme: Ece uygun, Ali engelli, Veli izinsiz
const previewed = await json(await iletisimPostFlow(call("/api/musteri/iletisim", { op: "onizle", channel: "eposta", kind: "kampanya", filter: {} }, cookie)))
assert.equal(previewed.ok, true)
assert.equal(previewed.matched, 3)
assert.equal(previewed.eligible, 1)
assert.deepEqual(previewed.skipped, { engel: 1, izin: 1 })

// Onaysız veya sayısı değişmiş gönderim reddedilir
const noConfirm = await iletisimPostFlow(call("/api/musteri/iletisim", { op: "gonder", channel: "eposta", kind: "kampanya", filter: {}, subject: "Konu", body: "Metin", expected: 1 }, cookie))
assert.equal(noConfirm.status, 400)
const stale = await json(await iletisimPostFlow(call("/api/musteri/iletisim", { op: "gonder", channel: "eposta", kind: "kampanya", filter: {}, subject: "Konu", body: "Metin", expected: 3, confirm: true }, cookie)))
assert.equal(stale.ok, false)
assert.equal(stale.reason, "degisti")
assert.equal(stale.eligible, 1)

// Toplu gönderim: yalnız Ece alır, posta geliştirme kutusuna düşer ve ret bağlantısı taşır
clearDevMail()
const sent = await json(await iletisimPostFlow(call("/api/musteri/iletisim", { op: "gonder", channel: "eposta", kind: "kampanya", filter: {}, subject: "Merhaba {ad}", body: "Selam {ad} {soyad}", expected: 1, confirm: true }, cookie)))
assert.equal(sent.ok, true)
assert.equal(sent.job.status, "tamam")
assert.equal(sent.job.sent, 1)
assert.deepEqual(sent.job.skipped, { engel: 1, izin: 1 })
assert.equal(sent.job.pending, undefined)
const mails = readDevMail()
assert.equal(mails.length, 1)
assert.equal(mails[0].to, "ece@pinwego.test")
assert.equal(mails[0].subject, "Merhaba Ece")
assert.equal(mails[0].purpose, "kampanya")
assert.equal(mails[0].text.includes("Selam Ece Demir"), true)
const link = mails[0].text.match(/\/api\/musteri\/cikis\?t=([A-Za-z0-9_%-]+)/)
assert.ok(link)
const token = decodeURIComponent(link![1])
assert.equal(mails[0].html.includes("<script"), false)

// Aynı alıcıya günde 3'ten fazla kampanya gitmez
for (let index = 0; index < 2; index += 1) {
  await iletisimPostFlow(call("/api/musteri/iletisim", { op: "gonder", channel: "eposta", kind: "kampanya", id: ece.account.id, subject: "Tekrar", body: "Metin", expected: 1, confirm: true }, cookie))
}
const fourth = await json(await iletisimPostFlow(call("/api/musteri/iletisim", { op: "gonder", channel: "eposta", kind: "kampanya", id: ece.account.id, subject: "Tekrar", body: "Metin", expected: 1, confirm: true }, cookie)))
assert.equal(fourth.ok, true)
assert.deepEqual(fourth.job.skipped, { sinir: 1 })
assert.equal(fourth.job.sent, 0)

// Hizmet mesajı toplu gönderilemez; tek müşteriye izin aranmadan gider, iletişim engeli durdurur
const serviceBulk = await iletisimPostFlow(call("/api/musteri/iletisim", { op: "onizle", channel: "eposta", kind: "hizmet", filter: {} }, cookie))
assert.equal(serviceBulk.status, 400)
clearDevMail()
const serviceOne = await json(await iletisimPostFlow(call("/api/musteri/iletisim", { op: "gonder", channel: "eposta", kind: "hizmet", id: veli.account.id, subject: "Hesap bilgisi", body: "Merhaba {ad}", expected: 1, confirm: true }, cookie)))
assert.equal(serviceOne.ok, true)
assert.equal(serviceOne.job.sent, 1)
assert.equal(readDevMail()[0].purpose, "hizmet")
assert.equal(readDevMail()[0].text.includes("/api/musteri/cikis"), false)
await iletisimPostFlow(call("/api/musteri/iletisim", { op: "engel.koy", id: veli.account.id, kind: "iletisim", reason: "Hukuki talep" }, cookie))
const serviceBlocked = await json(await iletisimPostFlow(call("/api/musteri/iletisim", { op: "onizle", channel: "eposta", kind: "hizmet", id: veli.account.id }, cookie)))
assert.equal(serviceBlocked.eligible, 0)
assert.deepEqual(serviceBlocked.skipped, { engel: 1 })

// WhatsApp API bağlı değilken sahte başarı yok
const waPreview = await json(await iletisimPostFlow(call("/api/musteri/iletisim", { op: "onizle", channel: "whatsapp", kind: "hizmet", id: ece.account.id }, cookie)))
assert.equal(waPreview.eligible, 1)
const waSend = await json(await iletisimPostFlow(call("/api/musteri/iletisim", { op: "gonder", channel: "whatsapp", kind: "hizmet", id: ece.account.id, waName: "hosgeldin", body: "{ad}", expected: 1, confirm: true }, cookie)))
assert.equal(waSend.ok, false)
assert.equal(waSend.reason, "whatsapp-bagli-degil")
const smsSend = await json(await iletisimPostFlow(call("/api/musteri/iletisim", { op: "gonder", channel: "sms", kind: "hizmet", id: ece.account.id, body: "Merhaba", expected: 1, confirm: true }, cookie)))
assert.equal(smsSend.reason, "sms-bagli-degil")

// Manuel WhatsApp bağlantısı kampanya izni olmadan kampanya türünde açılmaz
const manualCampaign = await json(await iletisimPostFlow(call("/api/musteri/iletisim", { op: "manuel", id: ece.account.id, kind: "kampanya", text: "Merhaba {ad}" }, cookie)))
assert.equal(manualCampaign.ok, false)
assert.equal(manualCampaign.reason, "izin")
const manualService = await json(await iletisimPostFlow(call("/api/musteri/iletisim", { op: "manuel", id: ece.account.id, kind: "hizmet", text: "Merhaba {ad}" }, cookie)))
assert.equal(manualService.ok, true)
assert.equal(manualService.link, "https://wa.me/905551234567?text=Merhaba%20Ece")
const manualBlocked = await json(await iletisimPostFlow(call("/api/musteri/iletisim", { op: "manuel", id: veli.account.id, kind: "hizmet", text: "x" }, cookie)))
assert.equal(manualBlocked.reason, "engel")

// Ret bağlantısı: GET onay sayfası, POST izni kapatır, ikinci kez zararsız
const page404 = await cikisGetFlow(call("/api/musteri/cikis?t=yanlis-token-yanlis-token-yanlis"))
assert.equal(page404.status, 404)
const pageOk = await cikisGetFlow(call(`/api/musteri/cikis?t=${encodeURIComponent(token)}`))
assert.equal(pageOk.status, 200)
assert.equal((await pageOk.text()).includes("Kampanya postasını kapat"), true)
assert.equal(await latestMarketing(store, ece.account.id), true)
const optOut = await cikisPostFlow(
  new Request("http://127.0.0.1:43123/api/musteri/cikis", {
    method: "POST",
    headers: { origin: "http://127.0.0.1:43123", "content-type": "application/x-www-form-urlencoded" },
    body: `t=${encodeURIComponent(token)}`,
  }),
)
assert.equal(optOut.status, 200)
assert.equal(await latestMarketing(store, ece.account.id), false)
assert.equal((await readCustomers(store)).find((row) => row.id === ece.account.id)?.marketing, false)
const afterOptOut = await json(await iletisimPostFlow(call("/api/musteri/iletisim", { op: "onizle", channel: "eposta", kind: "kampanya", filter: {} }, cookie)))
assert.equal(afterOptOut.eligible, 0)
const foreignOrigin = await cikisPostFlow(
  new Request("http://127.0.0.1:43123/api/musteri/cikis", { method: "POST", headers: { origin: "https://kotu.example" }, body: `t=${encodeURIComponent(token)}` }),
)
assert.equal(foreignOrigin.status, 403)

// Müşteri kendi SMS / WhatsApp iznini açar; yönetici yalnız kapatır
const member = await openMemberSession(store, ece.account.email)
const memberCookie = `pinwego_acct=${encodeURIComponent(member)}`
const own = await json(await musteriGetFlow(call("/api/musteri", undefined, memberCookie)))
assert.deepEqual(own.own.channels, { eposta: false, sms: false, whatsapp: false })
const waOn = await json(await musteriPostFlow(call("/api/musteri", { op: "pazarlama", kanal: "whatsapp", accepted: true }, memberCookie)))
assert.equal(waOn.ok, true)
assert.equal(waOn.channels.whatsapp, true)
const ownAgain = await json(await musteriGetFlow(call("/api/musteri", undefined, memberCookie)))
assert.equal(ownAgain.own.channels.whatsapp, true)
const adminOff = await iletisimPostFlow(call("/api/musteri/iletisim", { op: "izin.kapat", id: ece.account.id, channel: "whatsapp" }, cookie))
assert.equal(adminOff.status, 200)
assert.equal((await json(await musteriGetFlow(call("/api/musteri", undefined, memberCookie)))).own.channels.whatsapp, false)
const stranger = await musteriPostFlow(call("/api/musteri", { op: "pazarlama", kanal: "sms", accepted: true }))
assert.equal(stranger.status, 401)

// Şablon kaydı ve silme
const saved = await json(await iletisimPostFlow(call("/api/musteri/iletisim", { op: "sablon.kaydet", channel: "eposta", name: "Deneme", subject: "Konu {ad}", body: "Metin" }, cookie)))
assert.equal(saved.ok, true)
assert.equal(saved.templates.length, 4)
const removed = await json(await iletisimPostFlow(call("/api/musteri/iletisim", { op: "sablon.sil", id: saved.item.id }, cookie)))
assert.equal(removed.templates.length, 3)

// CSV dışa aktarma onay ister, denetim kaydı düşer, silinen hesap yazılmaz
const csvNoConfirm = await iletisimGetFlow(call("/api/musteri/iletisim?disa=csv", undefined, cookie))
assert.equal(csvNoConfirm.status, 400)
await musteriPostFlow(call("/api/musteri", { op: "durum", id: veli.account.id, status: "silindi" }, cookie))
const csvOk = await iletisimGetFlow(call("/api/musteri/iletisim?disa=csv&onay=1", undefined, cookie))
assert.equal(csvOk.status, 200)
assert.equal(csvOk.headers.get("content-type")?.includes("text/csv"), true)
const csvText = await csvOk.text()
assert.equal(csvText.includes("ece@pinwego.test"), true)
assert.equal(csvText.includes("veli@pinwego.test"), false)
const audited = await json(await iletisimGetFlow(call("/api/musteri/iletisim", undefined, cookie)))
assert.equal(audited.audits[0].action, "disa-aktar")
assert.equal(JSON.stringify(audited).includes("passwordHash"), false)

// Kuyruk: sayfa sayfa işlenir, iptal edilebilir, zamanlayıcı taraması kalanı sürer
const many: string[] = []
for (let index = 0; index < 45; index += 1) {
  const created = await registerInStore(store, { role: "musteri", email: `toplu${index}@pinwego.test`, password: "sifre1234", name: "x", phone: `05550000${String(index).padStart(3, "0")}`, customer: { firstName: `Ad${index}`, lastName: "Soyad", birthDate: "1990-01-01", occupation: "Usta" } }, "2026-10-15T09:00:00.000Z")
  if (!created.ok) throw new Error("toplu kayıt açılmadı")
  await noteConsents(store, created.account.id, true, 2_000)
  await rememberCustomer(store, created.account, true)
  many.push(created.account.id)
}
clearDevMail()
const bulkPreview = await json(await iletisimPostFlow(call("/api/musteri/iletisim", { op: "onizle", channel: "eposta", kind: "kampanya", filter: { q: "toplu" } }, cookie)))
assert.equal(bulkPreview.eligible, 45)
const bulk = await json(await iletisimPostFlow(call("/api/musteri/iletisim", { op: "gonder", channel: "eposta", kind: "kampanya", filter: { q: "toplu" }, subject: "Toplu", body: "Metin", expected: 45, confirm: true }, cookie)))
assert.equal(bulk.ok, true)
assert.equal(bulk.job.status, "kuyrukta")
assert.equal(bulk.job.sent, 20)
assert.equal(bulk.job.pendingCount, 25)
const step = await json(await iletisimPostFlow(call("/api/musteri/iletisim", { op: "kuyruk.isle", job: bulk.job.id }, cookie)))
assert.equal(step.job.sent, 40)
assert.equal(step.job.pendingCount, 5)
await commsQueueSweep()
const swept = await json(await iletisimGetFlow(call(`/api/musteri/iletisim?is=${bulk.job.id}`, undefined, cookie)))
assert.equal(swept.job.status, "tamam")
assert.equal(swept.job.sent, 45)
assert.equal(readDevMail().length >= 20, true)
const second = await json(await iletisimPostFlow(call("/api/musteri/iletisim", { op: "gonder", channel: "eposta", kind: "kampanya", filter: { q: "toplu" }, subject: "İkinci", body: "Metin", expected: 45, confirm: true }, cookie)))
assert.equal(second.job.status, "kuyrukta")
const stopped = await json(await iletisimPostFlow(call("/api/musteri/iletisim", { op: "kuyruk.iptal", job: second.job.id }, cookie)))
assert.equal(stopped.job.status, "iptal")
assert.equal(stopped.job.skipped.iptal, 25)
const jobsRaw = (await store.get(commsJobsKey)) ?? ""
assert.equal(jobsRaw.includes("@pinwego.test"), false)
const prefsRaw = (await store.get(commsPrefsKey)) ?? ""
assert.equal(prefsRaw.includes("@pinwego.test"), false)
assert.equal(prefsRaw.includes("0555"), false)

console.log("comms ok")
