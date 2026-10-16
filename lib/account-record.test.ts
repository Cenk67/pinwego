import assert from "node:assert/strict"
import { accountKey, consumeMailToken, credentialStill, hashPassword, issueMailToken, loginInStore, registerInStore } from "./account-record"

const memory = new Map<string, string>()
const store = {
  async get(key: string) {
    return memory.get(key) ?? null
  },
  async put(key: string, value: string) {
    memory.set(key, value)
  },
  async delete(key: string) {
    memory.delete(key)
  },
}

const customer = {
  role: "musteri",
  email: "Ada@Pinwego.com",
  password: "sifre1234",
  name: "Ada Yılmaz",
  phone: "05551234567",
  customer: { nationalId: "10000000146", birthDate: "1990-05-05" },
}

const created = await registerInStore(store, customer)
assert.equal(created.ok, true)
if (!created.ok) throw new Error("kayıt açılmadı")
assert.equal(created.account.email, "ada@pinwego.com")
assert.equal("passwordHash" in created.account, false)
assert.equal(memory.size, 1)

const again = await registerInStore(store, customer)
assert.deepEqual(again, { ok: false, reason: "exists" })

const spaced = await loginInStore(store, { email: " ada@pinwego.com ", password: "  sifre1234  " })
assert.equal(spaced.ok, true)

const wrong = await loginInStore(store, { email: "ada@pinwego.com", password: "yanlis123" })
assert.deepEqual(wrong, { ok: false, reason: "mismatch" })

const missing = await loginInStore(store, { email: "yok@pinwego.com", password: "sifre1234" })
assert.deepEqual(missing, { ok: false, reason: "unknown" })

const admin = await registerInStore(store, { ...customer, email: "admin@pinwego.com", role: "admin" })
assert.deepEqual(admin, { ok: false, reason: "invalid" })

const salt = "abc123"
const hash = await hashPassword("sifre1234", salt)
assert.equal(await hashPassword("sifre1234", salt), hash)
assert.notEqual(await hashPassword("sifre12345", salt), hash)
assert.equal(accountKey("Ada@Pinwego.com"), "acct:ada@pinwego.com")

const pending = await registerInStore(store, { ...customer, email: "yeni@pinwego.test" }, "2026-10-13T00:00:00.000Z", { emailVerified: false })
assert.equal(pending.ok, true)
if (!pending.ok) throw new Error("bekleyen kayıt açılmadı")
assert.equal(pending.account.emailVerified, false)
const blocked = await loginInStore(store, { email: "yeni@pinwego.test", password: "sifre1234" })
assert.equal(blocked.ok, false)
if (blocked.ok) throw new Error("doğrulanmamış hesap açıldı")
assert.equal(blocked.reason, "unverified")

const issued = await issueMailToken(store, "yeni@pinwego.test", "verify", 1_000)
assert.equal(issued.ok, true)
if (!issued.ok) throw new Error("doğrulama bağlantısı çıkmadı")
const expired = await consumeMailToken(store, issued.token, "verify", 1_000 + 24 * 60 * 60 * 1000 + 1)
assert.equal(expired.ok, false)
if (expired.ok) throw new Error("süresi dolan bağlantı açıldı")
assert.equal(expired.reason, "expired")
assert.equal(typeof expired.accountId, "string")
const againToken = await issueMailToken(store, "yeni@pinwego.test", "verify", 2_000)
assert.equal(againToken.ok, true)
if (!againToken.ok) throw new Error("ikinci bağlantı çıkmadı")
const confirmed = await consumeMailToken(store, againToken.token, "verify", 2_000)
assert.equal(confirmed.ok, true)
const replay = await consumeMailToken(store, againToken.token, "verify", 2_000)
assert.deepEqual(replay, { ok: false, reason: "used" })
const opened = await loginInStore(store, { email: "yeni@pinwego.test", password: "sifre1234" })
assert.equal(opened.ok, true)

const reset = await issueMailToken(store, "yeni@pinwego.test", "reset", 3_000)
assert.equal(reset.ok, true)
if (!reset.ok) throw new Error("sıfırlama bağlantısı çıkmadı")
const weak = await consumeMailToken(store, reset.token, "reset", 3_000, "kisa")
assert.deepEqual(weak, { ok: false, reason: "weak" })
const changed = await consumeMailToken(store, reset.token, "reset", 3_000, "yeniSifre9")
assert.equal(changed.ok, true)
if (!changed.ok) throw new Error("şifre değişmedi")
assert.equal(changed.account.credentialVersion, 2)
assert.equal((await loginInStore(store, { email: "yeni@pinwego.test", password: "sifre1234" })).ok, false)
assert.equal((await loginInStore(store, { email: "yeni@pinwego.test", password: "yeniSifre9" })).ok, true)
assert.equal(await credentialStill(store, "yeni@pinwego.test", 1), false)
assert.equal(await credentialStill(store, "yeni@pinwego.test", 2), true)
const reused = await consumeMailToken(store, reset.token, "reset", 3_000, "yeniSifre9")
assert.deepEqual(reused, { ok: false, reason: "used" })

console.log("hesap kaydı sunucuda yeniden açılıyor")
