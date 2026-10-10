import assert from "node:assert/strict"
import { businesses } from "./catalog"
import { savedContacts, visibleContacts, whatsappHref } from "./contacts"

const marmara = businesses.find((item) => item.slug === "marmara-kahvesi")
const boya = businesses.find((item) => item.slug === "kumsal-boya")
assert.ok(marmara && boya)

assert.deepEqual(
  visibleContacts(marmara).map((item) => item.label),
  ["Sabit telefon"],
)
assert.equal(visibleContacts(marmara)[0]?.value, "0212 555 01 09")
assert.deepEqual(
  visibleContacts(boya).map((item) => item.id),
  ["mobile"],
)

const hidden = visibleContacts({
  phone: "0212 555 01 09",
  contacts: { landline: "", mobile: "0532 111 22 33", whatsapp: "" },
})
assert.deepEqual(hidden.map((item) => item.id), ["mobile"])

const full = savedContacts({
  landline: "0212 555 01 09",
  mobile: "0532 555 01 09",
  whatsapp: "0532 555 01 09",
})
assert.equal(full.error, null)
assert.equal(full.phone, "0532 555 01 09")
assert.equal(whatsappHref("0532 555 01 09"), "https://wa.me/905325550109")
assert.deepEqual(
  visibleContacts({ phone: "0212 000 00 00", contacts: full.contacts }).map((item) => item.label),
  ["Sabit telefon", "GSM", "WhatsApp"],
)

assert.equal(savedContacts({ landline: "123", mobile: "", whatsapp: "" }).error, "Sabit telefon için en az 10 rakam yaz.")
assert.deepEqual(visibleContacts({ phone: "", contacts: { landline: "", mobile: "", whatsapp: "" } }), [])
