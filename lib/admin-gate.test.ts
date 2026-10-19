import assert from "node:assert/strict"
import { hashPassword, type AccountStore } from "./account-record"
import {
  adminAttemptBlocked,
  adminAttemptPurpose,
  adminCodeMail,
  adminOtpMissLimit,
  adminPasswordFailLimit,
  adminPasswordWindowMs,
  adminSessionCookie,
  clearAdminAttempt,
  clearAdminCookie,
  consumeAdminOtp,
  issueAdminOtp,
  noteAdminAttempt,
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

const guarded = await issueAdminOtp(store, now)
const wrong = guarded === "00000000" ? "11111111" : "00000000"
for (let index = 0; index < adminOtpMissLimit - 1; index += 1) {
  assert.equal(await consumeAdminOtp(store, wrong, now), "invalid")
}
assert.equal(await consumeAdminOtp(store, guarded, now), "ok")
const burned = await issueAdminOtp(store, now)
const wrongAgain = burned === "00000000" ? "11111111" : "00000000"
for (let index = 0; index < adminOtpMissLimit; index += 1) {
  assert.equal(await consumeAdminOtp(store, wrongAgain, now), "invalid")
}
assert.equal(await consumeAdminOtp(store, burned, now), "invalid")

const ip = "198.51.100.10"
const other = "198.51.100.11"
for (let index = 0; index < adminPasswordFailLimit; index += 1) {
  assert.equal(await noteAdminAttempt(store, adminAttemptPurpose.password, ip, now, adminPasswordFailLimit, adminPasswordWindowMs), true)
}
assert.equal(await adminAttemptBlocked(store, adminAttemptPurpose.password, ip, now, adminPasswordFailLimit, adminPasswordWindowMs), true)
assert.equal(await noteAdminAttempt(store, adminAttemptPurpose.password, ip, now, adminPasswordFailLimit, adminPasswordWindowMs), false)
assert.equal(await adminAttemptBlocked(store, adminAttemptPurpose.password, other, now, adminPasswordFailLimit, adminPasswordWindowMs), false)
await clearAdminAttempt(store, adminAttemptPurpose.password, ip)
assert.equal(await adminAttemptBlocked(store, adminAttemptPurpose.password, ip, now, adminPasswordFailLimit, adminPasswordWindowMs), false)

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
