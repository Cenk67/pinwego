import assert from "node:assert/strict"
import { correctNeedText, matchNeed } from "./need.ts"

assert.equal(correctNeedText("sigrota ariyorum"), "sigorta ariyorum")
assert.equal(correctNeedText("tesisart patladi"), "tesisat patladi")
assert.equal(matchNeed("kisin evim sicak olmuyor")?.category, "enerji")
assert.equal(matchNeed("kisin evim sicak olmuyor")?.focus, "kombi")
assert.equal(matchNeed("aksam yemegi"), null)
