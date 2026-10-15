import assert from "node:assert/strict"
import { acceptListing, emptyBook } from "./listings"
import { acceptSheet, listingSheetSample, parseListingSheet } from "./listings-import"

const sample = parseListingSheet(`\uFEFF${listingSheetSample}`)
assert.equal(sample.faults.length, 0)
assert.equal(sample.rows.length, 2)
assert.equal(sample.rows[0]?.body.name, "Yeşil Çınar")
assert.equal(sample.rows[0]?.body.category, "yeme")
assert.equal(sample.rows[0]?.body.lat, 41.45)

const quoted = parseListingSheet('ad,kategori,sehir,semt,telefon,ozet\n"Ada, Kafe",yeme,Zonguldak,Kozlu,03720000021,Kozlu\'da uzun bir kahve özeti.\n')
assert.equal(quoted.rows[0]?.body.name, "Ada, Kafe")
assert.equal(quoted.rows[0]?.body.lat, 41.453)

const placed = parseListingSheet("ad;kategori;sehir;semt;telefon;ozet;enlem;boylam\nKuzey Atolye;usta;Trabzon;Ortahisar;04620000021;Trabzon'da tesisat ve tamir.;41.002;39.717\n")
assert.equal(placed.rows[0]?.body.city, "Trabzon")
assert.equal(placed.rows[0]?.body.lat, 41.002)

const missingPlace = parseListingSheet("ad;kategori;sehir;semt;telefon;ozet\nKuzey Atolye;usta;Trabzon;Ortahisar;04620000021;Trabzon'da tesisat ve tamir.\n")
assert.equal(missingPlace.faults[0]?.reason, "konum")

const broken = parseListingSheet("ad;sehir\nAda;Zonguldak\n")
assert.equal(broken.faults[0]?.reason, "baslik")
assert.equal(broken.rows.length, 0)

const shortPhone = parseListingSheet("ad;kategori;sehir;semt;telefon;ozet\nAda Kafe;yeme;Zonguldak;Kozlu;123;Kısa telefonlu satır özeti.\n")
assert.equal(shortPhone.faults[0]?.reason, "telefon")

let book = emptyBook()
const now = "2026-10-15T12:00:00.000Z"
for (let index = 0; index < 31; index += 1) {
  const saved = acceptListing(
    {
      name: `Yonetici Kafe ${index}`,
      category: "yeme",
      subcategory: "Yeme-İçme",
      city: "Zonguldak",
      district: "Merkez",
      address: "Merkez, Zonguldak",
      lat: 41.45,
      lng: 31.74,
      phone: `03720000${String(index).padStart(3, "0")}`,
      summary: "Yönetici kaydı için yeterince uzun özet.",
      verified: true,
    },
    "yonetici",
    now,
    book,
    true,
  )
  assert.equal(saved.ok, true)
  if (saved.ok) book = saved.book
}
assert.equal(book.listings.length, 31)

let memberBook = emptyBook()
for (let index = 0; index < 30; index += 1) {
  const saved = acceptListing(
    {
      name: `Uye Kafe ${index}`,
      category: "yeme",
      subcategory: "Yeme-İçme",
      city: "Zonguldak",
      district: "Merkez",
      address: "Merkez, Zonguldak",
      lat: 41.45,
      lng: 31.74,
      phone: `03721000${String(index).padStart(3, "0")}`,
      summary: "Üye kaydı için yeterince uzun özet.",
    },
    "uye-1",
    now,
    memberBook,
    false,
  )
  assert.equal(saved.ok, true)
  if (saved.ok) memberBook = saved.book
}
const overflow = acceptListing(
  {
    name: "Uye Kafe tasan",
    category: "yeme",
    subcategory: "Yeme-İçme",
    city: "Zonguldak",
    district: "Merkez",
    address: "Merkez, Zonguldak",
    lat: 41.45,
    lng: 31.74,
    phone: "03721000999",
    summary: "Üye kaydı için yeterince uzun özet.",
  },
  "uye-1",
  now,
  memberBook,
  false,
)
assert.equal(overflow.ok, false)

const accepted = acceptSheet(sample.rows, emptyBook(), now)
assert.equal(accepted.added, 2)
assert.equal(accepted.listings[0]?.verified, true)
assert.equal(accepted.listings[0]?.premium, false)
