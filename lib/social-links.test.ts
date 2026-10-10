import assert from "node:assert/strict"
import { businesses } from "./catalog"
import { normalizeLink, savedLinks, visibleLinks } from "./social-links"

assert.equal(normalizeLink("  "), "")
assert.equal(normalizeLink("javascript:alert(1)"), "")
assert.equal(normalizeLink("ornek"), "")
assert.equal(normalizeLink("ornek.com/menu"), "https://ornek.com/menu")
assert.equal(normalizeLink("http://ornek.com"), "http://ornek.com/")

const marmara = businesses.find((item) => item.slug === "marmara-kahvesi")
assert.ok(marmara)
assert.deepEqual(visibleLinks(marmara).map((item) => item.id), [])

const yokustepe = businesses.find((item) => item.slug === "yokustepe-kahvalti-waffle")
assert.ok(yokustepe)
assert.deepEqual(visibleLinks(yokustepe).map((item) => item.id), ["website"])

const saved = savedLinks({
  instagram: "instagram.com/pinwego",
  facebook: "",
  n11: "not a url",
})
assert.equal(saved.error, "N11 bağlantısı açılacak bir adres değil.")

const clean = savedLinks({ website: "pinwego.com", sahibinden: "sahibinden.com/ilan" })
assert.equal(clean.error, null)
assert.deepEqual(
  visibleLinks({ links: clean.links, website: clean.website }).map((item) => item.label),
  ["Web sitesi", "Sahibinden"],
)

assert.deepEqual(visibleLinks({ links: { website: "" }, website: "https://www.yokustepe.com" }).map((item) => item.id), [])
