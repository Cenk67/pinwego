import { connection } from "next/server"
import { credentialStill } from "@/lib/account-record"
import { accountStore } from "@/lib/account-kv"
import { jsonReply, readJson, requestIp, takeIpSlot } from "@/lib/account-route"
import { normalizeEmail } from "@/lib/auth-session"
import { validEmail } from "@/lib/identity"

export async function POST(request: Request) {
  await connection()
  const now = Date.now()
  const body = await readJson(request, 2000)
  if (!body) return jsonReply({ ok: false }, 400)
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  if (!(await takeIpSlot(requestIp(request), "oturum", now, 60, 60_000))) return jsonReply({ ok: false, reason: "unavailable" }, 429)
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : ""
  const version = typeof body.credentialVersion === "number" ? body.credentialVersion : 1
  if (!validEmail(email)) return jsonReply({ ok: false })
  const ok = await credentialStill(store, email, version)
  return jsonReply({ ok })
}
