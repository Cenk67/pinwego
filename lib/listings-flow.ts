import { adminSessionOpen, readAdminCookie } from "@/lib/admin-gate"
import { accountStore } from "@/lib/account-kv"
import { jsonReply, readJson, requestIp, takeIpSlot } from "@/lib/account-route"
import { acceptListing, applyFlags, emptyBook, listingsKey, parseBook, toBusiness, type ListingBook } from "@/lib/listings"
import { memberEmail, publicAccount, readMemberCookie } from "@/lib/member-session"

async function actor(store: NonNullable<Awaited<ReturnType<typeof accountStore>>>, request: Request) {
  if (await adminSessionOpen(store, readAdminCookie(request.headers.get("cookie")))) return { kind: "admin" as const }
  const email = await memberEmail(store, readMemberCookie(request.headers.get("cookie")))
  if (!email) return null
  const account = await publicAccount(store, email)
  if (!account) return null
  return { kind: "member" as const, account }
}

async function readBook(store: NonNullable<Awaited<ReturnType<typeof accountStore>>>): Promise<ListingBook | null> {
  const raw = await store.get(listingsKey)
  if (raw === null) return emptyBook()
  return parseBook(raw)
}

function present(book: ListingBook, admin: boolean) {
  const rows = admin ? book.listings : book.listings.filter((item) => !item.hidden)
  return {
    ok: true,
    listings: rows.map(toBusiness),
    hiddenIds: admin ? book.listings.filter((item) => item.hidden).map((item) => item.id) : [],
  }
}

export async function ilanGetFlow(request: Request) {
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  const book = await readBook(store)
  if (!book) return jsonReply({ ok: false, reason: "bozuk" }, 500)
  const who = await actor(store, request)
  return jsonReply(present(book, who?.kind === "admin"))
}

export async function ilanPostFlow(request: Request, now = Date.now()) {
  const body = await readJson(request, 12000)
  if (!body || typeof body.op !== "string") return jsonReply({ ok: false, reason: "invalid" }, 400)
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  const who = await actor(store, request)
  if (!who) return jsonReply({ ok: false, reason: "oturum" }, 401)
  const book = await readBook(store)
  if (!book) return jsonReply({ ok: false, reason: "bozuk" }, 500)
  if (body.op === "create") {
    if (!(await takeIpSlot(requestIp(request), "ilan", now, 30, 10 * 60 * 1000))) return jsonReply({ ok: false, reason: "limited" })
    if (who.kind === "member" && who.account.role !== "isletme") return jsonReply({ ok: false, reason: "yetki" }, 403)
    const ownerId = who.kind === "admin" ? "yonetici" : who.account.id
    const saved = acceptListing(body, ownerId, new Date(now).toISOString(), book, who.kind === "admin")
    if (!saved.ok) return jsonReply({ ok: false, reason: saved.reason })
    await store.put(listingsKey, JSON.stringify(saved.book))
    return jsonReply({ ok: true, listing: toBusiness(saved.listing) })
  }
  if (who.kind !== "admin") return jsonReply({ ok: false, reason: "yetki" }, 403)
  const id = typeof body.id === "string" ? body.id : ""
  const current = book.listings.find((item) => item.id === id || item.slug === id)
  if (!current) return jsonReply({ ok: false, reason: "yok" }, 404)
  if (body.op === "delete") {
    const listings = book.listings.filter((item) => item.id !== current.id)
    await store.put(listingsKey, JSON.stringify({ listings }))
    return jsonReply({ ok: true })
  }
  if (body.op === "flags") {
    const listing = applyFlags(current, body)
    const listings = book.listings.map((item) => (item.id === current.id ? listing : item))
    await store.put(listingsKey, JSON.stringify({ listings }))
    return jsonReply({ ok: true, listing: toBusiness(listing) })
  }
  return jsonReply({ ok: false, reason: "invalid" }, 400)
}
