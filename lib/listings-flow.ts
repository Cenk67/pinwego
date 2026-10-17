import { adminSessionOpen, readAdminCookie } from "@/lib/admin-gate"
import { accountStore } from "@/lib/account-kv"
import { jsonReply, readJson, requestIp, takeIpSlot } from "@/lib/account-route"
import { applyManual, bookFromHours, hoursFromBook, istanbulParts, storedBook } from "@/lib/hours"
import {
  classifyGrid,
  commitImport,
  gridFromBody,
  importLogKey,
  numberList,
  parseImportLog,
  publishChoice,
  readMap,
  suggestMap,
  withImportNote,
} from "@/lib/listings-import"
import { listingGalleryKey, parseGalleryBook, storedCover, storedGallery } from "@/lib/listing-media"
import { acceptListing, applyClassification, applyFlags, emptyBook, listingsKey, parseBook, toBusiness, type ListingBook, type StoredListing } from "@/lib/listings"
import { memberEmail, publicAccount, readMemberCookie } from "@/lib/member-session"
import { activeNodes, setLiveTaxonomy } from "@/lib/taxonomy"
import { readTaxonomy } from "@/lib/taxonomy-flow"

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

/** Members may only pick visible sectors; admins may also file records under passive ones. */
function validSectorIds(nodes: Parameters<typeof activeNodes>[0], admin: boolean) {
  return new Set((admin ? nodes : activeNodes(nodes)).map((item) => item.id))
}

function shownListing(item: StoredListing, admin: boolean) {
  const listing = toBusiness(item)
  return admin ? { ...listing, hourLog: item.hourLog ?? [], review: item.review } : listing
}

function present(book: ListingBook, admin: boolean, imports: ReturnType<typeof parseImportLog> = []) {
  const rows = admin ? book.listings : book.listings.filter((item) => !item.hidden)
  return {
    ok: true,
    listings: rows.map((item) => shownListing(item, admin)),
    hiddenIds: admin ? book.listings.filter((item) => item.hidden).map((item) => item.id) : [],
    imports: admin ? imports : [],
  }
}

export async function ilanGetFlow(request: Request) {
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  const book = await readBook(store)
  if (!book) return jsonReply({ ok: false, reason: "bozuk" }, 500)
  const who = await actor(store, request)
  const admin = who?.kind === "admin"
  const asked = new URL(request.url).searchParams.get("galeri")
  if (asked) {
    const current = book.listings.find((item) => item.id === asked || item.slug === asked)
    if (!current) return jsonReply({ ok: false, reason: "yok" }, 404)
    const owner = who?.kind === "member" && who.account.role === "isletme" && who.account.id === current.ownerAccountId
    if (current.hidden && !admin && !owner) return jsonReply({ ok: false, reason: "yok" }, 404)
    return jsonReply({
      ok: true,
      id: current.id,
      photo: current.photo,
      gallery: parseGalleryBook(await store.get(listingGalleryKey(current.id))),
    })
  }
  const imports = admin ? parseImportLog(await store.get(importLogKey)) : []
  return jsonReply(present(book, admin, imports))
}

export async function ilanPostFlow(request: Request, now = Date.now()) {
  const body = await readJson(request, 2200000)
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
    const tree = await readTaxonomy(store)
    const saved = acceptListing(body, ownerId, new Date(now).toISOString(), book, who.kind === "admin", validSectorIds(tree.nodes, who.kind === "admin"))
    if (!saved.ok) return jsonReply({ ok: false, reason: saved.reason })
    await store.put(listingsKey, JSON.stringify(saved.book))
    return jsonReply({ ok: true, listing: toBusiness(saved.listing) })
  }
  if (body.op === "onizle" || body.op === "toplu") {
    if (who.kind !== "admin") return jsonReply({ ok: false, reason: "yetki" }, 403)
    const started = Date.now()
    const preview = body.op === "onizle"
    if (!(await takeIpSlot(requestIp(request), preview ? "ilan-onizle" : "ilan-toplu", now, preview ? 60 : 30, 15 * 60 * 1000))) {
      return jsonReply({ ok: false, reason: "limited" })
    }
    const loaded = await gridFromBody(body)
    if ("error" in loaded) return jsonReply({ ok: false, reason: loaded.error }, 400)
    setLiveTaxonomy((await readTaxonomy(store)).nodes)
    const map = readMap(body.map, loaded.grid.headers.length) ?? suggestMap(loaded.grid.headers)
    if (preview) return jsonReply({ ok: true, ...classifyGrid(loaded.grid, map, book) })
    if (body.confirm !== true) return jsonReply({ ok: false, reason: "onay" }, 400)
    const saved = commitImport(loaded.grid, map, book, new Date(now).toISOString(), {
      updates: numberList(body.updates),
      force: numberList(body.force),
      publish: publishChoice(body.publish),
    })
    if (saved.added || saved.updated) await store.put(listingsKey, JSON.stringify(saved.book))
    const note = {
      id: `aktar-${now}`,
      at: new Date(now).toISOString(),
      total: saved.preview.total,
      added: saved.added,
      updated: saved.updated,
      held: saved.held,
      same: saved.preview.counts.zaten,
      faults: saved.preview.counts.hata,
      ms: Math.max(0, Date.now() - started),
      actor: "yonetici",
    }
    await store.put(importLogKey, withImportNote(await store.get(importLogKey), note))
    return jsonReply({
      ok: true,
      ...note,
      listings: saved.listings.map((item) => shownListing(item, true)),
      report: saved.preview.report,
      counts: saved.preview.counts,
    })
  }
  const id = typeof body.id === "string" ? body.id : ""
  const current = book.listings.find((item) => item.id === id || item.slug === id)
  if (body.op === "gorsel") {
    if (!current) return jsonReply({ ok: false, reason: "yok" }, 404)
    const allowed = who.kind === "admin" || (who.kind === "member" && who.account.role === "isletme" && who.account.id === current.ownerAccountId)
    if (!allowed) return jsonReply({ ok: false, reason: "yetki" }, 403)
    if (!(await takeIpSlot(requestIp(request), "ilan-gorsel", now, 30, 15 * 60 * 1000))) return jsonReply({ ok: false, reason: "limited" })
    const photo = storedCover(body.photo)
    if (!photo) return jsonReply({ ok: false, reason: "kapak" }, 400)
    if (!Array.isArray(body.gallery)) return jsonReply({ ok: false, reason: "gorsel" }, 400)
    const gallery = storedGallery(body.gallery)
    if (body.gallery.length > 0 && gallery.length === 0) return jsonReply({ ok: false, reason: "gorsel" }, 400)
    const listing = { ...current, photo }
    const listings = book.listings.map((item) => (item.id === current.id ? listing : item))
    await store.put(listingsKey, JSON.stringify({ listings }))
    await store.put(listingGalleryKey(current.id), JSON.stringify({ gallery }))
    const shown = toBusiness(listing)
    return jsonReply({ ok: true, listing: who.kind === "admin" ? { ...shown, hourLog: listing.hourLog ?? [], review: listing.review } : shown, gallery })
  }
  if (body.op === "sinif") {
    if (!current) return jsonReply({ ok: false, reason: "yok" }, 404)
    const allowed = who.kind === "admin" || (who.kind === "member" && who.account.role === "isletme" && who.account.id === current.ownerAccountId)
    if (!allowed) return jsonReply({ ok: false, reason: "yetki" }, 403)
    if (!(await takeIpSlot(requestIp(request), "ilan-sinif", now, 60, 15 * 60 * 1000))) return jsonReply({ ok: false, reason: "limited" })
    const tree = await readTaxonomy(store)
    const listing = applyClassification(current, body, who.kind === "admin", validSectorIds(tree.nodes, who.kind === "admin"))
    if (!listing) return jsonReply({ ok: false, reason: "kategori" }, 400)
    const listings = book.listings.map((item) => (item.id === current.id ? listing : item))
    await store.put(listingsKey, JSON.stringify({ listings }))
    return jsonReply({ ok: true, listing: shownListing(listing, who.kind === "admin") })
  }
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
    await store.delete(listingGalleryKey(current.id))
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
