import assert from "node:assert/strict"
import { hashPassword, type AccountStore } from "./account-record"
import {
  adminCodeMail,
  adminSessionCookie,
  clearAdminCookie,
  consumeAdminOtp,
  issueAdminOtp,
  passwordAccepted,
  readAdminCookie,
} from "./admin-gate"

function memoryStore(): AccountStore {
  const rows = new Map<string, string>()
  return {
    async get(key) {
      return rows.get(key) ?? null
    },
    async put(key, value) {
      rows.set(key, value)
    },
    async delete(key) {
      rows.delete(key)
    },
  }
}

const salt = "00112233445566778899aabbccddeeff"
const password = "dogru-sifre-pinwego"
const hash = await hashPassword(password, salt)
const secrets = { login: "ada@pinwego.com", salt, hash, otpTo: "inbox@example.com" }

assert.equal(await passwordAccepted("yanlis@pinwego.com", password, secrets), false)
assert.equal(await passwordAccepted("ada@pinwego.com", "yanlis-sifre", secrets), false)
assert.equal(await passwordAccepted("Ada@Pinwego.com", `  ${password}  `, secrets), true)

const store = memoryStore()
const now = 1_700_000_000_000
const code = await issueAdminOtp(store, now)
assert.equal(/^\d{8}$/.test(code), true)
assert.equal(await consumeAdminOtp(store, "00000000", now), "invalid")
assert.equal(await consumeAdminOtp(store, code, now), "ok")
assert.equal(await consumeAdminOtp(store, code, now), "invalid")

const again = await issueAdminOtp(store, now)
assert.equal(await consumeAdminOtp(store, again, now + 10 * 60 * 1000), "expired")
assert.equal(await consumeAdminOtp(store, again, now + 10 * 60 * 1000), "invalid")

const mail = adminCodeMail("12345678")
assert.equal(mail.subject, "pinwego yönetici kodu")
assert.equal(mail.text.includes("12345678"), true)
assert.equal(mail.html.includes("12345678"), true)
assert.equal(mail.text.includes("pinwego-admin"), false)
assert.equal(mail.html.includes(password), false)

const cookie = adminSessionCookie("tok en", true)
assert.equal(cookie.includes("HttpOnly"), true)
assert.equal(cookie.includes("Secure"), true)
assert.equal(cookie.includes("SameSite=Lax"), true)
assert.equal(readAdminCookie(`theme=dark; ${cookie.split("; ")[0]}`), "tok en")
assert.equal(clearAdminCookie(false).includes("Max-Age=0"), true)
assert.equal(readAdminCookie(null), "")

console.log("yönetici kodu sabit")
