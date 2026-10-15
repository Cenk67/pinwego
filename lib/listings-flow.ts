import { adminSessionOpen, readAdminCookie } from "@/lib/admin-gate"
import { accountStore } from "@/lib/account-kv"
import { jsonReply, readJson, requestIp, takeIpSlot } from "@/lib/account-route"
import { applyManual, bookFromHours, hoursFromBook, istanbulParts, storedBook } from "@/lib/hours"
import { acceptSheet, parseListingSheet, sheetByteCap } from "@/lib/listings-import"
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
    listings: rows.map((item) => {
      const listing = toBusiness(item)
      return admin ? { ...listing, hourLog: item.hourLog ?? [] } : listing
    }),
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
  const body = await readJson(request, 180000)
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
  if (body.op === "toplu") {
    if (who.kind !== "admin") return jsonReply({ ok: false, reason: "yetki" }, 403)
    if (!(await takeIpSlot(requestIp(request), "ilan-toplu", now, 8, 15 * 60 * 1000))) return jsonReply({ ok: false, reason: "limited" })
    const text = typeof body.text === "string" ? body.text : ""
    if (!text.trim() || text.length > sheetByteCap) return jsonReply({ ok: false, reason: "invalid" }, 400)
    const parsed = parseListingSheet(text)
    if (!parsed.rows.length) return jsonReply({ ok: false, reason: "invalid", faults: parsed.faults }, 400)
    const saved = acceptSheet(parsed.rows, book, new Date(now).toISOString())
    const faults = [...parsed.faults, ...saved.faults]
    if (!saved.added && !saved.updated) return jsonReply({ ok: false, reason: "invalid", faults }, 400)
    await store.put(listingsKey, JSON.stringify(saved.book))
    return jsonReply({ ok: true, added: saved.added, updated: saved.updated, faults, listings: saved.listings.map((item) => toBusiness(item)) })
  }
  const id = typeof body.id === "string" ? body.id : ""
  const current = book.listings.find((item) => item.id === id || item.slug === id)
  if (body.op === "saat" || body.op === "durum") {
    if (!current) return jsonReply({ ok: false, reason: "yok" }, 404)
    const allowed = who.kind === "admin" || (who.kind === "member" && who.account.role === "isletme" && who.account.id === current.ownerAccountId)
    if (!allowed) return jsonReply({ ok: false, reason: "yetki" }, 403)
    const base = current.hourBook ?? bookFromHours(current.hours)
    const actor = who.kind === "admin" ? "yonetici" : who.account.id
    let next = base
    let action = "program"
    if (body.op === "saat") {
      const parsed = storedBook({ week: body.week, specials: body.specials ?? [], manual: base.manual })
      if (!parsed) return jsonReply({ ok: false, reason: "invalid" }, 400)
      next = parsed
    } else {
      const mode = body.mode === "open" || body.mode === "closed" || body.mode === "auto" ? body.mode : ""
      const span = body.span === "today" || body.span === "until" || body.span === "2h" ? body.span : "2h"
      if (!mode) return jsonReply({ ok: false, reason: "invalid" }, 400)
      const applied = applyManual(base, { mode, span, until: typeof body.until === "string" ? body.until : "" }, now, actor)
      if (!applied) {
        const holiday = base.specials.some((item) => item.date === istanbulParts(now).date && item.closed)
        return jsonReply({ ok: false, reason: holiday && mode === "open" ? "tatil" : "sure" }, 400)
      }
      next = applied
      action = mode === "auto" ? "otomatik" : mode === "open" ? "manuel-acik" : "manuel-kapali"
    }
    const hourLog = [{ at: new Date(now).toISOString(), by: actor, action }, ...(current.hourLog ?? [])].slice(0, 8)
    const listing = { ...current, hourBook: next, hours: hoursFromBook(next), hourLog }
    const listings = book.listings.map((item) => (item.id === current.id ? listing : item))
    await store.put(listingsKey, JSON.stringify({ listings }))
    const shown = toBusiness(listing)
    return jsonReply({ ok: true, listing: who.kind === "admin" ? { ...shown, hourLog } : shown })
  }
  if (who.kind !== "admin") return jsonReply({ ok: false, reason: "yetki" }, 403)
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
