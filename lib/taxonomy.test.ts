import assert from "node:assert/strict"
import { seedSectors } from "./sectors"
import {
  applyRemap,
  applyTaxonomyOp,
  buildTaxonomy,
  businessInNode,
  businessLeaf,
  childrenOf,
  emptyTaxonomyState,
  isActive,
  letterGroups,
  letterOf,
  matchNodeByText,
  migrationReport,
  nodeDependencies,
  parseTaxonomyState,
  pathOf,
  readNodePatch,
  resolveNodeId,
  rootsOf,
  seedTaxonomy,
  sortTr,
  type TaxonomyState,
} from "./taxonomy"

const now = Date.UTC(2026, 9, 16, 12)
const ctx = (businesses: { category: string; categories?: string[]; subcategory: string; source: "katalog" | "senin" | "google" }[] = []) => ({
  now,
  by: "yonetici",
  businesses,
})

// Seeds: every code sector is a root with its id untouched; starter sub-sectors hang below.
const seeds = seedTaxonomy()
assert.equal(rootsOf(seeds).length, seedSectors.length)
assert.ok(seedSectors.every((sector) => seeds.some((node) => node.id === sector.id && node.parentId === null)))
assert.ok(childrenOf(seeds, "usta").some((node) => node.label === "Tesisatçı" && node.id === "usta-tesisatci"))
assert.deepEqual(
  pathOf(seeds, "usta-tesisatci").map((node) => node.id),
  ["usta", "usta-tesisatci"],
)
assert.equal(new Set(seeds.map((node) => node.id)).size, seeds.length, "node ids are unique")

// Empty state reproduces the seeds; a broken blob is rejected, not silently emptied.
assert.deepEqual(buildTaxonomy(emptyTaxonomyState()).map((n) => n.id), seeds.map((n) => n.id))
assert.equal(parseTaxonomyState("{"), null)
assert.equal(parseTaxonomyState("[]"), null)
assert.deepEqual(parseTaxonomyState(null), emptyTaxonomyState())

// Patch sanitation.
const patch = readNodePatch({ label: "  Bisiklet   tamiri ", tint: "#ABCDEF", icon: "bad icon!", photo: "javascript:alert(1)", phrases: ["Jant", "jant", "Lastik"], order: 3.6, status: "gizli", seoTitle: "x".repeat(100) })
assert.equal(patch.label, "Bisiklet tamiri")
assert.equal(patch.tint, "#abcdef")
assert.equal(patch.icon, undefined)
assert.equal(patch.photo, undefined)
assert.deepEqual(patch.phrases, ["jant", "lastik"])
assert.equal(patch.order, 4)
assert.equal(patch.status, undefined)
assert.equal(patch.seoTitle?.length, 70)
assert.ok(readNodePatch({ photo: "data:image/webp;base64,AAAA" }).photo)
assert.equal(readNodePatch({ photo: "data:text/html;base64,AAAA" }).photo, undefined)

// Add a custom root, then a child under a seed; ids derive from labels, order appends.
let state: TaxonomyState = emptyTaxonomyState()
let result = applyTaxonomyOp(state, { op: "upsert", node: { label: "Bisiklet tamiri", phrases: ["bisiklet", "jant"] } }, ctx())
assert.ok(result.ok)
state = result.state
assert.equal(result.id, "bisiklet-tamiri")
assert.equal(result.nodes.find((n) => n.id === "bisiklet-tamiri")?.custom, true)
result = applyTaxonomyOp(state, { op: "upsert", node: { label: "Elektrikli bisiklet", parentId: "bisiklet-tamiri" } }, ctx())
assert.ok(result.ok)
state = result.state
assert.equal(result.id, "bisiklet-tamiri-elektrikli-bisiklet")
const childId = result.id
assert.equal(result.nodes.find((n) => n.id === childId)?.photo, "/photos/office.jpg", "child inherits the parent cover")
result = applyTaxonomyOp(state, { op: "upsert", node: { label: "Şarj istasyonu", parentId: "oto" } }, ctx())
assert.ok(result.ok)
state = result.state
const sarj = result.nodes.find((n) => n.id === "oto-sarj-istasyonu")
assert.ok(sarj)
assert.equal(sarj.photo, "/photos/repair.jpg")
assert.equal(sarj.order, childrenOf(seedTaxonomy(), "oto").length)

// Seed edits live in overrides; the seed id and the business link stay.
result = applyTaxonomyOp(state, { op: "upsert", id: "usta", node: { label: "Usta & teknik servis", seoTitle: "Usta bul" } }, ctx())
assert.ok(result.ok)
state = result.state
assert.equal(result.nodes.find((n) => n.id === "usta")?.label, "Usta & teknik servis")
assert.equal(state.overrides.usta?.seoTitle, "Usta bul")
assert.equal(state.nodes.some((n) => n.id === "usta"), false)

// Cycles and unknown parents are refused.
assert.equal(applyTaxonomyOp(state, { op: "upsert", id: "bisiklet-tamiri", node: { parentId: "bisiklet-tamiri-elektrikli-bisiklet" } }, ctx()).ok, false)
assert.equal((applyTaxonomyOp(state, { op: "upsert", id: "bisiklet-tamiri", node: { parentId: "bisiklet-tamiri-elektrikli-bisiklet" } }, ctx()) as { reason: string }).reason, "dongu")
assert.equal((applyTaxonomyOp(state, { op: "upsert", node: { label: "Yeni", parentId: "yok-boyle" } }, ctx()) as { reason: string }).reason, "yok")
// A corrupted stored cycle is cut when the tree is rebuilt.
const cyclic: TaxonomyState = {
  ...emptyTaxonomyState(),
  nodes: [
    { ...seedTaxonomy()[0], id: "a", label: "A", parentId: "b", seed: false, custom: true },
    { ...seedTaxonomy()[0], id: "b", label: "B", parentId: "a", seed: false, custom: true },
  ],
}
const cut = buildTaxonomy(cyclic)
assert.ok(cut.filter((n) => n.id === "a" || n.id === "b").some((n) => n.parentId === null))

// Status: a passive parent hides its whole subtree from visitors.
result = applyTaxonomyOp(state, { op: "durum", id: "bisiklet-tamiri", status: "pasif" }, ctx())
assert.ok(result.ok)
assert.equal(isActive(result.nodes, "bisiklet-tamiri-elektrikli-bisiklet"), false)
assert.equal(isActive(result.nodes, "usta-tesisatci"), true)

// Turkish collation and letter groups.
const sorted = sortTr([{ label: "Şarj" }, { label: "Çatı" }, { label: "Cam" }, { label: "İnşaat" }, { label: "Isıtma" }, { label: "Zemin" }, { label: "Özel" }, { label: "Otopark" }])
assert.deepEqual(sorted.map((n) => n.label), ["Cam", "Çatı", "Isıtma", "İnşaat", "Otopark", "Özel", "Şarj", "Zemin"])
assert.equal(letterOf("İnşaat"), "İ")
assert.equal(letterOf("ısıtma"), "I")
assert.equal(letterOf("3D baskı"), "#")
const groups = letterGroups(rootsOf(seeds))
assert.equal(groups[0].letter, "A")
assert.ok(groups.some((g) => g.letter === "Ç") && groups.some((g) => g.letter === "İ"))

// Business ↔ node bridge: explicit ids, descendants, and the free-text subcategory match.
const tesisatci = { category: "usta", subcategory: "Tesisatçı", source: "katalog" as const }
const klima = { category: "usta", subcategory: "Klima servisi", source: "katalog" as const }
const multi = { category: "ev", categories: ["usta-elektrikci"], subcategory: "Tadilat", source: "senin" as const }
assert.equal(businessInNode(seeds, tesisatci, "usta"), true)
assert.equal(businessInNode(seeds, tesisatci, "usta-tesisatci"), true)
assert.equal(businessInNode(seeds, klima, "usta-tesisatci"), false)
assert.equal(businessInNode(seeds, multi, "usta-elektrikci"), true)
assert.equal(businessInNode(seeds, multi, "usta"), true, "secondary id counts toward the root")
assert.equal(businessInNode(seeds, multi, "ev-tadilat"), true)
assert.equal(businessLeaf(seeds, tesisatci)?.id, "usta-tesisatci")
assert.equal(businessLeaf(seeds, multi)?.id, "usta-elektrikci")
assert.equal(businessLeaf(seeds, { category: "usta", subcategory: "Bilinmeyen", source: "katalog" }), null)

// Free-text matching for Excel imports: id, label, path syntax, ambiguity → null.
assert.equal(matchNodeByText(seeds, "usta")?.id, "usta")
assert.equal(matchNodeByText(seeds, "Usta & tamir")?.id, "usta")
assert.equal(matchNodeByText(seeds, "Tesisatçı")?.id, "usta-tesisatci")
assert.equal(matchNodeByText(seeds, "Usta & tamir > Tesisatçı")?.id, "usta-tesisatci")
assert.equal(matchNodeByText(seeds, "usta / klima servisi")?.id, "usta-klima-servisi")
assert.equal(matchNodeByText(seeds, "Elektronik")?.id, "usta-elektronik")
const twin = applyTaxonomyOp(emptyTaxonomyState(), { op: "upsert", node: { label: "Elektronik", parentId: "alisveris" } }, ctx())
assert.ok(twin.ok)
assert.equal(matchNodeByText(twin.nodes, "Elektronik"), null, "the same label under two roots is ambiguous")
assert.equal(matchNodeByText(twin.nodes, "Alışveriş > Elektronik")?.id, "alisveris-elektronik")
assert.equal(matchNodeByText(seeds, "alisveris > Elektronik mağaza")?.id, "alisveris-elektronik-magaza")
assert.equal(matchNodeByText(seeds, "yok böyle bir şey"), null)

// Dependencies and delete modes.
const linked = [tesisatci, klima, multi]
assert.deepEqual(nodeDependencies(seeds, "usta", linked), { children: childrenOf(seeds, "usta").length, businesses: 3, listings: 1 })
let seedDelete = applyTaxonomyOp(state, { op: "sil", id: "usta", mode: "sil" }, ctx(linked))
assert.equal(seedDelete.ok, false)
assert.equal((seedDelete as { reason: string }).reason, "seed")
seedDelete = applyTaxonomyOp(state, { op: "sil", id: "bisiklet-tamiri", mode: "sil" }, ctx([{ category: "bisiklet-tamiri", subcategory: "", source: "senin" }]))
assert.equal((seedDelete as { reason: string; deps?: { businesses: number } }).reason, "bagli")
assert.equal((seedDelete as { deps?: { businesses: number } }).deps?.businesses, 1)
// Leaf with nothing attached deletes outright.
result = applyTaxonomyOp(state, { op: "sil", id: "bisiklet-tamiri-elektrikli-bisiklet", mode: "sil" }, ctx())
assert.ok(result.ok)
assert.equal(result.nodes.some((n) => n.id === "bisiklet-tamiri-elektrikli-bisiklet"), false)
state = result.state
// Transfer: businesses follow via remap; the seed source turns passive instead of vanishing.
result = applyTaxonomyOp(state, { op: "sil", id: "hirdavat", mode: "aktar", targetId: "usta" }, ctx([{ category: "hirdavat", subcategory: "", source: "senin" }]))
assert.ok(result.ok)
assert.equal(result.state.remap.hirdavat, "usta")
assert.equal(result.nodes.find((n) => n.id === "hirdavat")?.status, "pasif")
assert.deepEqual(result.moved, { from: ["hirdavat"], to: "usta" })
assert.equal(applyRemap({ category: "hirdavat", subcategory: "" }, result.state.remap).category, "usta")
assert.equal(resolveNodeId(result.nodes, result.state.remap, "hirdavat"), "hirdavat", "the passive node still resolves for admin")
assert.equal(resolveNodeId(result.nodes, result.state.remap, "eski-id"), null)
assert.equal((applyTaxonomyOp(state, { op: "sil", id: "usta", mode: "aktar", targetId: "usta-tesisatci" }, ctx()) as { reason: string }).reason, "dongu")
assert.equal((applyTaxonomyOp(state, { op: "sil", id: "usta", mode: "aktar" }, ctx()) as { reason: string }).reason, "hedef")
// Aliases keep old links alive after a rename.
result = applyTaxonomyOp(state, { op: "upsert", id: "bisiklet-tamiri", node: { aliases: ["bisiklet"] } }, ctx())
assert.ok(result.ok)
assert.equal(resolveNodeId(result.nodes, {}, "bisiklet"), "bisiklet-tamiri")
state = result.state

// Reorder only touches siblings of the first id.
result = applyTaxonomyOp(state, { op: "sira", ids: ["usta-klima-servisi", "usta-tesisatci", "yeme-kafe"] }, ctx())
assert.ok(result.ok)
assert.equal(result.nodes.find((n) => n.id === "usta-klima-servisi")?.order, 0)
assert.equal(result.nodes.find((n) => n.id === "usta-tesisatci")?.order, 1)
assert.equal(result.nodes.find((n) => n.id === "yeme-kafe")?.order, childrenOf(seeds, "yeme").find((n) => n.id === "yeme-kafe")?.order)

// Log is written and capped; the state survives a JSON round trip.
assert.ok(state.log.length >= 5)
assert.equal(state.log[0].by, "yonetici")
const again = parseTaxonomyState(JSON.stringify(state))
assert.ok(again)
assert.deepEqual(buildTaxonomy(again).map((n) => n.id).sort(), buildTaxonomy(state).map((n) => n.id).sort())

// Migration report flags unknown categories, unmatched subcategory texts and unverified public claims.
const report = migrationReport(seeds, [
  tesisatci,
  { category: "usta", subcategory: "Saat tamiri", source: "katalog" },
  { category: "yok-sektor", subcategory: "", source: "senin" },
  { category: "saglik", subcategory: "", orgKind: "kamu", orgVerified: false, source: "senin" },
  { category: "saglik", subcategory: "", orgKind: "kamu", orgVerified: true, source: "senin" },
])
assert.equal(report.total, 5)
assert.deepEqual(report.unknownCategory, [{ id: "yok-sektor", count: 1 }])
assert.deepEqual(report.unmatchedSub, [{ category: "usta", subcategory: "Saat tamiri", count: 1 }])
assert.equal(report.kamuPending, 1)
assert.equal(report.perRoot.find((r) => r.id === "usta")?.count, 2)

console.log("taxonomy ok")
