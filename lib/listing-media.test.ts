import assert from "node:assert/strict"
import { coverImage, keepListingMedia, storedCover, storedGallery } from "./listing-media"
import { parseBook } from "./listings"
import type { Business, BusinessProfile } from "./types"

const png = `data:image/png;base64,${"A".repeat(40)}`
const huge = `data:image/png;base64,${"A".repeat(130_000)}`

assert.equal(storedCover(png), png)
assert.equal(storedCover("/photos/office.jpg"), "/photos/office.jpg")
assert.equal(storedCover("data:image/svg+xml;base64,AAAA"), "")
assert.equal(storedCover("/photos/../secret.jpg"), "")
assert.equal(storedCover("javascript:alert(1)"), "")
assert.equal(storedCover(huge), "")

const gallery = storedGallery([
  { image: png, title: "Ofis", active: true },
  { image: "data:image/svg+xml;base64,AAAA", title: "kötü" },
  { image: "/photos/office.jpg", title: "standart" },
])
assert.equal(gallery.length, 2)
assert.equal(gallery[0]?.image, png)
assert.equal(gallery[1]?.image, "/photos/office.jpg")
assert.equal(coverImage("/photos/office.jpg", gallery), png)
assert.equal(coverImage(png, []), png)

const profile = { gallery } as BusinessProfile
const previous = { id: "online", slug: "online", name: "Online Sigortalar", photo: png, profile } as Business
const stock = { ...previous, photo: "/photos/office.jpg", profile: undefined } as Business
assert.equal(keepListingMedia(previous, stock).photo, png)
assert.equal(keepListingMedia(previous, stock).profile?.gallery[0]?.image, png)
assert.equal(keepListingMedia(stock, { ...stock, photo: png }).photo, png)

const kept = parseBook(JSON.stringify({
  listings: [{ id: "a", slug: "a", name: "A", ownerAccountId: "o", city: "Zonguldak", lat: 41, lng: 31, photo: png }],
}))
assert.equal(kept?.listings[0]?.photo, png)
const dropped = parseBook(JSON.stringify({
  listings: [{ id: "b", slug: "b", name: "B", ownerAccountId: "o", city: "Zonguldak", lat: 41, lng: 31, photo: huge }],
}))
assert.equal(dropped?.listings[0]?.photo, "/photos/office.jpg")
