import assert from "node:assert/strict"
import { accountStore } from "./account-kv"
import { openAdminSession } from "./admin-gate"
import { ilanGetFlow, ilanPostFlow } from "./listings-flow"
import { sektorGetFlow, sektorPostFlow } from "./taxonomy-flow"
import type { MigrationReport, TaxonomyNode } from "./taxonomy"

const holder = globalThis as typeof globalThis & { __pinwegoAccounts?: Map<string, unknown> }
holder.__pinwegoAccounts = new Map()

const now = Date.parse("2026-10-16T09:00:00Z")

function call(path: string, body?: unknown, extra: Record<string, string> = {}) {
  return new Request(`http://127.0.0.1:43123${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      origin: "http://127.0.0.1:43123",
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0",
      "cf-connecting-ip": extra.ip ?? "203.0.113.10",
      ...(extra.cookie ? { cookie: extra.cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const store = await accountStore()
assert.ok(store)

// Visitors get the active seeded tree with no admin bookkeeping.
let response = await sektorGetFlow(call("/api/sektor"))
assert.equal(response.status, 200)
let payload = (await response.json()) as { ok: boolean; nodes: TaxonomyNode[]; admin?: boolean; log?: unknown }
assert.equal(payload.ok, true)
assert.equal(payload.admin, undefined)
assert.equal(payload.log, undefined)
assert.ok(payload.nodes.some((node) => node.id === "usta" && node.parentId === null))
assert.ok(payload.nodes.some((node) => node.id === "usta-tesisatci" && node.parentId === "usta"))
assert.equal("updatedAt" in payload.nodes[0], false)

// Writes need an admin session.
assert.equal((await sektorPostFlow(call("/api/sektor", { op: "upsert", node: { label: "Deneme" } }), now)).status, 401)
const token = await openAdminSession(store)
const cookie = `pinwego_admin=${encodeURIComponent(token)}`

// Admin: add a custom root and a sub-sector; the response carries the rebuilt tree and the log.
response = await sektorPostFlow(call("/api/sektor", { op: "upsert", node: { label: "Bisiklet tamiri", phrases: ["bisiklet"] } }, { cookie }), now)
assert.equal(response.status, 200)
let saved = (await response.json()) as { ok: boolean; id: string; nodes: TaxonomyNode[]; log: { action: string }[] }
assert.equal(saved.id, "bisiklet-tamiri")
assert.equal(saved.log[0].action, "ekle")
response = await sektorPostFlow(call("/api/sektor", { op: "upsert", node: { label: "Şarj istasyonu", parentId: "oto", photo: "data:image/webp;base64,AAAA" } }, { cookie }), now)
saved = await response.json()
assert.equal(saved.id, "oto-sarj-istasyonu")
assert.equal(saved.nodes.find((n) => n.id === "oto-sarj-istasyonu")?.photo, "data:image/webp;base64,AAAA")

// Members may only file listings under known sectors; sub-sector ids and kinds are stored.
const member = await openMember()
response = await ilanPostFlow(call("/api/ilan", listingBody({ category: "yok-boyle" }), { cookie: member }), now)
assert.deepEqual(await response.json(), { ok: false, reason: "kategori" })
response = await ilanPostFlow(call("/api/ilan", listingBody({ category: "oto", categories: ["oto-sarj-istasyonu", "hayali"], orgKind: "kamu", orgVerified: true, providerKind: "usta" }), { cookie: member }), now)
let listing = ((await response.json()) as { listing: { id: string; categories?: string[]; orgKind?: string; orgVerified?: boolean; providerKind?: string } }).listing
assert.deepEqual(listing.categories, ["oto-sarj-istasyonu"])
assert.equal(listing.orgKind, "kamu")
assert.equal(listing.orgVerified, undefined, "a member cannot self-verify a public claim")
assert.equal(listing.providerKind, "usta")

// The owner reclassifies; only the admin confirms the public status.
response = await ilanPostFlow(call("/api/ilan", { op: "sinif", id: listing.id, providerKind: "isletme", orgVerified: true }, { cookie: member }), now)
listing = ((await response.json()) as { listing: typeof listing }).listing
assert.equal(listing.providerKind, "isletme")
assert.equal(listing.orgVerified, undefined)
response = await ilanPostFlow(call("/api/ilan", { op: "sinif", id: listing.id, orgVerified: true }, { cookie }), now)
listing = ((await response.json()) as { listing: typeof listing }).listing
assert.equal(listing.orgVerified, true)
response = await ilanPostFlow(call("/api/ilan", { op: "sinif", id: listing.id, orgKind: "ozel" }, { cookie: member }), now)
listing = ((await response.json()) as { listing: typeof listing }).listing
assert.equal(listing.orgKind, "ozel")
assert.equal(listing.orgVerified, undefined, "changing the kind drops the confirmation")
assert.equal((await ilanPostFlow(call("/api/ilan", { op: "sinif", id: listing.id, category: "hayali" }, { cookie }), now)).status, 400)

// Admin GET carries the report; the listing shows up under its sub-sector count.
response = await sektorGetFlow(call("/api/sektor", undefined, { cookie }))
let adminView = (await response.json()) as { admin: boolean; report: MigrationReport; counts: Record<string, number>; log: unknown[] }
assert.equal(adminView.admin, true)
assert.equal(adminView.counts["oto-sarj-istasyonu"], 1)
assert.ok(adminView.report.total > 150)
assert.ok(adminView.log.length >= 2)

// Delete modes: a linked node refuses a hard delete with the dependency counts (409).
response = await sektorPostFlow(call("/api/sektor", { op: "sil", id: "oto-sarj-istasyonu", mode: "sil" }, { cookie }), now)
assert.equal(response.status, 409)
let refused = (await response.json()) as { reason: string; deps: { businesses: number; listings: number } }
assert.equal(refused.reason, "bagli")
assert.equal(refused.deps.listings, 1)
response = await sektorPostFlow(call("/api/sektor", { op: "sil", id: "oto", mode: "sil" }, { cookie }), now)
assert.equal(response.status, 409)
refused = await response.json()
assert.equal(refused.reason, "seed")

// Transfer moves the stored listing to the target and records a redirect.
response = await sektorPostFlow(call("/api/sektor", { op: "sil", id: "oto-sarj-istasyonu", mode: "aktar", targetId: "enerji" }, { cookie }), now)
assert.equal(response.status, 200)
const moved = (await response.json()) as { moved: number; remap: Record<string, string>; nodes: TaxonomyNode[] }
assert.equal(moved.moved, 1)
assert.equal(moved.remap["oto-sarj-istasyonu"], "enerji")
assert.equal(moved.nodes.some((n) => n.id === "oto-sarj-istasyonu"), false, "a custom node disappears after transfer")
const after = (await (await ilanGetFlow(call("/api/ilan", undefined, { cookie }))).json()) as { listings: { id: string; categories?: string[] }[] }
assert.deepEqual(after.listings.find((item) => item.id === listing.id)?.categories, ["enerji"])

// Legacy browser sectors are imported once; duplicates by id are skipped.
response = await sektorPostFlow(
  call("/api/sektor", { op: "yerel-aktar", sectors: [{ id: "bisiklet-tamiri", label: "Bisiklet tamiri" }, { id: "drone", label: "Drone çekimi", phrases: ["drone"] }, { label: "x" }] }, { cookie }),
  now,
)
const imported = (await response.json()) as { added: number; nodes: TaxonomyNode[] }
assert.equal(imported.added, 1)
assert.ok(imported.nodes.some((n) => n.id === "drone-cekimi" && n.custom))

// Passive nodes vanish from the public tree but stay for the admin.
await sektorPostFlow(call("/api/sektor", { op: "durum", id: "bisiklet-tamiri", status: "pasif" }, { cookie }), now)
payload = await (await sektorGetFlow(call("/api/sektor"))).json()
assert.equal(payload.nodes.some((n) => n.id === "bisiklet-tamiri"), false)
adminView = await (await sektorGetFlow(call("/api/sektor", undefined, { cookie }))).json()
assert.ok((adminView as unknown as { nodes: TaxonomyNode[] }).nodes.some((n) => n.id === "bisiklet-tamiri" && n.status === "pasif"))

// Garbage is rejected.
assert.equal((await sektorPostFlow(call("/api/sektor", { op: "tuhaf" }, { cookie }), now)).status, 400)
assert.equal((await sektorPostFlow(call("/api/sektor", { op: "durum", id: "usta", status: "gizli" }, { cookie }), now)).status, 400)

console.log("taxonomy flow ok")

async function openMember() {
  const { registerInStore } = await import("./account-record")
  const { loginFlow } = await import("./account-flow")
  const body = {
    role: "isletme",
    email: "usta@pinwego.test",
    password: "sifre1234",
    name: "Usta Hesap",
    phone: "05551234567",
    business: { owner: "Usta Yilmaz", taxId: "0100000007", taxOffice: "Merkez", city: "İstanbul", address: "Uzun cadde 12" },
  }
  assert.equal((await registerInStore(store as NonNullable<typeof store>, body)).ok, true)
  const signed = await loginFlow(call("/api/giris", { email: body.email, password: body.password }))
  return (signed.headers.get("set-cookie") ?? "").split(";")[0] ?? ""
}

function listingBody(extra: Record<string, unknown>) {
  return {
    op: "create",
    name: "Şarj Noktası Kadıköy",
    district: "Kadıköy",
    city: "İstanbul",
    summary: "Elektrikli araç şarj istasyonu kurulumu ve bakımı.",
    phone: "0532 000 00 00",
    lat: 40.99,
    lng: 29.03,
    ...extra,
  }
}
