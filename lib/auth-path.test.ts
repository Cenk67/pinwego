import assert from "node:assert/strict"
import { authDoor, authMode, loginDoorProblem } from "./auth-path"

assert.equal(authMode(null), "choose")
assert.equal(authMode("musteri"), "musteri")
assert.equal(authMode("isletme"), "isletme")
assert.equal(authMode("giris"), "login")
assert.equal(authMode("yonetici"), "admin")
assert.equal(authDoor("isletme", "login"), "isletme")
assert.equal(authDoor(null, "admin"), "yonetici")
assert.equal(loginDoorProblem("musteri", "musteri"), null)
assert.equal(loginDoorProblem("isletme", "isletme"), null)
assert.equal(loginDoorProblem("yonetici", "admin"), null)
assert.match(loginDoorProblem("isletme", "musteri") ?? "", /müşteri/)
assert.match(loginDoorProblem("musteri", "isletme") ?? "", /İşletme/)
assert.match(loginDoorProblem("yonetici", "musteri") ?? "", /yönetici/)

console.log("giriş kapıları ayrıldı")
