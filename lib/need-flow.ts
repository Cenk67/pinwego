import type { AccountStore } from "@/lib/account-record"
import { accountStore } from "@/lib/account-kv"
import { jsonReply, readJson, requestIp, takeIpSlot } from "@/lib/account-route"
import { adminSessionOpen, readAdminCookie } from "@/lib/admin-gate"
import { emptyNeedStats, needReport, noteNeedEvent, parseNeedStats, readNeedEvent } from "@/lib/need-analytics"
import { botUserAgent, reportDay, shiftDay } from "@/lib/stats"

const needKey = "need:v1"

function quiet() {
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } })
}

async function loadNeed(store: AccountStore) {
  const raw = await store.get(needKey)
  if (raw === null) return emptyNeedStats()
  return parseNeedStats(raw)
}

/**
 * POST /api/ihtiyac — one anonymous need-search event. No cookie is read or set; the body holds a
 * normalized sentence and counters only. Bots, prefetches and admin sessions are not counted.
 */
export async function needEventFlow(request: Request, now = Date.now()) {
  try {
    if (botUserAgent(request.headers.get("user-agent"))) return quiet()
    const purpose = `${request.headers.get("sec-purpose") || ""} ${request.headers.get("purpose") || ""}`.toLowerCase()
    if (purpose.includes("prefetch")) return quiet()
    if (!(await takeIpSlot(requestIp(request), "ihtiyac", now, 90, 60_000))) return quiet()
    const event = readNeedEvent(await readJson(request, 800))
    if (!event) return quiet()
    const store = await accountStore()
    if (!store) return quiet()
    const admin = readAdminCookie(request.headers.get("cookie"))
    if (admin && (await adminSessionOpen(store, admin))) return quiet()
    const state = await loadNeed(store)
    if (!state) return quiet()
    await store.put(needKey, JSON.stringify(noteNeedEvent(state, event, now)))
    return quiet()
  } catch {
    return quiet()
  }
}

/** GET /api/ihtiyac?from=&to= — admin report over the stored need events. */
export async function needReportFlow(request: Request, now = Date.now()) {
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  const open = await adminSessionOpen(store, readAdminCookie(request.headers.get("cookie")))
  if (!open) return jsonReply({ ok: false, reason: "yetki" }, 401)
  const state = await loadNeed(store)
  if (!state) return jsonReply({ ok: false, reason: "bozuk" }, 500)
  const today = reportDay(now)
  const url = new URL(request.url)
  let from = url.searchParams.get("from") || shiftDay(today, -6)
  let to = url.searchParams.get("to") || today
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return jsonReply({ ok: false, reason: "invalid" }, 400)
  if (from > to) [from, to] = [to, from]
  if (shiftDay(from, 399) < to) from = shiftDay(to, -399)
  const report = needReport(state, from, to)
  if (!report) return jsonReply({ ok: false, reason: "invalid" }, 400)
  return jsonReply({ ok: true, now, today, report })
}
