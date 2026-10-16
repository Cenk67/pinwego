import assert from "node:assert/strict"
import {
  canonicalRedirectUrl,
  destinationFor,
  digestPassword,
  normalizeEmail,
  passwordMatches,
  safeReturnPath,
  sameEmail,
  withReturn,
} from "./auth-session"

assert.equal(normalizeEmail("  User@Pinwego.com "), "user@pinwego.com")
assert.equal(normalizeEmail("İsmail@Pinwego.com"), "ismail@pinwego.com")
assert.equal(sameEmail("user@pinwego.com", " User@Pinwego.com "), true)
assert.equal(sameEmail("ismail@pinwego.com", "İsmail@Pinwego.com"), true)
assert.equal(sameEmail("i\u0307smail@pinwego.com", "İsmail@pinwego.com"), true)
assert.equal(sameEmail("ada@pinwego.com", "beste@pinwego.com"), false)

const adminHash = "a502141c77771259d7a0471270828e7b4dc7ba13a24669bf18f3f2b34b80933f"
assert.equal(await digestPassword("admin@pinwego.local", "pinwego-admin"), adminHash)

const stored = "İsmail@Pinwego.com".trim().toLowerCase()
const oldHash = await digestPassword(stored, "sifre1234")
assert.equal(sameEmail(stored, "İsmail@Pinwego.com"), true)
assert.equal(await passwordMatches(stored, oldHash, "sifre1234"), true)
assert.equal(await passwordMatches(stored, oldHash, "  sifre1234  "), true)
assert.equal(await passwordMatches(stored, oldHash, "yanlis123"), false)

const fresh = normalizeEmail("Ada@Pinwego.com")
const freshHash = await digestPassword(fresh, "sifre1234")
assert.equal(fresh, "ada@pinwego.com")
assert.equal(await passwordMatches(fresh, freshHash, "sifre1234"), true)

assert.equal(destinationFor("musteri", null, null), "/")
assert.equal(destinationFor("musteri", null, "/isletme/nisanta-dent"), "/isletme/nisanta-dent")
assert.equal(destinationFor("isletme", null, "/isletme/nisanta-dent"), "/panel")
assert.equal(destinationFor("isletme", "nisanta-dent", "/"), "/isletme/nisanta-dent")
assert.equal(destinationFor("admin", null, "/ara"), "/yonetim")
assert.equal(safeReturnPath("https://evil.example"), null)
assert.equal(safeReturnPath("//evil.example"), null)
assert.equal(safeReturnPath("/hesap?kayit=musteri"), null)
assert.equal(withReturn("/hesap?kayit=musteri", "/isletme/nisanta-dent"), "/hesap?kayit=musteri&donus=%2Fisletme%2Fnisanta-dent")
assert.equal(withReturn("/hesap", "/"), "/hesap")
assert.equal(canonicalRedirectUrl("www.pinwego.com", "/hesap?kayit=giris"), "https://pinwego.com/hesap?kayit=giris")
assert.equal(canonicalRedirectUrl("pinwego.com", "/hesap"), null)
assert.equal(canonicalRedirectUrl("www.pinwego.com:443", "/"), "https://pinwego.com/")
assert.equal(canonicalRedirectUrl("www.pinwego.com", "//evil.example"), null)

console.log("oturum ve giriş eşleşmesi sabit")
