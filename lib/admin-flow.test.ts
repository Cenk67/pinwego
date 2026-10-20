import assert from "node:assert/strict"
import { hashPassword } from "./account-record"
import { accountStore } from "./account-kv"
import {
  adminAttemptPurpose,
  adminCodeSendLimit,
  adminCodeSendWindowMs,
  adminPasswordFailLimit,
  adminPasswordWindowMs,
  noteAdminAttempt,
} from "./admin-gate"
import { adminCodeFlow, adminStartFlow } from "./admin-flow"
import { clearDevMail, readDevMail } from "./mailer"

const holder = globalThis as typeof globalThis & { __pinwegoAccounts?: Map<string, unknown> }
holder.__pinwegoAccounts = new Map()
clearDevMail()

const previous = {
  ADMIN_LOGIN: process.env.ADMIN_LOGIN,
  ADMIN_PASSWORD_SALT: process.env.ADMIN_PASSWORD_SALT,
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
  ADMIN_OTP_TO: process.env.ADMIN_OTP_TO,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
}
const login = "yonetici-adi"
const password = "aynen-kalan-sifre"
const salt = "00112233445566778899aabbccddeeff"
process.env.ADMIN_LOGIN = login
process.env.ADMIN_PASSWORD_SALT = salt
process.env.ADMIN_PASSWORD_HASH = await hashPassword(password, salt)
process.env.ADMIN_OTP_TO = "posta@pinwego.test"
delete process.env.RESEND_API_KEY

const now = 1_700_000_000_000
const home = "198.51.100.20"
const other = "198.51.100.21"
const flooded = "198.51.100.22"

function call(path: string, body: unknown, ip: string) {
  return new Request(`http://127.0.0.1:43123${path}`, {
    method: "POST",
    headers: {
      origin: "http://127.0.0.1:43123",
      "content-type": "application/json",
      "cf-connecting-ip": ip,
    },
    body: JSON.stringify(body),
  })
}

async function reason(response: Response) {
  return ((await response.json()) as { ok?: boolean; reason?: string; step?: string }).reason
}

for (let index = 0; index < 9; index += 1) {
  const response = await adminStartFlow(call("/api/yonetici", { email: login, password: "yanlis-sifre" }, home), now)
  assert.equal(await reason(response), "mismatch")
}

const opened = await adminStartFlow(call("/api/yonetici", { email: login, password }, home), now)
assert.equal(((await opened.json()) as { step?: string }).step, "code")

for (let index = 0; index < 35; index += 1) {
  assert.equal(
    await noteAdminAttempt((await accountStore())!, adminAttemptPurpose.password, home, now, adminPasswordFailLimit, adminPasswordWindowMs),
    true,
  )
}
const afterClear = await adminStartFlow(call("/api/yonetici", { email: login, password: "yanlis-sifre" }, home), now)
assert.equal(await reason(afterClear), "mismatch")

const store = await accountStore()
assert.ok(store)
for (let index = 0; index < adminPasswordFailLimit; index += 1) {
  assert.equal(await noteAdminAttempt(store, adminAttemptPurpose.password, flooded, now, adminPasswordFailLimit, adminPasswordWindowMs), true)
}
const stopped = await adminStartFlow(call("/api/yonetici", { email: login, password }, flooded), now)
assert.equal(await reason(stopped), "limited")
const stranger = await adminStartFlow(call("/api/yonetici", { email: "baskasi", password: "tahmin" }, other), now)
assert.equal(await reason(stranger), "mismatch")

for (let index = 0; index < 10; index += 1) {
  const response = await adminStartFlow(call("/api/yonetici", { email: login, password }, other), now)
  assert.equal(((await response.json()) as { step?: string }).step, "code")
}
assert.equal(readDevMail().filter((item) => item.purpose === "admin").length >= 10, true)

const latest = readDevMail().filter((item) => item.purpose === "admin").at(-1)
assert.equal(latest?.to, "posta@pinwego.test")
assert.equal(latest?.text.includes(password), false)
const code = latest?.text.match(/\b\d{8}\b/)?.[0] ?? ""
assert.equal(code.length, 8)
const wrongCode = code === "00000000" ? "11111111" : "00000000"
const rejected = await adminCodeFlow(call("/api/yonetici/kod", { code: wrongCode }, other), now)
assert.equal(await reason(rejected), "invalid")
const accepted = await adminCodeFlow(call("/api/yonetici/kod", { code }, other), now)
assert.equal(accepted.headers.get("set-cookie")?.includes("pinwego_admin="), true)
const withoutCode = await adminStartFlow(call("/api/yonetici", { email: login, password: "yanlis-sifre" }, other), now)
assert.equal(await reason(withoutCode), "mismatch")

const relay = "198.51.100.23"
for (let index = 0; index < adminCodeSendLimit; index += 1) {
  assert.equal(await noteAdminAttempt(store, adminAttemptPurpose.codeSend, relay, now, adminCodeSendLimit, adminCodeSendWindowMs), true)
}
const mailStopped = await adminStartFlow(call("/api/yonetici", { email: login, password }, relay), now)
assert.equal(await reason(mailStopped), "limited")
const homeStillOpen = await adminStartFlow(call("/api/yonetici", { email: login, password: "yanlis-sifre" }, home), now)
assert.equal(await reason(homeStillOpen), "mismatch")

for (const key of ["ADMIN_LOGIN", "ADMIN_PASSWORD_SALT", "ADMIN_PASSWORD_HASH", "ADMIN_OTP_TO", "RESEND_API_KEY"] as const) {
  const value = previous[key]
  if (value) process.env[key] = value
  else delete process.env[key]
}

console.log("yönetici girişi tekrar denemede kilitlenmez, kod durur")
