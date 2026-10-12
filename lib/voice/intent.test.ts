import assert from "node:assert/strict"
import { businesses } from "@/lib/catalog"
import { fold } from "@/lib/format"
import { defaultFilters, searchDirectory } from "@/lib/match"
import { recordVoice, getVoiceStats } from "@/lib/voice/analytics"
import { understandVoice, voicePatch, voiceSearchPath } from "@/lib/voice/intent"
import { mapSpeechError } from "@/lib/voice/session"
import type { SortKey } from "@/lib/types"

const dentist = understandVoice("Zonguldak'ta diş hekimi", businesses)
assert.equal(dentist.city, "Zonguldak")
assert.equal(dentist.category, "saglik")
assert.equal(dentist.near, false)
assert.equal(dentist.openNow, false)
const dentistPath = voiceSearchPath(dentist.query, voicePatch(dentist))
assert.equal(dentistPath.startsWith("/ara?"), true)
assert.equal(dentistPath.includes("/arama"), false)
assert.equal(dentistPath.includes("ses="), false)
const dentistParams = new URLSearchParams(dentistPath.slice(dentistPath.indexOf("?") + 1))
assert.match(dentistParams.get("q") ?? "", /Zonguldak/)
assert.equal(dentistParams.get("kategori"), "saglik")
const found = searchDirectory(businesses, dentist.query, {
  ...defaultFilters,
  sehir: dentist.city ?? "hepsi",
  kategori: dentist.category ?? "hepsi",
})
assert.ok(found.length > 0)
assert.ok(found.every((item) => item.business.city === "Zonguldak"))
assert.ok(found.some((item) => fold(item.business.subcategory).includes("dis")))

const nearby = understandVoice("Yakınımdaki açık eczaneleri göster", businesses)
assert.equal(nearby.near, true)
assert.equal(nearby.openNow, true)
assert.equal(nearby.category, "eczane")
assert.equal("geolocation" in nearby, false)

const ankara = understandVoice("Ankara'da şu anda açık, 4.5 yıldızın üzerinde ve eve servis yapan pizza", businesses)
assert.equal(ankara.city, "Ankara")
assert.equal(ankara.openNow, true)
assert.equal(ankara.minRating, 4.5)
assert.equal(ankara.delivery, true)
const ankaraPath = voiceSearchPath(ankara.query, voicePatch(ankara))
const ankaraParams = new URLSearchParams(ankaraPath.slice(ankaraPath.indexOf("?") + 1))
assert.equal(ankaraParams.get("acik"), "1")
assert.equal(ankaraParams.get("puan"), "4.5")
assert.equal(ankaraParams.get("ses"), null)

const salon = understandVoice("İstanbul Kadıköy'de kadın kuaförü ara", businesses)
assert.equal(salon.city, "İstanbul")
assert.equal(salon.district, "Kadıköy")
assert.equal(salon.category, "guzellik")

const cheap = understandVoice("Zonguldak'ta en ucuz otel", businesses)
assert.equal(cheap.city, "Zonguldak")
assert.equal(cheap.category, "konaklama")
assert.equal(cheap.sort, "fiyat")
assert.equal(voicePatch(cheap).sirala, "fiyat")

const family = understandVoice("İstanbul'da bu gece açık ve aileyle gidilebilecek iyi bir restoran", businesses)
assert.equal(family.city, "İstanbul")
assert.equal(family.category, "yeme")
assert.equal(family.openNow, true)
assert.equal(family.tonight, true)
assert.equal(family.family, true)

const vet = understandVoice("Bana 24 saat açık veteriner bul", businesses)
assert.equal(vet.category, "hayvan")
assert.equal(vet.openNow, true)
assert.equal(vet.twentyFour, true)

const brand = understandVoice("Zonguldak'ta arabam için güvenilir bir Volkswagen servisi", businesses)
assert.equal(brand.city, "Zonguldak")
assert.equal(brand.brand, "volkswagen")
assert.equal(brand.category, "oto")

assert.equal(understandVoice("otel açıklaması").openNow, false)
assert.equal(understandVoice("yakında bir kafe").near, false)
assert.equal(understandVoice("yakınımdaki eczane").near, true)

const best = understandVoice("İstanbul'da en iyi İtalyan restoranlarını bul", businesses)
assert.equal(best.city, "İstanbul")
assert.equal(best.category, "yeme")
assert.equal(best.minRating, 4.5)
assert.equal(best.sort, "puan" satisfies SortKey)

assert.equal(voicePatch(best, false).acik, null)
assert.equal(voicePatch(best, false).puan, null)

recordVoice("voice_search_completed", { language: "tr-TR", queryLength: 18, resultCount: found.length })
const saved = getVoiceStats().events[0]
assert.equal(saved.name, "voice_search_completed")
assert.equal(saved.queryLength, 18)
assert.equal(saved.resultCount, found.length)
assert.equal("transcript" in saved, false)
assert.equal(JSON.stringify(saved).includes("diş"), false)

assert.equal(mapSpeechError("not-allowed"), "denied")
assert.equal(mapSpeechError("no-speech"), "nothing")
assert.equal(mapSpeechError("network"), "network")
assert.equal(mapSpeechError("audio-capture"), "no-mic")
