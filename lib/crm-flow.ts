import type { AccountStore } from "@/lib/account-record"
import { accountStore } from "@/lib/account-kv"
import { adminSessionOpen, readAdminCookie } from "@/lib/admin-gate"
import { jsonReply } from "@/lib/account-route"
import { applyCrm, parseCrm, sweep, type CrmState } from "@/lib/crm"

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

export async function crmGetFlow(request: Request, now = Date.now()) {
  const { store, open } = await gate(request)
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  if (!open) return jsonReply({ ok: false, reason: "yetki" }, 401)
  const parsed = await readState(store)
  if (!parsed) return jsonReply({ ok: false, reason: "bozuk" }, 500)
  const before = JSON.stringify(parsed)
  const state = sweep(structuredClone(parsed), now)
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
  await store.put(key, JSON.stringify(result.state))
  return jsonReply({ ok: true, state: result.state, warning: result.warning })
}

export type { CrmState }
