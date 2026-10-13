import { takeEmailSlot } from "@/lib/account-record"
import { accountStore } from "@/lib/account-kv"
import {
  adminCodeMail,
  adminSessionCookie,
  adminSessionOpen,
  clearAdminCookie,
  clearAdminOtp,
  closeAdminSession,
  consumeAdminOtp,
  issueAdminOtp,
  openAdminSession,
  passwordAccepted,
  readAdminCookie,
} from "@/lib/admin-gate"
import { adminSecrets } from "@/lib/admin-secrets"
import { jsonReply, mailReady, readJson, requestIp, sendLogged, takeIpSlot } from "@/lib/account-route"

function secureRequest(request: Request) {
  return new URL(request.url).protocol === "https:"
}

export async function adminStartFlow(request: Request, now = Date.now()) {
  const body = await readJson(request, 4000)
  if (!body) return jsonReply({ ok: false, reason: "invalid" }, 400)
  const secrets = await adminSecrets()
  const store = await accountStore()
  if (!secrets || !store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  if (!(await takeIpSlot(requestIp(request), "yonetici", now, 8, 15 * 60 * 1000))) return jsonReply({ ok: false, reason: "limited" })
  const email = typeof body.email === "string" ? body.email : ""
  const password = typeof body.password === "string" ? body.password : ""
  if (!(await takeEmailSlot(store, "yonetici", email || "bos", now, 8, 15 * 60 * 1000))) return jsonReply({ ok: false, reason: "limited" })
  if (!(await passwordAccepted(email, password, secrets))) return jsonReply({ ok: false, reason: "mismatch" })
  if (!(await mailReady())) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  if (!(await takeEmailSlot(store, "yonetici-kod", secrets.otpTo, now, 8, 60 * 60 * 1000))) return jsonReply({ ok: false, reason: "limited" })
  const code = await issueAdminOtp(store, now)
  const sent = await sendLogged(store, { to: secrets.otpTo, purpose: "admin", ...adminCodeMail(code) })
  if (!sent.ok) {
    await clearAdminOtp(store)
    return jsonReply({ ok: false, reason: "unavailable" }, 503)
  }
  return jsonReply({ ok: true, step: "code" })
}

export async function adminCodeFlow(request: Request, now = Date.now()) {
  const body = await readJson(request, 2000)
  if (!body || typeof body.code !== "string") return jsonReply({ ok: false, reason: "invalid" }, 400)
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  if (!(await takeIpSlot(requestIp(request), "yonetici-kod", now, 10, 15 * 60 * 1000))) return jsonReply({ ok: false, reason: "limited" })
  const result = await consumeAdminOtp(store, body.code, now)
  if (result !== "ok") return jsonReply({ ok: false, reason: result })
  const token = await openAdminSession(store)
  const response = jsonReply({ ok: true })
  response.headers.append("set-cookie", adminSessionCookie(token, secureRequest(request)))
  return response
}

export async function adminSessionFlow(request: Request) {
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  const open = await adminSessionOpen(store, readAdminCookie(request.headers.get("cookie")))
  if (!open) return jsonReply({ ok: false }, 401)
  return jsonReply({ ok: true })
}

export async function adminLogoutFlow(request: Request) {
  const store = await accountStore()
  const token = readAdminCookie(request.headers.get("cookie"))
  if (store && token) await closeAdminSession(store, token)
  const response = jsonReply({ ok: true })
  response.headers.append("set-cookie", clearAdminCookie(secureRequest(request)))
  return response
}
