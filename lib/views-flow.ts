import { adminSessionOpen, readAdminCookie } from "@/lib/admin-gate"
import { accountStore } from "@/lib/account-kv"
import { jsonReply, readJson, requestIp, takeIpSlot } from "@/lib/account-route"
import { emptyBook, listingsKey, parseBook } from "@/lib/listings"
import { sha256Hex } from "@/lib/mail-policy"
import { memberEmail, publicAccount, readMemberCookie } from "@/lib/member-session"
import { reportDay, shiftDay } from "@/lib/stats"
import {
  catalogSubject,
  guardAllows,
  indexBoard,
  markGuard,
  noteShare,
  noteView,
  parseGuard,
  parseIndex,
  parseViewBook,
  publicViews,
  putIndex,
  skipViewAgent,
  viewBookKey,
  viewCookie,
  viewGuardKey,
  viewIndexKey,
  viewReport,
  viewSource,
  type ViewSubject,
} from "@/lib/views"

const dayPattern = /^\d{4}-\d{2}-\d{2}$/

function reply(body: unknown, status = 200, cookie = "") {
  const headers = new Headers({ "cache-control": "no-store" })
  if (cookie) headers.set("set-cookie", cookie)
  return Response.json(body, { status, headers })
}

function readCookie(header: string | null, name: string) {
  if (!header) return ""
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=")
    if (key === name) return decodeURIComponent(rest.join("="))
  }
  return ""
}

function freshToken() {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function cookieLine(token: string, secure: boolean) {
  const parts = [`${viewCookie}=${encodeURIComponent(token)}`, "HttpOnly", "Path=/", "Max-Age=34560000", "SameSite=Lax"]
  if (secure) parts.push("Secure")
  return parts.join("; ")
}

function prefetch(request: Request) {
  const purpose = `${request.headers.get("sec-purpose") || ""} ${request.headers.get("purpose") || ""} ${request.headers.get("x-purpose") || ""} ${request.headers.get("x-moz") || ""}`.toLowerCase()
  return purpose.includes("prefetch") || request.headers.get("next-router-prefetch") === "1"
}

async function actor(store: NonNullable<Awaited<ReturnType<typeof accountStore>>>, request: Request) {
  if (await adminSessionOpen(store, readAdminCookie(request.headers.get("cookie")))) return { kind: "admin" as const }
  const email = await memberEmail(store, readMemberCookie(request.headers.get("cookie")))
  if (!email) return null
  const account = await publicAccount(store, email)
  if (!account) return null
  return { kind: "member" as const, account }
}

async function subjectOf(store: NonNullable<Awaited<ReturnType<typeof accountStore>>>, slug: string): Promise<ViewSubject | null> {
  const clean = slug.trim().toLowerCase()
  if (!/^[a-z0-9-]{2,80}$/.test(clean)) return null
  const raw = await store.get(listingsKey)
  const book = raw === null ? emptyBook() : parseBook(raw)
  const listing = book?.listings.find((item) => item.slug === clean)
  if (listing) return { id: listing.id, slug: listing.slug, name: listing.name, ownerAccountId: listing.ownerAccountId, hidden: listing.hidden }
  return catalogSubject(clean)
}

async function bundle(store: NonNullable<Awaited<ReturnType<typeof accountStore>>>, subject: ViewSubject, day: string) {
  const rawBook = await store.get(viewBookKey(subject.id))
  const book = parseViewBook(rawBook, subject)
  const index = parseIndex(await store.get(viewIndexKey))
  const guard = parseGuard(await store.get(viewGuardKey), day)
  return { rawBook, book, index, guard }
}

export async function gorunumGetFlow(request: Request, now = Date.now()) {
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  const url = new URL(request.url)
  const today = reportDay(now)
  if (url.searchParams.get("liste") === "1") {
    const who = await actor(store, request)
    if (who?.kind !== "admin") return jsonReply({ ok: false, reason: who ? "yetki" : "oturum" }, who ? 403 : 401)
    let from = url.searchParams.get("from") || shiftDay(today, -29)
    let to = url.searchParams.get("to") || today
    if (!dayPattern.test(from) || !dayPattern.test(to)) return jsonReply({ ok: false, reason: "invalid" }, 400)
    if (from > to) [from, to] = [to, from]
    const index = parseIndex(await store.get(viewIndexKey))
    if (!index) return jsonReply({ ok: false, reason: "bozuk" }, 500)
    return jsonReply({ ok: true, today, from, to, rows: indexBoard(index, from, to) })
  }
  const slug = url.searchParams.get("slug") || ""
  const subject = await subjectOf(store, slug)
  if (!subject || subject.hidden) return jsonReply({ ok: false, reason: "yok" }, 404)
  const loaded = await bundle(store, subject, today)
  if (!loaded.book) return jsonReply({ ok: false, reason: "bozuk" }, 500)
  if (url.searchParams.get("rapor") === "1") {
    const who = await actor(store, request)
    if (!who) return jsonReply({ ok: false, reason: "oturum" }, 401)
    const owner = who.kind === "member" && who.account.role === "isletme" && who.account.id === subject.ownerAccountId
    if (who.kind !== "admin" && !owner) return jsonReply({ ok: false, reason: "yetki" }, 403)
    const from = url.searchParams.get("from") || shiftDay(today, -29)
    const to = url.searchParams.get("to") || today
    if (!dayPattern.test(from) || !dayPattern.test(to)) return jsonReply({ ok: false, reason: "invalid" }, 400)
    const report = viewReport(loaded.book, from, to, now)
    if (!report) return jsonReply({ ok: false, reason: "invalid" }, 400)
    return jsonReply({ ok: true, report })
  }
  return jsonReply({ ok: true, ...publicViews(loaded.book, now) })
}

export async function gorunumPostFlow(request: Request, now = Date.now()) {
  const secure = new URL(request.url).protocol === "https:"
  const body = await readJson(request, 600)
  if (!body) return jsonReply({ ok: false, reason: "invalid" }, 400)
  const slug = typeof body.slug === "string" ? body.slug : ""
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  const subject = await subjectOf(store, slug)
  if (!subject || subject.hidden) return jsonReply({ ok: false, reason: "yok" }, 404)
  const today = reportDay(now)
  const loaded = await bundle(store, subject, today)
  if (!loaded.book || !loaded.index || !loaded.guard) return jsonReply({ ok: false, reason: "bozuk" }, 500)
  const quiet = prefetch(request) || skipViewAgent(request.headers.get("user-agent"))
  const share = body.op === "paylas"
  const limited = !(await takeIpSlot(requestIp(request), share ? "paylas" : "gorunum", now, share ? 12 : 8, 60_000))
  const who = await actor(store, request)
  const owner = who?.kind === "member" && who.account.id === subject.ownerAccountId
  const skipCount = quiet || limited || who?.kind === "admin" || (!share && Boolean(owner))
  let token = readCookie(request.headers.get("cookie"), viewCookie).toLowerCase()
  const fresh = !/^[a-f0-9]{24}$/.test(token)
  if (fresh) token = freshToken()
  const hash = (await sha256Hex(token)).slice(0, 16)
  const current = { ...loaded.book, slug: subject.slug, name: subject.name.slice(0, 80) }
  if (skipCount || !guardAllows(loaded.guard, hash)) {
    return reply({ ok: true, counted: false, shares: current.shares, ...publicViews(current, now) }, 200, fresh && !quiet ? cookieLine(token, secure) : "")
  }
  if (share) {
    const noted = noteShare(current, { at: now, hash })
    if (noted.counted) {
      await store.put(viewBookKey(subject.id), JSON.stringify(noted.book))
      await store.put(viewIndexKey, JSON.stringify(putIndex(loaded.index, noted.book, today)))
      await store.put(viewGuardKey, JSON.stringify(markGuard(loaded.guard, hash)))
    }
    return reply({ ok: true, counted: noted.counted, shares: noted.book.shares, ...publicViews(noted.book, now) }, 200, fresh ? cookieLine(token, secure) : "")
  }
  const source = viewSource({
    search: typeof body.search === "string" ? body.search : "",
    from: typeof body.from === "string" ? body.from : "",
    businessId: subject.id,
  })
  const noted = noteView(current, { at: now, hash, source })
  if (noted.counted) {
    await store.put(viewBookKey(subject.id), JSON.stringify(noted.book))
    await store.put(viewIndexKey, JSON.stringify(putIndex(loaded.index, noted.book, today)))
    await store.put(viewGuardKey, JSON.stringify(markGuard(loaded.guard, hash)))
  }
  return reply({ ok: true, counted: noted.counted, shares: noted.book.shares, ...publicViews(noted.book, now) }, 200, fresh ? cookieLine(token, secure) : "")
}
