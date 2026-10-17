import type { AccountStore } from "@/lib/account-record"
import { accountStore } from "@/lib/account-kv"
import { jsonReply, readJson, requestIp, takeIpSlot } from "@/lib/account-route"
import { adminSessionOpen, readAdminCookie } from "@/lib/admin-gate"
import { allBusinesses } from "@/lib/catalog"
import { listingsKey, parseBook, toBusiness, type StoredListing } from "@/lib/listings"
import {
  activeNodes,
  applyRemap,
  applyTaxonomyOp,
  buildTaxonomy,
  emptyTaxonomyState,
  migrationReport,
  parseTaxonomyState,
  publicNode,
  readNodePatch,
  taxonomyKey,
  type TaxonomyNode,
  type TaxonomyOp,
  type TaxonomyState,
} from "@/lib/taxonomy"

export async function readTaxonomy(store: AccountStore): Promise<{ state: TaxonomyState; nodes: TaxonomyNode[] }> {
  const state = parseTaxonomyState(await store.get(taxonomyKey)) ?? emptyTaxonomyState()
  return { state, nodes: buildTaxonomy(state) }
}

async function readListings(store: AccountStore): Promise<StoredListing[]> {
  const book = parseBook(await store.get(listingsKey))
  return book?.listings ?? []
}

async function isAdmin(store: AccountStore, request: Request) {
  return adminSessionOpen(store, readAdminCookie(request.headers.get("cookie")))
}

/**
 * GET /api/sektor — visitors receive the active tree and the redirect map; an admin session also
 * gets the raw state, passive nodes, the migration report and the audit log.
 */
export async function sektorGetFlow(request: Request) {
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  const { state, nodes } = await readTaxonomy(store)
  const admin = await isAdmin(store, request)
  if (!admin) {
    return jsonReply({ ok: true, nodes: activeNodes(nodes).map(publicNode), remap: state.remap })
  }
  const listings = await readListings(store)
  const businesses = allBusinesses(listings.map(toBusiness))
  return jsonReply({
    ok: true,
    admin: true,
    nodes,
    remap: state.remap,
    log: state.log,
    report: migrationReport(nodes, businesses),
    counts: Object.fromEntries(nodes.map((node) => [node.id, businesses.filter((item) => item.category === node.id || item.categories?.includes(node.id)).length])),
  })
}

function readOp(body: Record<string, unknown>): TaxonomyOp | null {
  const id = typeof body.id === "string" ? body.id : ""
  if (body.op === "upsert") return { op: "upsert", id: id || undefined, node: body.node }
  if (body.op === "durum" && id && (body.status === "aktif" || body.status === "pasif")) return { op: "durum", id, status: body.status }
  if (body.op === "sira" && Array.isArray(body.ids)) return { op: "sira", ids: body.ids.filter((item): item is string => typeof item === "string") }
  if (body.op === "sil" && id && (body.mode === "sil" || body.mode === "pasif" || body.mode === "aktar")) {
    return { op: "sil", id, mode: body.mode, targetId: typeof body.targetId === "string" ? body.targetId : undefined }
  }
  return null
}

/** POST /api/sektor — admin-only tree edits; `yerel-aktar` bulk-imports legacy browser sectors. */
export async function sektorPostFlow(request: Request, now = Date.now()) {
  const body = await readJson(request, 400_000)
  if (!body || typeof body.op !== "string") return jsonReply({ ok: false, reason: "invalid" }, 400)
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  if (!(await isAdmin(store, request))) return jsonReply({ ok: false, reason: "yetki" }, 401)
  if (!(await takeIpSlot(requestIp(request), "sektor", now, 120, 10 * 60 * 1000))) return jsonReply({ ok: false, reason: "limited" }, 429)
  const { state } = await readTaxonomy(store)
  const listings = await readListings(store)
  const businesses = allBusinesses(listings.map(toBusiness))
  const context = { now, by: "yonetici", businesses }

  if (body.op === "yerel-aktar") {
    if (!Array.isArray(body.sectors)) return jsonReply({ ok: false, reason: "invalid" }, 400)
    let next = state
    let added = 0
    const existing = new Set(buildTaxonomy(state).map((item) => item.id))
    for (const raw of body.sectors.slice(0, 50)) {
      const patch = readNodePatch(raw)
      if (!patch.label) continue
      const wanted = raw && typeof raw === "object" && typeof (raw as { id?: unknown }).id === "string" ? (raw as { id: string }).id : ""
      if (wanted && existing.has(wanted)) continue
      const result = applyTaxonomyOp(next, { op: "upsert", node: { ...patch, parentId: null } }, context)
      if (!result.ok) continue
      next = result.state
      existing.add(result.id)
      added += 1
    }
    if (added) await store.put(taxonomyKey, JSON.stringify(next))
    return jsonReply({ ok: true, added, nodes: buildTaxonomy(next), log: next.log })
  }

  const op = readOp(body)
  if (!op) return jsonReply({ ok: false, reason: "invalid" }, 400)
  const result = applyTaxonomyOp(state, op, context)
  if (!result.ok) return jsonReply({ ok: false, reason: result.reason, deps: result.deps }, result.reason === "bagli" || result.reason === "seed" ? 409 : 400)
  await store.put(taxonomyKey, JSON.stringify(result.state))
  let moved = 0
  if (result.moved) {
    const remap = Object.fromEntries(result.moved.from.map((from) => [from, result.moved?.to as string]))
    const next = listings.map((item) => applyRemap(item, remap))
    moved = next.filter((item, index) => item !== listings[index]).length
    if (moved) await store.put(listingsKey, JSON.stringify({ listings: next }))
  }
  return jsonReply({
    ok: true,
    id: result.id,
    nodes: result.nodes,
    remap: result.state.remap,
    log: result.state.log,
    moved,
    report: migrationReport(result.nodes, allBusinesses(result.moved ? (await readListings(store)).map(toBusiness) : listings.map(toBusiness))),
  })
}
