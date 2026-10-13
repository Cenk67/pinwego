import { connection } from "next/server"
import { loginInStore, type AccountStore } from "@/lib/account-record"
import { takeDiscoverSlot } from "@/lib/discover"

const stamps: number[] = []

function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } })
}

async function accountsKv(): Promise<AccountStore | null> {
  try {
    const loaded = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "cloudflare:workers")) as {
      env?: { ACCOUNTS?: AccountStore }
    }
    return loaded.env?.ACCOUNTS ?? null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  await connection()
  const now = Date.now()
  const slot = takeDiscoverSlot(stamps, now, 20)
  stamps.splice(0, stamps.length, ...slot.stamps)
  if (!slot.ok) return reply({ ok: false, reason: "unavailable" }, 429)
  const store = await accountsKv()
  if (!store) return reply({ ok: false, reason: "unavailable" }, 503)
  const text = await request.text()
  if (text.length > 4000) return reply({ ok: false, reason: "invalid" }, 400)
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return reply({ ok: false, reason: "invalid" }, 400)
  }
  const result = await loginInStore(store, body)
  const status = result.ok ? 200 : result.reason === "invalid" ? 400 : 200
  return reply(result, status)
}
