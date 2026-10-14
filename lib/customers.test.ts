import assert from "node:assert/strict"
import { accountKey, consumeMailToken, correctCustomerFields, hashPassword, issueMailToken, loginInStore, registerInStore, setCustomerStatus, takeEmailSlot } from "./account-record"
import { accountStore } from "./account-kv"
import { openAdminSession } from "./admin-gate"
import { customersKey, customerTotals, readCustomers, rememberCustomer } from "./customers"
import { musteriGetFlow, musteriPostFlow } from "./customers-flow"
import { validBirthDate, validGsm, validPassword } from "./identity"
import { mailContent } from "./mail-copy"
import { openMemberSession } from "./member-session"
import { consentsKey, noteConsents } from "./pages-flow"

const holder = globalThis as typeof globalThis & { __pinwegoAccounts?: Map<string, unknown> }
holder.__pinwegoAccounts = new Map()
process.env.ADMIN_LOGIN = "a@pinwego.test"
process.env.ADMIN_PASSWORD_SALT = "salt"
process.env.ADMIN_PASSWORD_HASH = "hash"
process.env.ADMIN_OTP_TO = "yonetici@pinwego.test"

assert.equal(validGsm("05551234567"), true)
assert.equal(validGsm("+44 20 7946 0958"), true)
assert.equal(validGsm("12345"), false)
assert.equal(validBirthDate("1992-03-03", "2026-10-14"), true)
assert.equal(validBirthDate("2099-01-01", "2026-10-14"), false)
assert.equal(validBirthDate("1899-12-31", "2026-10-14"), false)
assert.equal(validBirthDate("2026-02-31", "2026-10-14"), false)
assert.equal(validPassword("sifre1234"), true)
assert.equal(validPassword("abcdefgh"), false)
assert.equal(validPassword("12345678"), false)

const store = await accountStore()
assert.ok(store)

const fresh = {
  role: "musteri",
  email: "Ece@Pinwego.test",
  password: "sifre1234",
  name: "Yanlis Ad",
  phone: "+44 20 7946 0958",
  customer: { firstName: "Ece", lastName: "Demir", birthDate: "1992-03-03", occupation: "Mimar" },
}
const created = await registerInStore(store, fresh, "2026-10-14T09:00:00.000Z")
assert.equal(created.ok, true)
if (!created.ok) throw new Error("kayıt açılmadı")
assert.equal(created.account.name, "Ece Demir")
assert.equal(created.account.status, "aktif")
assert.equal(created.account.customer?.occupation, "Mimar")
assert.equal(JSON.stringify(created.account).includes("password"), false)
assert.equal(JSON.stringify(fresh).includes("again"), false)

const missing = await registerInStore(store, { ...fresh, email: "eksik@pinwego.test", customer: { firstName: "Ece", birthDate: "1992-03-03" } })
assert.deepEqual(missing, { ok: false, reason: "invalid" })
const future = await registerInStore(store, { ...fresh, email: "gelecek@pinwego.test", customer: { ...fresh.customer, birthDate: "2099-01-01" } })
assert.deepEqual(future, { ok: false, reason: "invalid" })
const badMail = await registerInStore(store, { ...fresh, email: "ece" })
assert.deepEqual(badMail, { ok: false, reason: "invalid" })
const badPhone = await registerInStore(store, { ...fresh, email: "telefon@pinwego.test", phone: "123" })
assert.deepEqual(badPhone, { ok: false, reason: "invalid" })
const weak = await registerInStore(store, { ...fresh, email: "zayif@pinwego.test", password: "abcdefgh" })
assert.deepEqual(weak, { ok: false, reason: "invalid" })
const duplicate = await registerInStore(store, fresh)
assert.deepEqual(duplicate, { ok: false, reason: "exists" })

const pending = await registerInStore(
  store,
  { ...fresh, email: "bekleyen@pinwego.test" },
  "2026-10-14T09:00:00.000Z",
  { emailVerified: false },
)
assert.equal(pending.ok, true)
if (!pending.ok) throw new Error("bekleyen kayıt açılmadı")
assert.equal(pending.account.emailVerified, false)
assert.equal(pending.account.status, "bekliyor")
const blocked = await loginInStore(store, { email: "bekleyen@pinwego.test", password: "sifre1234" })
assert.equal(blocked.ok, false)
if (blocked.ok) throw new Error("doğrulanmamış hesap açıldı")
assert.equal(blocked.reason, "unverified")

const issued = await issueMailToken(store, "bekleyen@pinwego.test", "verify", 1_000)
assert.equal(issued.ok, true)
if (!issued.ok) throw new Error("bağlantı çıkmadı")
const expired = await consumeMailToken(store, issued.token, "verify", 1_000 + 24 * 60 * 60 * 1000 + 1)
assert.equal(expired.ok, false)
if (expired.ok) throw new Error("süresi dolan bağlantı açıldı")
assert.equal(expired.reason, "expired")
const again = await issueMailToken(store, "bekleyen@pinwego.test", "verify", 2_000)
assert.equal(again.ok, true)
if (!again.ok) throw new Error("ikinci bağlantı çıkmadı")
const confirmed = await consumeMailToken(store, again.token, "verify", 2_000)
assert.equal(confirmed.ok, true)
if (!confirmed.ok) throw new Error("doğrulama açılmadı")
assert.equal(confirmed.account.status, "aktif")
assert.equal(confirmed.account.emailVerified, true)
const used = await consumeMailToken(store, again.token, "verify", 2_000)
assert.equal(used.ok, false)
if (used.ok) throw new Error("kullanılmış bağlantı açıldı")
assert.equal(used.reason, "used")

await rememberCustomer(store, confirmed.account, false)
const listed = await readCustomers(store)
assert.equal(listed.some((item) => item.id === confirmed.account.id && item.marketing === false), true)
const index = (await store.get(customersKey)) ?? ""
assert.equal(index.includes("password"), false)
assert.equal(index.includes("verifyHash"), false)
assert.equal(customerTotals(listed).verified >= 1, true)

const legacySalt = "abc123"
const legacy = {
  id: "11111111-1111-4111-8111-111111111111",
  role: "musteri",
  email: "eski@pinwego.test",
  name: "Eski Kayit",
  phone: "05551234567",
  createdAt: "2020-01-01T00:00:00.000Z",
  customer: { nationalId: "10000000146", birthDate: "1990-05-05" },
  passwordSalt: legacySalt,
  passwordHash: await hashPassword("sifre1234", legacySalt),
}
await store.put(accountKey(legacy.email), JSON.stringify(legacy))
const oldLogin = await loginInStore(store, { email: legacy.email, password: "sifre1234" })
assert.equal(oldLogin.ok, true)
if (!oldLogin.ok) throw new Error("eski kayıt açılmadı")
assert.equal(oldLogin.account.status, "aktif")
assert.equal(oldLogin.account.customer?.legacyId, true)
assert.equal(JSON.stringify(oldLogin.account).includes("10000000146"), false)

const suspended = await setCustomerStatus(store, confirmed.account.email, "askida", "2026-10-14T10:00:00.000Z")
assert.equal(suspended?.status, "askida")
const held = await loginInStore(store, { email: confirmed.account.email, password: "sifre1234" })
assert.equal(held.ok, false)
if (held.ok) throw new Error("askıdaki hesap açıldı")
assert.equal(held.reason, "askida")
const resumed = await setCustomerStatus(store, confirmed.account.email, "aktif", "2026-10-14T10:05:00.000Z")
assert.equal(resumed?.status, "aktif")
const corrected = await correctCustomerFields(
  store,
  confirmed.account.email,
  { firstName: "Ece", lastName: "Yildiz", birthDate: "1992-03-03", occupation: "Mimar", phone: "+44 20 7946 0958" },
  "2026-10-14T10:06:00.000Z",
)
assert.equal(typeof corrected === "object" && corrected?.name, "Ece Yildiz")
const removed = await setCustomerStatus(store, confirmed.account.email, "silindi", "2026-10-14T10:10:00.000Z")
assert.equal(removed?.name, "Silinen hesap")
assert.equal(removed?.phone, "")
const stored = (await store.get(accountKey(confirmed.account.email))) ?? ""
assert.equal(stored.includes("Ece"), false)
assert.equal(stored.includes("Mimar"), false)
const closed = await loginInStore(store, { email: confirmed.account.email, password: "sifre1234" })
assert.equal(closed.ok, false)
if (closed.ok) throw new Error("silinen hesap açıldı")
assert.equal(closed.reason, "silindi")
const revived = await setCustomerStatus(store, confirmed.account.email, "aktif", "2026-10-14T10:11:00.000Z")
assert.equal(revived, null)

const letter = mailContent({ locale: "tr", kind: "verify", url: "https://pinwego.com/dogrula?token=ornek", email: "ece@pinwego.test" })
assert.equal(letter.text.includes("ece@pinwego.test"), true)
assert.equal(letter.text.includes("yok say"), true)
assert.equal(letter.text.includes("sifre1234"), false)
assert.equal(letter.html.includes("pinwego"), true)

let slot = true
for (let index = 0; index < 3; index += 1) slot = await takeEmailSlot(store, "yenile", "bekleyen@pinwego.test", 5_000, 3, 60 * 60 * 1000)
assert.equal(slot, true)
assert.equal(await takeEmailSlot(store, "yenile", "bekleyen@pinwego.test", 5_000, 3, 60 * 60 * 1000), false)

function call(path: string, body?: unknown, cookie = "") {
  return new Request(`http://127.0.0.1:43123${path}`, {
    method: body ? "POST" : "GET",
    headers: { origin: "http://127.0.0.1:43123", "content-type": "application/json", cookie },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const denied = await musteriGetFlow(call("/api/musteri"))
assert.equal(denied.status, 401)
const stranger = await musteriPostFlow(call("/api/musteri", { op: "durum", id: created.account.id, status: "askida" }))
assert.equal(stranger.status, 401)

const admin = await openAdminSession(store)
const cookie = `pinwego_admin=${encodeURIComponent(admin)}`
await rememberCustomer(store, created.account, true)
const opened = await musteriGetFlow(call("/api/musteri", undefined, cookie))
assert.equal(opened.status, 200)
const body = (await opened.json()) as { items?: Array<{ id: string; email: string }> }
assert.equal(body.items?.some((item) => item.email === "ece@pinwego.test"), true)
assert.equal(JSON.stringify(body).includes("passwordHash"), false)

await noteConsents(store, created.account.id, true, 9_000)
const member = await openMemberSession(store, created.account.email)
const memberCookie = `pinwego_acct=${encodeURIComponent(member)}`
const own = await musteriGetFlow(call("/api/musteri", undefined, memberCookie))
const ownBody = (await own.json()) as { ok?: boolean; items?: unknown; own?: { marketing?: boolean } }
assert.equal(ownBody.ok, true)
assert.equal(ownBody.items, undefined)
assert.equal(ownBody.own?.marketing, true)
const optOut = await musteriPostFlow(call("/api/musteri", { op: "pazarlama", accepted: false }, memberCookie))
assert.equal(optOut.status, 200)
const consentRaw = (await store.get(consentsKey)) ?? ""
assert.equal(consentRaw.includes("pazarlama"), true)
assert.equal(consentRaw.includes(created.account.email), false)
const forced = await musteriPostFlow(call("/api/musteri", { op: "pazarlama", id: created.account.id, accepted: true }, cookie))
assert.equal(forced.status, 400)
