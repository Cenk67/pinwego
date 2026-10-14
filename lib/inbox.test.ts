import assert from "node:assert/strict"
import { openAdminSession } from "./admin-gate"
import { accountStore } from "./account-kv"
import { clearDevMail, readDevMail } from "./mailer"
import { iletisimGetFlow, iletisimPostFlow } from "./inbox-flow"
import { inboxKey, parseBook, publicSettings, seedSettings, socialHref } from "./inbox"

const holder = globalThis as typeof globalThis & { __pinwegoAccounts?: Map<string, unknown> }
holder.__pinwegoAccounts = new Map()
clearDevMail()
const store = await accountStore()
assert.ok(store)

assert.equal(socialHref("instagram", "https://instagram.com/pinwego"), "https://instagram.com/pinwego")
assert.equal(socialHref("instagram", "http://instagram.com/pinwego"), "")
assert.equal(socialHref("instagram", "https://evil.example/pinwego"), "")
assert.equal(socialHref("x", "javascript:alert(1)"), "")
assert.equal(publicSettings(seedSettings()).socials.length, 0)
assert.equal(parseBook("{"), null)

function call(path: string, body?: unknown, cookie = "") {
  return new Request(`http://127.0.0.1:43123${path}`, {
    method: body ? "POST" : "GET",
    headers: { origin: "http://127.0.0.1:43123", "content-type": "application/json", cookie },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const message = {
  op: "send",
  name: "Ada Deneme",
  email: "iletisim@pinwego.test",
  phone: "05551234567",
  topicId: "duzeltme",
  reference: "Han Firini",
  body: "Adres satırı hatalı görünüyor. ".repeat(8),
  website: "",
}

const missing = await iletisimPostFlow(call("/api/iletisim", { ...message, email: "yok" }))
assert.equal((await missing.json()).reason, "invalid")
const html = await iletisimPostFlow(call("/api/iletisim", { ...message, body: "<script>alert(1)</script> mesaj" }))
assert.equal((await html.json()).reason, "invalid")
const trap = await iletisimPostFlow(call("/api/iletisim", { ...message, website: "https://spam.example" }))
assert.equal((await trap.json()).ok, true)
assert.equal(await store.get(inboxKey), null)

const previous = {
  ADMIN_LOGIN: process.env.ADMIN_LOGIN,
  ADMIN_PASSWORD_SALT: process.env.ADMIN_PASSWORD_SALT,
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
  ADMIN_OTP_TO: process.env.ADMIN_OTP_TO,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
}
process.env.ADMIN_LOGIN = "test-login"
process.env.ADMIN_PASSWORD_SALT = "test-salt"
process.env.ADMIN_PASSWORD_HASH = "test-hash"
process.env.ADMIN_OTP_TO = "yonetici@pinwego.test"
delete process.env.RESEND_API_KEY

const created = await iletisimPostFlow(call("/api/iletisim", message))
const createdBody = (await created.json()) as { ok?: boolean; id?: string; notice?: string }
assert.equal(createdBody.ok, true)
assert.equal(createdBody.notice, "gitti")
const id = createdBody.id ?? ""
const notice = readDevMail().at(-1)
assert.equal(notice?.to, "yonetici@pinwego.test")
assert.equal(notice?.text.includes(message.email), true)
assert.equal(notice?.text.includes(message.body), false)
assert.equal(notice?.subject.includes("\n"), false)

const again = await iletisimPostFlow(call("/api/iletisim", message))
assert.equal((await again.json()).id, id)
const book = parseBook(await store.get(inboxKey))
assert.equal(book?.messages.length, 1)
assert.equal(book?.messages[0]?.topicLabel, "Bilgi düzeltme")
assert.equal(book?.messages[0]?.reference, "Han Firini")
assert.equal(book?.messages[0]?.status, "yeni")

const publicView = await iletisimGetFlow(call("/api/iletisim"))
const publicBody = await publicView.json()
assert.equal(JSON.stringify(publicBody).includes(message.email), false)
assert.equal(publicBody.settings.topics.some((item: { id: string }) => item.id === "duzeltme"), true)

const token = await openAdminSession(store)
const cookie = `pinwego_admin=${encodeURIComponent(token)}`
const hidden = await iletisimPostFlow(call("/api/iletisim", { op: "note", id, text: "gizli-not-metni" }))
assert.equal(hidden.status, 401)
const noted = await iletisimPostFlow(call("/api/iletisim", { op: "note", id, text: "gizli-not-metni" }, cookie))
assert.equal((await noted.json()).ok, true)
const seen = await iletisimPostFlow(call("/api/iletisim", { op: "seen", id }, cookie))
const seenBody = (await seen.json()) as { message?: { status: string; seenAt: string } }
assert.equal(seenBody.message?.status, "yeni")
assert.equal(seenBody.message?.seenAt.length > 10, true)
const status = await iletisimPostFlow(call("/api/iletisim", { op: "status", id, status: "inceleniyor", assignee: "destek" }, cookie))
assert.equal((await status.json()).message.status, "inceleniyor")
const replied = await iletisimPostFlow(call("/api/iletisim", { op: "reply", id, text: "Kaydi incelemeye aldik." }, cookie))
const repliedBody = (await replied.json()) as { message?: { status: string; reply: string } }
assert.equal(repliedBody.message?.status, "yanitlandi")
assert.equal(repliedBody.message?.reply, "gitti")
const replyMail = readDevMail().filter((item) => item.to === message.email).at(-1)
assert.equal(replyMail?.text.includes("Kaydi incelemeye aldik."), true)
assert.equal(replyMail?.text.includes("gizli-not-metni"), false)
assert.equal(replyMail?.subject, "Pinwego yanıtı")

const renamed = seedSettings()
renamed.topics = renamed.topics.map((item) => item.id === "duzeltme" ? { ...item, label: "Kayıt düzeltme" } : item)
const saved = await iletisimPostFlow(call("/api/iletisim", { op: "settings", settings: { ...renamed, socials: renamed.socials.map((item) => item.id === "instagram" ? { ...item, url: "https://www.instagram.com/pinwego", active: true } : item) } }, cookie))
assert.equal((await saved.json()).ok, true)
const after = parseBook(await store.get(inboxKey))
assert.equal(after?.messages[0]?.topicLabel, "Bilgi düzeltme")
assert.equal(publicSettings(after?.settings ?? renamed).socials.some((item) => item.id === "instagram"), true)
const badSocial = await iletisimPostFlow(call("/api/iletisim", { op: "settings", settings: { ...renamed, socials: renamed.socials.map((item) => item.id === "youtube" ? { ...item, url: "https://evil.example/pin", active: true } : item) } }, cookie))
assert.equal((await badSocial.json()).ok, false)

const closed = { ...renamed, published: false }
assert.equal((await (await iletisimPostFlow(call("/api/iletisim", { op: "settings", settings: closed }, cookie))).json()).ok, true)
const blocked = await iletisimPostFlow(call("/api/iletisim", { ...message, body: "Bu ikinci bir mesajdir ve kapali formda kalmamalidir." }))
assert.equal(blocked.status, 404)
assert.equal((await (await iletisimPostFlow(call("/api/iletisim", { op: "settings", settings: { ...closed, published: true } }, cookie))).json()).ok, true)

const previousFetch = globalThis.fetch
process.env.RESEND_API_KEY = "test-key"
globalThis.fetch = async () => { throw new Error("posta yok") }
const failed = await iletisimPostFlow(new Request("http://127.0.0.1:43123/api/iletisim", {
  method: "POST",
  headers: { origin: "http://127.0.0.1:43123", "content-type": "application/json", "cf-connecting-ip": "203.0.113.20" },
  body: JSON.stringify({ ...message, topicId: "genel", body: "Posta gidemese de bu metin kayitta kalir." }),
}))
const failedBody = (await failed.json()) as { ok?: boolean; notice?: string; id?: string }
assert.equal(failedBody.ok, true)
assert.equal(failedBody.notice, "hata")
assert.equal(parseBook(await store.get(inboxKey))?.messages.some((item) => item.id === failedBody.id), true)
globalThis.fetch = previousFetch
delete process.env.RESEND_API_KEY

const wiped = await iletisimPostFlow(call("/api/iletisim", { op: "redact", id }, cookie))
assert.equal((await wiped.json()).message.email, "")
const kept = parseBook(await store.get(inboxKey))
assert.equal(kept?.messages.find((item) => item.id === id)?.email, "")
assert.equal(kept?.messages.find((item) => item.id === id)?.events.some((item) => item.text.includes("gizli-not-metni")), false)

await store.put(inboxKey, "{")
const broken = await iletisimGetFlow(call("/api/iletisim", undefined, cookie))
assert.equal(broken.status, 500)
assert.equal(await store.get(inboxKey), "{")

for (const key of ["ADMIN_LOGIN", "ADMIN_PASSWORD_SALT", "ADMIN_PASSWORD_HASH", "ADMIN_OTP_TO", "RESEND_API_KEY"] as const) {
  const value = previous[key]
  if (value) process.env[key] = value
  else delete process.env[key]
}

console.log("iletişim kaydı, iç not ve sosyal bağlantı")
