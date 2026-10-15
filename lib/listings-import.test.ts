import assert from "node:assert/strict"
import { acceptListing, emptyBook, parseBook } from "./listings"
import { classifyGrid, commitImport, listingSheetSample, suggestMap } from "./listings-import"
import { readCsvGrid, readXlsxGrid } from "./sheet-file"

const now = "2026-10-15T12:00:00.000Z"

function preview(text: string, book = emptyBook()) {
  const grid = readCsvGrid(text)
  assert.equal("error" in grid, false)
  if ("error" in grid) throw new Error("grid")
  return { grid, view: classifyGrid(grid, suggestMap(grid.headers), book) }
}

const sample = preview(`\uFEFF${listingSheetSample}`)
assert.equal(sample.view.counts.hata, 0)
assert.equal(sample.view.counts.yeni, 2)
assert.equal(sample.view.rows[0]?.name, "Yeşil Çınar")
assert.equal(sample.view.rows[0]?.city, "Zonguldak")

const quoted = preview('ad,kategori,sehir,semt,telefon,ozet\n"Ada, Kafe",yeme,Zonguldak,Kozlu,03720000021,Kozlu\'da uzun bir kahve özeti.\n')
assert.equal(quoted.view.rows[0]?.name, "Ada, Kafe")
assert.equal(quoted.view.counts.yeni, 1)

const placed = preview("ad;kategori;sehir;semt;telefon;ozet;enlem;boylam\nKuzey Atolye;usta;Trabzon;Ortahisar;04620000021;Trabzon'da tesisat ve tamir.;41.002;39.717\n")
assert.equal(placed.view.rows[0]?.kind, "yeni")

const missingPlace = preview("ad;kategori;sehir;semt;telefon;ozet\nKuzey Atolye;usta;Trabzon;Ortahisar;04620000021;Trabzon'da tesisat ve tamir.\n")
assert.equal(missingPlace.view.rows[0]?.kind, "hata")
assert.equal(missingPlace.view.rows[0]?.note.includes("enlem"), true)

const broken = preview("ad;sehir\nAda;Zonguldak\n")
assert.equal(broken.view.counts.hata, 1)
assert.equal(broken.view.rows[0]?.note.includes("eşlenmeli"), true)

const shortPhone = preview("ad;kategori;sehir;semt;telefon;ozet\nAda Kafe;yeme;Zonguldak;Kozlu;123;Kısa telefonlu satır özeti.\n")
assert.equal(shortPhone.view.rows[0]?.kind, "hata")

const branches = preview([
  "ad;kategori;sehir;semt;telefon;ozet",
  "Papatya Lokanta;yeme;Zonguldak;Merkez;03720000011;Merkezde ev yemeği ve ızgara.",
  "Papatya Lokanta;yeme;Zonguldak;Kozlu;03720000012;Kozlu'da ayrı bir şube kahvaltısı.",
].join("\n"))
assert.equal(branches.view.counts.yeni, 2)

const catalog = preview("ad;kategori;sehir;semt;telefon;ozet\nBalıkçı Mehmet;yeme;İstanbul;Karaköy;0212 555 01 18;Katalogdaki şube yeni kart açmamalı.\n")
assert.equal(catalog.view.rows[0]?.kind, "olasi")
const forced = commitImport(catalog.grid, suggestMap(catalog.grid.headers), emptyBook(), now, { updates: [], force: [], publish: "yayinda" })
assert.equal(forced.added, 0)

const formula = preview('ad;kategori;sehir;semt;telefon;ozet\n"=HYPERLINK(""http://evil"")";yok;Zonguldak;Kozlu;03720000031;Formül metin olarak kalır ve çalışmaz.\n')
assert.equal(formula.view.rows[0]?.kind, "hata")
assert.equal(formula.view.report.includes("'=HYPERLINK"), true)

let book = emptyBook()
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

const first = commitImport(branches.grid, suggestMap(branches.grid.headers), emptyBook(), now, { updates: [], force: [], publish: "onay" })
assert.equal(first.added, 2)
assert.equal(first.listings[0]?.hidden, true)
assert.equal(first.listings[0]?.review, "onay")
assert.equal(first.listings[0]?.verified, false)
const again = classifyGrid(branches.grid, suggestMap(branches.grid.headers), first.book)
assert.equal(again.counts.zaten, 2)
assert.equal(again.counts.yeni, 0)
const changed = branches.grid.rows[0]
if (!changed) throw new Error("row")
const edited = {
  ...branches.grid,
  rows: branches.grid.rows.map((row, index) => index === 0 ? { ...row, cells: row.cells.map((cell, cellIndex) => cellIndex === 5 ? "Merkezde güncellenmiş uzun yemek özeti." : cell) } : row),
}
const updateView = classifyGrid(edited, suggestMap(edited.headers), first.book)
assert.equal(updateView.rows.find((row) => row.line === changed.line)?.kind, "guncelle")
const blocked = commitImport(edited, suggestMap(edited.headers), first.book, now, { updates: [], force: [], publish: "onay" })
assert.equal(blocked.updated, 0)
assert.equal(blocked.book.listings.find((item) => item.name === "Papatya Lokanta" && item.district === "Merkez")?.summary, "Merkezde ev yemeği ve ızgara.")
const applied = commitImport(edited, suggestMap(edited.headers), first.book, now, { updates: [changed.line], force: [], publish: "onay" })
assert.equal(applied.updated, 1)
assert.equal(applied.book.listings.find((item) => item.name === "Papatya Lokanta" && item.district === "Merkez")?.summary, "Merkezde güncellenmiş uzun yemek özeti.")
const roundTrip = parseBook(JSON.stringify(applied.book))
assert.equal(roundTrip?.listings.length, 2)

function zipStored(files: Record<string, string>) {
  const encoder = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const [name, text] of Object.entries(files)) {
    const fileName = encoder.encode(name)
    const data = encoder.encode(text)
    const local = new Uint8Array(30 + fileName.length + data.length)
    const view = new DataView(local.buffer)
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(8, 0, true)
    view.setUint32(18, data.length, true)
    view.setUint32(22, data.length, true)
    view.setUint16(26, fileName.length, true)
    local.set(fileName, 30)
    local.set(data, 30 + fileName.length)
    locals.push(local)
    const central = new Uint8Array(46 + fileName.length)
    const centralView = new DataView(central.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint32(20, data.length, true)
    centralView.setUint32(24, data.length, true)
    centralView.setUint16(28, fileName.length, true)
    centralView.setUint32(42, offset, true)
    central.set(fileName, 46)
    centrals.push(central)
    offset += local.length
  }
  const centralSize = centrals.reduce((sum, item) => sum + item.length, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, centrals.length, true)
  endView.setUint16(10, centrals.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, offset, true)
  const all = [...locals, ...centrals, end]
  const bytes = new Uint8Array(all.reduce((sum, item) => sum + item.length, 0))
  let cursor = 0
  for (const part of all) {
    bytes.set(part, cursor)
    cursor += part.length
  }
  return bytes
}

const sheet = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>ad</t></is></c><c r="B1" t="inlineStr"><is><t>kategori</t></is></c><c r="C1" t="inlineStr"><is><t>sehir</t></is></c><c r="D1" t="inlineStr"><is><t>semt</t></is></c><c r="E1" t="inlineStr"><is><t>telefon</t></is></c><c r="F1" t="inlineStr"><is><t>ozet</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Lale Börek</t></is></c><c r="B2" t="inlineStr"><is><t>yeme</t></is></c><c r="C2" t="inlineStr"><is><t>Zonguldak</t></is></c><c r="D2" t="inlineStr"><is><t>Merkez</t></is></c><c r="E2" t="inlineStr"><is><t>03720000077</t></is></c><c r="F2" t="inlineStr"><is><t>Merkezde taze börek ve çay.</t></is></c><c r="G2"><f>1+1</f></c></row></sheetData></worksheet>`
const xlsx = await readXlsxGrid(zipStored({
  "xl/workbook.xml": `<?xml version="1.0"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sayfa1" sheetId="1" r:id="rId1"/></sheets></workbook>`,
  "xl/_rels/workbook.xml.rels": `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
  "xl/worksheets/sheet1.xml": sheet,
}))
assert.equal("error" in xlsx, false)
if (!("error" in xlsx)) {
  const viewed = classifyGrid(xlsx, suggestMap(xlsx.headers), emptyBook())
  assert.equal(viewed.rows[0]?.name, "Lale Börek")
  assert.equal(viewed.rows[0]?.kind, "yeni")
}
