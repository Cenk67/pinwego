import assert from "node:assert/strict"
import {
  campaignPath,
  defaultSettings,
  listPublic,
  liveStatus,
  moderate,
  rankScore,
  redeemCoupon,
  resolveSegment,
  reviewCampaign,
  seedCampaigns,
  suggestCampaignCopy,
  uniqueSlug,
  type Campaign,
} from "./campaigns.ts"

const today = "2026-10-12"
const yokustepe = seedCampaigns.find((item) => item.id === "kampanya-yokustepe") as Campaign
const sofra = seedCampaigns.find((item) => item.id === "kampanya-sofra") as Campaign
const marmara = seedCampaigns.find((item) => item.id === "kampanya-marmara") as Campaign
const balikci = seedCampaigns.find((item) => item.id === "kampanya-balikci") as Campaign

assert.equal(liveStatus({ ...yokustepe, startDate: "2026-10-20", endDate: "2026-10-31", status: "approved" }, today), "approved")
assert.equal(liveStatus(yokustepe, today), "published")
assert.equal(liveStatus(marmara, today), "expired")
assert.equal(liveStatus(sofra, today), "pending_moderation")

const owner = { id: "isletme-1", role: "isletme" as const }
const other = { id: "isletme-2", role: "isletme" as const }
const admin = { id: "admin-pinwego", role: "admin" as const }
const draft: Campaign = {
  ...yokustepe,
  id: "taslak",
  slug: "taslak",
  status: "draft",
  ownerAccountId: owner.id,
  title: "AKŞAM MENÜSÜ !!!",
  shortText: "kısa",
  terms: "",
  image: "",
  discountPercent: 95,
  endDate: "2026-10-01",
  startDate: "2026-10-20",
}

const flagged = reviewCampaign(draft)
assert.ok(flagged.flags.includes("caps"))
assert.ok(flagged.flags.includes("discount"))
assert.ok(flagged.flags.includes("dates"))
assert.equal(moderate(owner, draft, { type: "submit" }).ok, false)
const submitted = moderate(owner, { ...draft, startDate: "2026-10-01", endDate: "2026-10-31" }, { type: "submit" }, "", defaultSettings, new Date("2026-10-12T12:00:00Z"))
assert.equal(submitted.ok, true)
if (submitted.ok) {
  assert.equal(submitted.campaign.status, "pending_moderation")
  assert.ok(submitted.campaign.aiReview?.flags.includes("caps"))
  assert.ok(submitted.campaign.aiReview?.flags.includes("discount"))
  assert.equal(submitted.campaign.aiReview?.flags.includes("dates"), false)
  assert.equal(submitted.campaign.audit.some((item) => item.action === "AI_REVIEWED"), true)
}

assert.equal(moderate(owner, { ...draft, ownerAccountId: owner.id, status: "pending_moderation" }, { type: "approve" }).ok, false)
assert.equal(moderate(other, { ...draft, ownerAccountId: owner.id }, { type: "edit", patch: { title: "Başka" }, taken: [] }).ok, false)

const approved = moderate(admin, { ...sofra, status: "pending_moderation" }, { type: "approve" }, "", defaultSettings, new Date("2026-10-12T12:00:00Z"))
assert.equal(approved.ok, true)
if (approved.ok) assert.equal(liveStatus(approved.campaign, today), "published")

const rejected = moderate(admin, sofra, { type: "reject", note: "  " })
assert.equal(rejected.ok, false)
if (!rejected.ok) assert.equal(rejected.error, "reason")

const edited = moderate(admin, yokustepe, { type: "edit", patch: { title: "Yeni başlık" }, taken: seedCampaigns.map((item) => item.slug) }, "", defaultSettings, new Date("2026-10-12T12:00:00Z"))
assert.equal(edited.ok, true)
if (edited.ok) assert.equal(edited.campaign.status, "pending_moderation")

assert.equal(uniqueSlug("Yeni başlık", ["yeni-baslik"]), "yeni-baslik-2")
assert.equal(campaignPath(yokustepe), "/kampanyalar/zonguldak/yeme/yokustepe-kahvalti-yuzde-20")
assert.equal(resolveSegment("istanbul")?.kind, "city")
assert.equal(resolveSegment("yeme")?.kind, "category")
assert.equal(resolveSegment("yok"), null)

const listed = listPublic(seedCampaigns, {}, defaultSettings, today)
assert.equal(listed.some((item) => item.id === "kampanya-marmara"), false)
assert.equal(listed.some((item) => item.id === "kampanya-sofra"), false)
assert.equal(listed.some((item) => item.id === "kampanya-yokustepe"), true)
assert.equal(listPublic(seedCampaigns, { city: "zonguldak" }, defaultSettings, today).every((item) => item.city === "Zonguldak"), true)

const limited = { ...yokustepe, usageLimit: 1, redemptions: [], redeems: 0, code: "PW-KAHVE" }
const first = redeemCoupon(limited, "yerel-a", "pw-kahve", today)
assert.equal(first.ok, true)
if (first.ok) {
  assert.equal(redeemCoupon(first.campaign, "yerel-a", "PW-KAHVE", today).ok, false)
  const second = redeemCoupon(first.campaign, "yerel-b", "PW-KAHVE", today)
  assert.equal(second.ok, false)
  if (!second.ok) assert.equal(second.reason, "limit")
}
assert.equal(redeemCoupon(sofra, "yerel-a", "PW-SOFRA", today).ok, false)

const plain = rankScore({ ...yokustepe, views: 0, clicks: 0, saves: 0, shares: 0, whatsappClicks: 0, sponsored: false, featured: false }, null, defaultSettings, today, false)
const boosted = rankScore({ ...yokustepe, views: 0, clicks: 0, saves: 0, shares: 0, whatsappClicks: 0, sponsored: true, sponsorUntil: "2026-10-20", featured: false }, null, defaultSettings, today, false)
assert.ok(boosted > plain)

const copy = suggestCampaignCopy("öğle menüsünde indirim")
assert.match(copy.shortText, /öğle menüsünde indirim/)
assert.equal(reviewCampaign(yokustepe).flags.length, 0)
assert.equal(listed[0]?.id, balikci.id)
