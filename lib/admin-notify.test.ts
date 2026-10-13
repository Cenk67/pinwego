import assert from "node:assert/strict"
import { acceptNotice, digestSlots, emptyNotify, emptySettings, noticeLetter, parseNotify, saveSettings } from "./admin-notify"

const now = Date.parse("2026-10-13T05:00:00Z")
let state = emptyNotify()
const first = acceptNotice(state, {
  key: "kayit:1",
  kind: "musteri",
  level: "bilgi",
  title: "Yeni müşteri kaydı",
  detail: "Kayıt numarası 1. Tür: müşteri.",
  ref: "1",
  to: "yönetici kutusu",
}, now)
assert.equal(first.deliver, true)
assert.equal(first.changed, true)
state = first.state
const duplicate = acceptNotice(state, {
  key: "kayit:1",
  kind: "musteri",
  level: "bilgi",
  title: "Yeni müşteri kaydı",
  detail: "tekrar",
  ref: "1",
  to: "yönetici kutusu",
}, now + 1000)
assert.equal(duplicate.deliver, false)
assert.equal(duplicate.changed, false)
assert.equal(duplicate.state.events.length, 1)

const quiet = saveSettings(state, { ...emptySettings(), musteri: false }, now)
assert.equal(quiet.ok, true)
if (quiet.ok) {
  const skipped = acceptNotice(quiet.state, {
    key: "kayit:2",
    kind: "musteri",
    level: "bilgi",
    title: "Yeni müşteri kaydı",
    detail: "kapalı",
    ref: "2",
    to: "",
  }, now)
  assert.equal(skipped.changed, false)
  assert.equal(skipped.state.events.length, 1)
}

const bad = saveSettings(state, { ...emptySettings(), recipients: ["posta-degil"] }, now)
assert.equal(bad.ok, false)
assert.equal(parseNotify("{"), null)
const letter = noticeLetter(first.event!, "https://pinwego.com/yonetim")
assert.equal(letter.text.includes("sifre1234"), false)
assert.equal(letter.text.includes("10000000146"), false)
assert.equal(letter.html.includes("<script>"), false)
assert.equal(letter.html.includes("https://pinwego.com/yonetim"), true)

const monday = Date.parse("2026-10-12T05:00:00Z")
const afternoon = Date.parse("2026-10-12T12:00:00Z")
const armed = emptyNotify()
armed.settings.gunluk = true
armed.settings.haftalik = true
const slots = digestSlots(armed, monday)
assert.equal(slots.day, "day:2026-10-11")
assert.equal(typeof slots.week, "string")
assert.equal(digestSlots(armed, afternoon).day, null)
const stamped = { ...armed, digests: [slots.day!, slots.week!] }
assert.equal(digestSlots(stamped, monday).day, null)
assert.equal(digestSlots(stamped, monday).week, null)

console.log("bildirim tekrarı ve özet saati tutuldu")
