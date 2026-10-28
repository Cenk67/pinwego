import assert from "node:assert/strict"
import { businesses } from "./catalog"
import { defaultFilters, searchDirectory } from "./match"
import {
  assignPin,
  businessPin,
  displayPin,
  parsePinQuery,
  pinFromKey,
  pinMatches,
  verhoeffCheck,
  verhoeffOk,
} from "./business-pin"

assert.equal(verhoeffCheck("236"), "3")
assert.equal(verhoeffOk("2363"), true)
assert.equal(verhoeffOk("2364"), false)
assert.equal(verhoeffOk("2633"), false)

const sample = businesses.find((item) => item.id === "balikci-mehmet")
assert.ok(sample?.pin)
assert.equal(sample?.pin, "PW-284541955")
assert.equal(sample?.pin, pinFromKey("balikci-mehmet"))
assert.equal(parsePinQuery(sample!.pin!)?.valid, true)
assert.equal(pinFromKey("balikci-mehmet"), pinFromKey("balikci-mehmet"))
assert.notEqual(pinFromKey("balikci-mehmet"), pinFromKey("sofra-42"))

const seen = new Set<string>()
for (const business of businesses) {
  assert.equal(business.pin, pinFromKey(business.id))
  assert.equal(seen.has(business.pin!), false, business.id)
  seen.add(business.pin!)
  const digits = business.pin!.slice(3)
  const bumped = `${digits.slice(0, 8)}${(Number(digits[8]) + 1) % 10}`
  assert.equal(verhoeffOk(bumped), false)
  const swapped = `${digits[1]}${digits[0]}${digits.slice(2)}`
  if (swapped !== digits) assert.equal(verhoeffOk(swapped), false)
}

const pin = sample!.pin!
const ranked = searchDirectory(businesses, displayPin(pin), { ...defaultFilters, sehir: "Bu şehir yok", verified: true })
assert.equal(ranked.length, 1)
assert.equal(ranked[0]?.business.id, "balikci-mehmet")
assert.match(ranked[0]?.reason ?? "", /Pinwego numarası/)

const typed = searchDirectory(businesses, `işletme id ${pin}`, defaultFilters)
assert.equal(typed.length, 1)
assert.equal(typed[0]?.business.id, "balikci-mehmet")

for (let index = 0; index < pin.length; index += 1) {
  const digit = pin[index]
  if (!/\d/.test(digit)) continue
  const changed = `${pin.slice(0, index)}${(Number(digit) + 1) % 10}${pin.slice(index + 1)}`
  assert.equal(parsePinQuery(changed)?.valid, false, changed)
}
for (let index = 3; index < pin.length - 1; index += 1) {
  if (pin[index] === pin[index + 1]) continue
  const swapped = `${pin.slice(0, index)}${pin[index + 1]}${pin[index]}${pin.slice(index + 2)}`
  assert.equal(parsePinQuery(swapped)?.valid, false, swapped)
}

const broken = `${pin.slice(0, -1)}${(Number(pin.slice(-1)) + 1) % 10}`
assert.equal(parsePinQuery(broken)?.valid, false)
assert.equal(searchDirectory(businesses, broken, defaultFilters).length, 0)
assert.equal(parsePinQuery("Kadıköy'de akşam yemeği"), null)
assert.equal(parsePinQuery("0532 111 22 33"), null)
assert.equal(searchDirectory(businesses, "yeme", defaultFilters).length > 1, true)

const taken = assignPin("yeni-kayit", [pinFromKey("yeni-kayit")])
assert.notEqual(taken, pinFromKey("yeni-kayit"))
assert.equal(parsePinQuery(taken)?.valid, true)
assert.equal(assignPin("yeni-kayit", []), pinFromKey("yeni-kayit"))
assert.equal(businessPin({ id: "yeni-kayit", pin: taken }), taken)
assert.equal(businessPin({ id: "yeni-kayit" }), pinFromKey("yeni-kayit"))
assert.equal(pinMatches(taken, displayPin(taken)), true)
assert.equal(pinMatches(pin, "balikci-mehmet"), false)

console.log("business-pin ok", businesses.length, pin)
