import assert from "node:assert/strict"
import {
  clampResults,
  countryCode,
  discoverPath,
  discoverQuery,
  mapsSearchUrl,
  registerDraftPath,
  showDiscover,
  takeDiscoverSlot,
  defaultDiscoverSettings,
} from "./discover.ts"

assert.equal(mapsSearchUrl("kombi servisi", "Zonguldak"), "https://www.google.com/maps/search/?api=1&query=kombi%20servisi%20Zonguldak")
assert.equal(mapsSearchUrl("Zonguldak kombi servisi", "Zonguldak").includes("Zonguldak%20Zonguldak"), false)
assert.equal(mapsSearchUrl("javascript:alert(1)", ""), "")
assert.equal(discoverQuery("  a "), "")
assert.equal(discoverPath("kombi servisi", "Zonguldak"), "/kesif?q=kombi+servisi&sehir=Zonguldak")
assert.equal(showDiscover(0, defaultDiscoverSettings, true), true)
assert.equal(showDiscover(3, defaultDiscoverSettings, true), false)
assert.equal(showDiscover(0, { ...defaultDiscoverSettings, enabled: false }, true), false)
assert.equal(showDiscover(0, defaultDiscoverSettings, false), false)
assert.equal(clampResults(40), 8)
assert.equal(countryCode("tr"), "TR")
assert.equal(countryCode("../"), "TR")
const draft = registerDraftPath(defaultDiscoverSettings, "Usta\nKombi", "No: 1")
assert.equal(draft.startsWith("/listele?"), true)
assert.equal(draft.includes("\n"), false)
assert.equal(takeDiscoverSlot([0, 1], 2, 2, 60_000).ok, false)
assert.equal(takeDiscoverSlot([0], 61_000, 1, 60_000).ok, true)
