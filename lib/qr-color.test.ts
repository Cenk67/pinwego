import assert from "node:assert/strict"
import { qrInk, qrPalette, qrPaper } from "./qr-color.ts"

const red = Array.from({ length: 20 }, () => ({ r: 220, g: 32, b: 40 }))
const painted = qrPalette(red)
assert.notEqual(painted.dark, qrInk)
assert.match(painted.dark, /^#[0-9a-f]{6}$/)
assert.match(painted.light, /^#[0-9a-f]{6}$/)
const darkRed = Number.parseInt(painted.dark.slice(1, 3), 16)
const darkGreen = Number.parseInt(painted.dark.slice(3, 5), 16)
assert.ok(darkRed > darkGreen + 40)

const paper = qrPalette(Array.from({ length: 20 }, () => ({ r: 250, g: 250, b: 250 })))
assert.equal(paper.dark, qrInk)
assert.equal(paper.light, qrPaper)

const quiet = qrPalette([{ r: 220, g: 32, b: 40 }])
assert.equal(quiet.dark, qrInk)
