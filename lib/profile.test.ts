import assert from "node:assert/strict"
import { businesses } from "./catalog"
import {
  cleanTags,
  deriveProfile,
  listingFields,
  matchBreakdown,
  profileReadiness,
  resolveProfile,
  suggestAiTags,
  tagKey,
} from "./profile"
import type { Business } from "./types"

const dent = businesses.find((item) => item.slug === "nisanta-dent")
assert.ok(dent)

const profile = deriveProfile(dent)
assert.equal(tagKey("Diş Hekimi"), tagKey("diş-hekimi"))
assert.deepEqual(cleanTags(["Diş Hekimi", "diş hekimi", "diş-hekimi", "implant"]), ["Diş Hekimi", "implant"])
assert.ok(profile.shortBody.includes("Diş taşı"))
assert.ok(profile.seoTags.some((tag) => tag.includes("Nişantaşı")))
assert.equal(profile.aiTags.includes("diş hekimi") || profile.aiTags.some((tag) => tagKey(tag).includes("dis")), true)
assert.equal(profile.services.length, 3)
assert.equal(profile.gallery.length, 1)
assert.equal(profile.published, true)

const suggested = suggestAiTags(dent, profile)
assert.ok(suggested.length > 0)
assert.equal(suggested.some((tag) => profile.aiTags.map(tagKey).includes(tagKey(tag))), false)

const saved = listingFields({
  ...profile,
  pendingAiTags: suggested.slice(0, 2),
  services: profile.services.map((service, index) => ({ ...service, active: index !== 1 })),
})
assert.equal(saved.services.length, 2)
assert.equal(saved.profile.pendingAiTags.length, 2)
assert.equal(saved.services.some((service) => service.name === "Kontrol"), false)

const night: Business = {
  ...dent,
  id: "gece-tesisat",
  slug: "gece-tesisat",
  name: "Gece Tesisat",
  category: "usta",
  subcategory: "Tesisatçı",
  city: "Zonguldak",
  district: "Merkez",
  openNow: true,
  hours: [{ day: "Pazartesi", hours: "09:00–23:30" }],
  services: [{ name: "Tesisat", price: 500, unit: "çağrı" }],
  profile: {
    ...deriveProfile(dent),
    onSite: "var",
    aiTags: ["acil tesisatçı", "eve servis tesisatçı"],
    services: [
      {
        id: "tesisat",
        name: "Tesisat",
        summary: "",
        detail: "",
        price: 500,
        unit: "çağrı",
        duration: "",
        area: "Zonguldak",
        image: "",
        alt: "",
        seoTags: ["tesisatçı"],
        aiTags: ["acil tesisatçı"],
        active: true,
        order: 0,
      },
    ],
  },
}

const score = matchBreakdown(night, {
  category: "usta",
  city: "Zonguldak",
  district: "Merkez",
  services: ["Tesisat"],
  aiTags: ["acil tesisatçı"],
  night: true,
  onSite: true,
  openNow: true,
})
assert.ok(score.total >= 90, `skor ${score.total}`)
assert.ok(score.reasons.includes("Gece açık"))
assert.ok(score.reasons.includes("Eve servis"))

const weak = matchBreakdown(dent, {
  category: "usta",
  city: "Zonguldak",
  services: ["Tesisat"],
  aiTags: ["acil tesisatçı"],
  night: true,
  onSite: true,
})
assert.ok(score.total > weak.total)

const resolved = resolveProfile({ ...dent, profile: { ...profile, seoTags: ["implant"], aiTags: ["diş ağrısı"], pendingAiTags: [] } })
assert.deepEqual(resolved.seoTags, ["implant"])
assert.equal(resolved.aiTags.includes("diş ağrısı"), true)
assert.ok(profileReadiness(profile) >= 70)

console.log("profil, etiket ve eşleşme skoru geçti")
