import assert from "node:assert/strict"
import { loginFlow as login, registerFlow as register, resetFlow as reset, resetPasswordFlow as resetPassword, verifyFlow as verify } from "./account-flow"
import { clearDevMail, readDevMail } from "./mailer"
import { checkTurnstile } from "./turnstile"

const holder = globalThis as typeof globalThis & { __pinwegoAccounts?: Map<string, unknown> }
holder.__pinwegoAccounts = new Map()
clearDevMail()

const customer = {
  role: "musteri",
  email: "posta.musteri@pinwego.test",
  password: "sifre1234",
  name: "Posta Musteri",
  phone: "05551234567",
  locale: "tr",
  acceptTerms: true,
  customer: { nationalId: "10000000146", birthDate: "1990-05-05" },
}

function call(handler: (request: Request) => Promise<Response>, body: unknown, origin = "http://127.0.0.1:43123") {
  return handler(new Request("http://127.0.0.1:43123/api", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  }))
}

const created = await call(register, customer)
const createdBody = await created.json()
assert.equal(created.status, 200)
assert.equal(createdBody.account.emailVerified, false)
assert.equal(createdBody.account.passwordHash, undefined)
assert.equal(JSON.stringify(createdBody).includes("sifre1234"), false)
const link = readDevMail().at(-1)?.text.match(/https?:\/\/\S+/)?.[0] ?? ""
const token = new URL(link).searchParams.get("token") ?? ""
assert.equal(token.length > 20, true)

const early = await call(login, { email: customer.email, password: customer.password })
const earlyBody = await early.json()
assert.equal(earlyBody.reason, "unverified")

const bad = await call(verify, { token: "bu-gecersiz-bir-baglanti-metni" })
assert.equal((await bad.json()).reason, "invalid")
const once = await call(verify, { token })
assert.equal((await once.json()).ok, true)
const twice = await call(verify, { token })
assert.equal((await twice.json()).reason, "used")
const signed = await call(login, { email: customer.email, password: customer.password })
const signedBody = await signed.json()
assert.equal(signedBody.ok, true)
assert.equal(signedBody.account.credentialVersion, 1)

const missing = await call(reset, { email: "yok@pinwego.test" })
const known = await call(reset, { email: customer.email })
assert.equal((await missing.json()).mail, (await known.json()).mail)
const resetLink = readDevMail().filter((item) => item.purpose === "reset").at(-1)?.html ?? ""
assert.equal(resetLink.includes(customer.password), false)
const resetToken = new URL(resetLink.match(/https?:\/\/[^"\s]+/)?.[0] ?? "http://127.0.0.1/sifre").searchParams.get("token") ?? ""
const updated = await call(resetPassword, { token: resetToken, password: "baskaSifre1", locale: "tr" })
assert.equal((await updated.json()).ok, true)
const notice = readDevMail().filter((item) => item.purpose === "changed").at(-1)
assert.equal(notice?.text.includes("baskaSifre1"), false)
const oldPassword = await (await call(login, { email: customer.email, password: customer.password })).json()
assert.equal(oldPassword.ok, false)
const fresh = await (await call(login, { email: customer.email, password: "baskaSifre1" })).json()
assert.equal(fresh.ok, true)
assert.equal(fresh.account.credentialVersion, 2)
const replayReset = await (await call(resetPassword, { token: resetToken, password: "baskaSifre1" })).json()
assert.equal(replayReset.ok, false)
assert.equal(replayReset.reason, "used")

const foreign = await call(register, { ...customer, email: "baska@pinwego.test" }, "https://evil.example")
assert.equal(foreign.status, 400)

const previousFetch = globalThis.fetch
process.env.TURNSTILE_SECRET_KEY = "turnstile-test-secret"
globalThis.fetch = async () => Response.json({ success: false })
const challenged = await call(reset, { email: customer.email, turnstile: "token-degeri-uzun" })
assert.equal((await challenged.json()).reason, "challenge")
delete process.env.TURNSTILE_SECRET_KEY
globalThis.fetch = previousFetch

const turnstile = await checkTurnstile("token-degeri-uzun", "secret", "203.0.113.5", async (_url, init) => {
  const params = init?.body instanceof URLSearchParams ? init.body : new URLSearchParams()
  assert.equal(params.get("response"), "token-degeri-uzun")
  assert.equal(params.get("remoteip"), "203.0.113.5")
  return Response.json({ success: true })
})
assert.equal(turnstile.ok, true)

console.log("doğrulama ve şifre sıfırlama tek kullanımlık")
