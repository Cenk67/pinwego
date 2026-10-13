import assert from "node:assert/strict"
import { accountKey, hashPassword, loginInStore, registerInStore } from "./account-record"

const memory = new Map<string, string>()
const store = {
  async get(key: string) {
    return memory.get(key) ?? null
  },
  async put(key: string, value: string) {
    memory.set(key, value)
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

console.log("hesap kaydı sunucuda yeniden açılıyor")
