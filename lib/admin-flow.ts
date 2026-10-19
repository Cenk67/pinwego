import { accountStore } from "@/lib/account-kv"
import {
  adminAttemptBlocked,
  adminAttemptPurpose,
  adminCodeFailLimit,
  adminCodeMail,
  adminCodeSendLimit,
  adminCodeSendWindowMs,
  adminCodeWindowMs,
  adminPasswordFailLimit,
  adminPasswordWindowMs,
  adminSessionCookie,
  adminSessionOpen,
  clearAdminAttempt,
  clearAdminCookie,
  clearAdminOtp,
  closeAdminSession,
  consumeAdminOtp,
  issueAdminOtp,
  noteAdminAttempt,
  openAdminSession,
  passwordAccepted,
  readAdminCookie,
} from "@/lib/admin-gate"
import { adminSecrets } from "@/lib/admin-secrets"
import { jsonReply, mailReady, readJson, requestIp, sendLogged } from "@/lib/account-route"
import { clearMemberCookie, closeMemberSession, readMemberCookie, requestIsSecure } from "@/lib/member-session"
import { noteAdminLimit, noteAdminSession } from "@/lib/notify-flow"

function secureRequest(request: Request) {
  return requestIsSecure(request)
}

export async function adminStartFlow(request: Request, now = Date.now()) {
  const body = await readJson(request, 4000)
  if (!body) return jsonReply({ ok: false, reason: "invalid" }, 400)
  const secrets = await adminSecrets()
  const store = await accountStore()
  if (!secrets || !store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  const ip = requestIp(request)
  if (await adminAttemptBlocked(store, adminAttemptPurpose.password, ip, now, adminPasswordFailLimit, adminPasswordWindowMs)) {
    await noteAdminLimit(store, now)
    return jsonReply({ ok: false, reason: "limited" })
  }
  const email = typeof body.email === "string" ? body.email : ""
  const password = typeof body.password === "string" ? body.password : ""
  if (!(await passwordAccepted(email, password, secrets))) {
    const open = await noteAdminAttempt(store, adminAttemptPurpose.password, ip, now, adminPasswordFailLimit, adminPasswordWindowMs)
    if (!open) await noteAdminLimit(store, now)
    return jsonReply({ ok: false, reason: open ? "mismatch" : "limited" })
  }
  await clearAdminAttempt(store, adminAttemptPurpose.password, ip)
  if (!(await mailReady())) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  if (!(await noteAdminAttempt(store, adminAttemptPurpose.codeSend, ip, now, adminCodeSendLimit, adminCodeSendWindowMs))) {
    return jsonReply({ ok: false, reason: "limited" })
  }
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
  const ip = requestIp(request)
  if (await adminAttemptBlocked(store, adminAttemptPurpose.codeTry, ip, now, adminCodeFailLimit, adminCodeWindowMs)) {
    return jsonReply({ ok: false, reason: "limited" })
  }
  const result = await consumeAdminOtp(store, body.code, now)
  if (result !== "ok") {
    const open = await noteAdminAttempt(store, adminAttemptPurpose.codeTry, ip, now, adminCodeFailLimit, adminCodeWindowMs)
    return jsonReply({ ok: false, reason: open ? result : "limited" })
  }
  await clearAdminAttempt(store, adminAttemptPurpose.codeTry, ip)
  const token = await openAdminSession(store)
  await noteAdminSession(store, now, request.headers.get("origin"))
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
  const member = readMemberCookie(request.headers.get("cookie"))
  if (store && token) await closeAdminSession(store, token)
  if (store && member) await closeMemberSession(store, member)
  const response = jsonReply({ ok: true })
  const secure = secureRequest(request)
  response.headers.append("set-cookie", clearAdminCookie(secure))
  response.headers.append("set-cookie", clearMemberCookie(secure))
  return response
}
