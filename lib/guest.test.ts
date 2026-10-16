import assert from "node:assert/strict"
import { isContactFact, watchCopy } from "./guest"

const about =
  "Yokuştepe Kahvaltı % Waffle, Karadeniz Ereğli ilçesinde kayıtlı bir hızlı yemek. Telefon: +90 372 502 3687. Adres: Tacettin Halatçı sokak No:3/E. Çalışma saati: Mo-Su 09:00-23:00. Site: https://www.yokustepe.com. Bilgiler açık harita kaydından alındı."

const watched = watchCopy(about)
assert.equal(watched.includes("372"), false)
assert.equal(watched.includes("yokustepe.com"), false)
assert.equal(watched.includes("Tacettin Halatçı"), true)
assert.equal(watched.includes("09:00-23:00"), true)

assert.equal(watchCopy("Pizza. Telefon: 322 11 11. Site: http://pizzavenezzia.com/.").includes("322"), false)
assert.equal(watchCopy("Saat 09:00–18:00 arası açık."), "Saat 09:00–18:00 arası açık.")
assert.equal(isContactFact("Site", "https://www.yokustepe.com"), true)
assert.equal(isContactFact("İlçe", "Karadeniz Ereğli"), false)
assert.equal(isContactFact("Not", "4444467"), true)

console.log("misafir metninde iletişim yok")
