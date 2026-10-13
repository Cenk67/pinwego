import type { AccountStore } from "@/lib/account-record"
import { accountStore } from "@/lib/account-kv"
import { adminSessionOpen, readAdminCookie } from "@/lib/admin-gate"
import { emailSlot, jsonReply, mailReady, sendLogged } from "@/lib/account-route"
import { adminSecrets } from "@/lib/admin-secrets"
import { applyCrm, markReminded, parseCrm, reminderDigest, sweep, type CrmState } from "@/lib/crm"

const key = "crm:v1"

async function gate(request: Request) {
  const store = await accountStore()
  if (!store) return { store: null, open: false }
  const open = await adminSessionOpen(store, readAdminCookie(request.headers.get("cookie")))
  return { store, open }
}

async function readState(store: AccountStore) {
  return parseCrm(await store.get(key))
}

async function deliverReminders(store: AccountStore, state: CrmState, now: number) {
  const letter = reminderDigest(state)
  if (!letter) return state
  const secrets = await adminSecrets()
  if (!secrets || !(await mailReady())) return state
  if (!(await emailSlot(store, "crm-hatirlatma", secrets.otpTo, now, 12, 60 * 60 * 1000))) return state
  const sent = await sendLogged(store, { to: secrets.otpTo, purpose: "remind", subject: letter.subject, html: letter.html, text: letter.text })
  if (!sent.ok) return state
  return markReminded(state, letter.ids, new Date(now).toISOString())
}

export async function crmGetFlow(request: Request, now = Date.now()) {
  const { store, open } = await gate(request)
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  if (!open) return jsonReply({ ok: false, reason: "yetki" }, 401)
  const parsed = await readState(store)
  if (!parsed) return jsonReply({ ok: false, reason: "bozuk" }, 500)
  const before = JSON.stringify(parsed)
  const state = await deliverReminders(store, sweep(structuredClone(parsed), now), now)
  if (JSON.stringify(state) !== before) await store.put(key, JSON.stringify(state))
  return jsonReply({ ok: true, state })
}

export async function crmPostFlow(request: Request, now = Date.now()) {
  const { store, open } = await gate(request)
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  if (!open) return jsonReply({ ok: false, reason: "yetki" }, 401)
  let body: Record<string, unknown>
  try {
    const raw = await request.text()
    if (raw.length > 120_000) return jsonReply({ ok: false, reason: "invalid" }, 400)
    body = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return jsonReply({ ok: false, reason: "invalid" }, 400)
  }
  const parsed = await readState(store)
  if (!parsed) return jsonReply({ ok: false, reason: "bozuk" }, 500)
  const result = applyCrm(parsed, body, now)
  if (!result.ok) return jsonReply({ ok: false, error: result.error })
  await deliverReminders(store, result.state, now)
  await store.put(key, JSON.stringify(result.state))
  return jsonReply({ ok: true, state: result.state, warning: result.warning })
}

export type { CrmState }
