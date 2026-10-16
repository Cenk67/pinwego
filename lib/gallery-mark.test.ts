import assert from "node:assert/strict"
import { coverFrame, galleryCaption, GALLERY_HEIGHT, GALLERY_WIDTH, watermarkLayout } from "./gallery-mark"

const caption = galleryCaption(
  { name: "Nişanta Dent", subcategory: "Diş kliniği", district: "Nişantaşı" },
  { description: "" },
)
assert.equal(caption.name, "Nişanta Dent")
assert.equal(caption.description, "Diş kliniği, Nişantaşı")
assert.equal(
  galleryCaption(
    { name: "Nişanta Dent", subcategory: "Diş kliniği", district: "Nişantaşı" },
    { description: "Tedavi odası" },
  ).description,
  "Tedavi odası",
)

const wide = coverFrame(2400, 800)
assert.equal(wide.frameWidth, GALLERY_WIDTH)
assert.equal(wide.frameHeight, GALLERY_HEIGHT)
assert.ok(wide.dw >= GALLERY_WIDTH)
assert.ok(wide.dh >= GALLERY_HEIGHT)
assert.ok(wide.dx < 0)

const marks = watermarkLayout(1200, 900, "Nişanta Dent")
assert.equal(marks.label, "Nişanta Dent")
assert.ok(marks.points.length > 8)
assert.ok(marks.fontSize >= 22)

console.log("galeri ölçüsü, açıklama ve filigran ızgarası geçti")
