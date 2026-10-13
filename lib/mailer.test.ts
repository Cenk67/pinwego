import assert from "node:assert/strict"
import { mailContent } from "./mail-copy"
import { clearDevMail, deliverMail, readDevMail } from "./mailer"
import { allowedOrigin, devPreviewPath, linkBase, nextBucket } from "./mail-policy"

assert.equal(allowedOrigin(null), true)
assert.equal(allowedOrigin("https://pinwego.com"), true)
assert.equal(allowedOrigin("https://evil.example"), false)
assert.equal(linkBase("javascript:alert(1)"), "https://pinwego.com")
assert.equal(linkBase("https://www.pinwego.com"), "https://www.pinwego.com")
assert.equal(linkBase("http://127.0.0.1:43123"), "http://127.0.0.1:43123")
assert.equal(devPreviewPath("/onizleme/posta"), true)
assert.equal(devPreviewPath("/sifre"), false)

const bucket = nextBucket(null, 1_000, 2, 100)
assert.equal(bucket.ok, true)
const second = nextBucket(bucket.next, 1_050, 2, 100)
assert.equal(second.ok, true)
const third = nextBucket(second.next, 1_080, 2, 100)
assert.equal(third.ok, false)

clearDevMail()
const caught = await deliverMail(
  { to: "ada@pinwego.test", subject: "Konu", html: "<p>gövde</p>", text: "gövde", purpose: "verify" },
  { production: false },
)
assert.equal(caught.ok, true)
assert.equal(readDevMail()[0]?.to, "ada@pinwego.test")
const off = await deliverMail(
  { to: "ada@pinwego.test", subject: "Konu", html: "<p>gövde</p>", text: "gövde", purpose: "verify" },
  { production: true },
)
assert.deepEqual(off, { ok: false, reason: "unconfigured", attempts: 0 })

const changed = mailContent({ locale: "tr", kind: "changed" })
assert.equal(changed.html.includes("yeniSifre9"), false)
assert.equal(changed.text.includes("destek@pinwego.com"), true)

let calls = 0
const recovered = await deliverMail(
  { to: "ada@pinwego.test", subject: "Konu", html: "<p>gövde</p>", text: "gövde", purpose: "reset" },
  { production: true, apiKey: "re_test_secret" },
  async () => {
    calls += 1
    if (calls < 3) return new Response("busy", { status: 500 })
    return Response.json({ id: "re_123" })
  },
)
assert.equal(recovered.ok, true)
if (recovered.ok) assert.equal(recovered.id, "re_123")
assert.equal(calls, 3)

let rejected = 0
const failed = await deliverMail(
  { to: "ada@pinwego.test", subject: "Konu", html: "<p>gövde</p>", text: "gövde", purpose: "reset" },
  { production: true, apiKey: "re_test_secret" },
  async () => {
    rejected += 1
    return new Response("no", { status: 422 })
  },
)
assert.equal(failed.ok, false)
assert.equal(rejected, 1)
assert.equal(JSON.stringify(failed).includes("re_test_secret"), false)

console.log("posta gönderimi tekrar dener, anahtarı dışarı yazmaz")
