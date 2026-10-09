import assert from "node:assert/strict"
import { businesses } from "./catalog"
import { businessInPlace, type Place } from "./place"

function place(patch: Partial<Place>): Place {
  return {
    label: "Zonguldak",
    country: "Türkiye",
    countryCode: "tr",
    region: "Karadeniz Bölgesi",
    province: "Zonguldak",
    district: "",
    neighborhood: "",
    lat: 41.453,
    lng: 31.789,
    nearMe: false,
    ...patch,
  }
}

const google = businesses.filter((item) => item.source === "google" && item.city === "Zonguldak")

function names(area: Partial<Place>) {
  return google.filter((item) => businessInPlace(item, place(area))).map((item) => item.district)
}

const province = names({})
assert.equal(province.length, 50, `il seçiminde ${province.length} kayıt`)

const merkez = names({ district: "Zonguldak Merkez" })
assert.ok(merkez.length > 0, "Zonguldak Merkez boş")
assert.ok(merkez.every((item) => item === "Merkez"), `merkez dışı: ${[...new Set(merkez)].join(", ")}`)

const eregli = names({ district: "Ereğli" })
assert.ok(eregli.length > 0 && eregli.every((item) => item === "Karadeniz Ereğli"))
assert.equal(
  google.some((item) => item.name === "Opet Kozlu" && businessInPlace(item, place({ district: "Ereğli" }))),
  false,
)

const alapli = names({ district: "Alaplı İlçesi" })
assert.ok(alapli.length > 0 && alapli.every((item) => item === "Alaplı"))

const caycuma = names({ district: "Çaycuma İlçesi" })
assert.ok(caycuma.length === 1 && caycuma[0] === "Çaycuma")

const kozlu = names({ district: "Kozlu" })
assert.ok(kozlu.length > 0 && kozlu.every((item) => item === "Kozlu"))

const kadikoy = businesses.filter((item) =>
  businessInPlace(
    item,
    place({
      province: "İstanbul",
      district: "Kadıköy",
      region: "Marmara Bölgesi",
      lat: 40.99,
      lng: 29.03,
    }),
  ),
)
assert.ok(kadikoy.length > 0)
assert.ok(kadikoy.every((item) => item.city === "İstanbul" && item.district === "Kadıköy"))
assert.equal(kadikoy.some((item) => item.city === "Zonguldak"), false)

const moda = businesses.filter((item) =>
  businessInPlace(
    item,
    place({
      province: "İstanbul",
      district: "Kadıköy",
      neighborhood: "Moda",
      region: "Marmara Bölgesi",
    }),
  ),
)
assert.ok(moda.some((item) => item.address.includes("Moda")))
assert.ok(moda.every((item) => item.city === "İstanbul"))

console.log(
  `zonguldak ${province.length}, merkez ${merkez.length}, ereğli ${eregli.length}, alaplı ${alapli.length}, kozlu ${kozlu.length}`,
)
