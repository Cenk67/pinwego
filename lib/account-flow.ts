import { consumeMailToken, issueMailToken, loginInStore, loginLimited, noteLogin, registerInStore } from "@/lib/account-record"
import { accountStore } from "@/lib/account-kv"
import { emailSlot, guardChallenge, jsonReply, mailReady, readJson, requestIp, sendLogged, takeIpSlot } from "@/lib/account-route"
import { mailContent } from "@/lib/mail-copy"
import { linkBase, pickLocale } from "@/lib/mail-policy"
import { normalizeEmail } from "@/lib/auth-session"
import { validEmail } from "@/lib/identity"

export async function registerFlow(request: Request, now = Date.now()) {
  const body = await readJson(request, 8000)
  if (!body) return jsonReply({ ok: false, reason: "invalid" }, 400)
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  if (!(await takeIpSlot(requestIp(request), "kayit", now, 20, 60_000))) return jsonReply({ ok: false, reason: "limited" })
  const email = typeof body.email === "string" ? body.email : ""
  if (!(await emailSlot(store, "kayit", email, now, 8, 10 * 60 * 1000))) return jsonReply({ ok: false, reason: "limited" })
  const challenge = await guardChallenge(body, request)
  if (!challenge.ok) return jsonReply({ ok: false, reason: "challenge" }, 400)
  const verify = await mailReady()
  const result = await registerInStore(store, body, new Date(now).toISOString(), { emailVerified: verify ? false : undefined })
  if (!result.ok) return jsonReply(result, result.reason === "exists" ? 409 : 400)
  if (!verify) return jsonReply({ ok: true, account: result.account, mail: "unconfigured" })
  const issued = await issueMailToken(store, result.account.email, "verify", now)
  if (!issued.ok) return jsonReply({ ok: true, account: { ...result.account, emailVerified: false }, mail: "failed" })
  const url = `${linkBase(request.headers.get("origin"))}/dogrula?token=${encodeURIComponent(issued.token)}`
  const content = mailContent({ locale: pickLocale(body.locale), kind: "verify", url, business: result.account.role === "isletme" })
  const sent = await sendLogged(store, { to: result.account.email, purpose: "verify", ...content })
  return jsonReply({ ok: true, account: { ...result.account, emailVerified: false }, mail: sent.ok ? "sent" : "failed" })
}

export async function loginFlow(request: Request, now = Date.now()) {
  const body = await readJson(request, 4000)
  if (!body) return jsonReply({ ok: false, reason: "invalid" }, 400)
  const email = typeof body.email === "string" ? body.email : ""
  if (!validEmail(email)) return jsonReply({ ok: false, reason: "invalid" }, 400)
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  if (!(await takeIpSlot(requestIp(request), "giris", now, 30, 60_000))) return jsonReply({ ok: false, reason: "limited" })
  if (await loginLimited(store, email, now)) return jsonReply({ ok: false, reason: "limited" })
  const result = await loginInStore(store, body)
  if (!result.ok && result.reason === "invalid") return jsonReply(result, 400)
  await noteLogin(store, email, now, result.ok || result.reason === "unverified")
  return jsonReply(result)
}

export async function verifyFlow(request: Request, now = Date.now()) {
  const body = await readJson(request, 2000)
  if (!body || typeof body.token !== "string") return jsonReply({ ok: false, reason: "invalid" }, 400)
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  if (!(await takeIpSlot(requestIp(request), "dogrula", now, 20, 10 * 60 * 1000))) return jsonReply({ ok: false, reason: "limited" })
  const result = await consumeMailToken(store, body.token, "verify", now)
  if (!result.ok) return jsonReply({ ok: false, reason: result.reason })
  return jsonReply({ ok: true })
}

export async function resendFlow(request: Request, now = Date.now()) {
  const body = await readJson(request, 4000)
  if (!body) return jsonReply({ ok: false, reason: "invalid" }, 400)
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  const email = typeof body.email === "string" ? body.email : ""
  if (!(await takeIpSlot(requestIp(request), "yenile", now, 10, 10 * 60 * 1000))) return jsonReply({ ok: false, reason: "limited" })
  if (!(await emailSlot(store, "yenile", email, now, 3, 60 * 60 * 1000))) return jsonReply({ ok: false, reason: "limited" })
  const challenge = await guardChallenge(body, request)
  if (!challenge.ok) return jsonReply({ ok: false, reason: "challenge" }, 400)
  if (!(await mailReady())) return jsonReply({ ok: true, mail: "unconfigured" })
  const login = await loginInStore(store, body)
  if (!login.ok && login.reason === "unverified") {
    const issued = await issueMailToken(store, email, "verify", now)
    if (issued.ok) {
      const url = `${linkBase(request.headers.get("origin"))}/dogrula?token=${encodeURIComponent(issued.token)}`
      const content = mailContent({ locale: pickLocale(body.locale), kind: "verify", url, business: login.role === "isletme" })
      await sendLogged(store, { to: email, purpose: "verify", ...content })
    }
  }
  return jsonReply({ ok: true, mail: "sent" })
}

export async function resetFlow(request: Request, now = Date.now()) {
  const body = await readJson(request, 4000)
  if (!body) return jsonReply({ ok: false, reason: "invalid" }, 400)
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : ""
  if (!(await takeIpSlot(requestIp(request), "sifre", now, 10, 10 * 60 * 1000))) return jsonReply({ ok: false, reason: "limited" })
  const challenge = await guardChallenge(body, request)
  if (!challenge.ok) return jsonReply({ ok: false, reason: "challenge" }, 400)
  if (!validEmail(email)) return jsonReply({ ok: true, mail: (await mailReady()) ? "sent" : "unconfigured" })
  if (!(await emailSlot(store, "sifre", email, now, 3, 60 * 60 * 1000))) return jsonReply({ ok: false, reason: "limited" })
  if (!(await mailReady())) return jsonReply({ ok: true, mail: "unconfigured" })
  const issued = await issueMailToken(store, email, "reset", now)
  if (issued.ok) {
    const url = `${linkBase(request.headers.get("origin"))}/sifre?token=${encodeURIComponent(issued.token)}`
    const content = mailContent({ locale: pickLocale(body.locale), kind: "reset", url })
    await sendLogged(store, { to: email, purpose: "reset", ...content })
  }
  return jsonReply({ ok: true, mail: "sent" })
}

export async function resetPasswordFlow(request: Request, now = Date.now()) {
  const body = await readJson(request, 4000)
  if (!body || typeof body.token !== "string" || typeof body.password !== "string") return jsonReply({ ok: false, reason: "invalid" }, 400)
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  if (!(await takeIpSlot(requestIp(request), "sifre-yenile", now, 10, 10 * 60 * 1000))) return jsonReply({ ok: false, reason: "limited" })
  const challenge = await guardChallenge(body, request)
  if (!challenge.ok) return jsonReply({ ok: false, reason: "challenge" }, 400)
  const result = await consumeMailToken(store, body.token, "reset", now, body.password)
  if (!result.ok) return jsonReply({ ok: false, reason: result.reason })
  const content = mailContent({ locale: pickLocale(body.locale), kind: "changed", business: result.account.role === "isletme" })
  const sent = await sendLogged(store, { to: result.account.email, purpose: "changed", ...content })
  return jsonReply({ ok: true, mail: sent.ok ? "sent" : "failed" })
}
