import { fold } from "@/lib/format"

type Alias = { id: string; phrase: string; focus?: string }

const aliases: Alias[] = [
  { id: "saglik", phrase: "dentist", focus: "dis" },
  { id: "saglik", phrase: "dental", focus: "dis" },
  { id: "saglik", phrase: "zahnarzt", focus: "dis" },
  { id: "saglik", phrase: "dentiste", focus: "dis" },
  { id: "saglik", phrase: "dentista", focus: "dis" },
  { id: "saglik", phrase: "стоматолог", focus: "dis" },
  { id: "saglik", phrase: "牙医", focus: "dis" },
  { id: "saglik", phrase: "歯科", focus: "dis" },
  { id: "saglik", phrase: "치과", focus: "dis" },
  { id: "saglik", phrase: "दंत", focus: "dis" },
  { id: "saglik", phrase: "طبيب", focus: "dis" },
  { id: "eczane", phrase: "pharmacy" },
  { id: "eczane", phrase: "apothecary" },
  { id: "eczane", phrase: "apotheke" },
  { id: "eczane", phrase: "pharmacie" },
  { id: "eczane", phrase: "farmacia" },
  { id: "eczane", phrase: "farmácia" },
  { id: "eczane", phrase: "аптека" },
  { id: "eczane", phrase: "药店" },
  { id: "eczane", phrase: "薬局" },
  { id: "eczane", phrase: "약국" },
  { id: "eczane", phrase: "صيدلية" },
  { id: "yeme", phrase: "restaurant" },
  { id: "yeme", phrase: "restaurante" },
  { id: "yeme", phrase: "café" },
  { id: "yeme", phrase: "cafe" },
  { id: "yeme", phrase: "breakfast" },
  { id: "yeme", phrase: "dinner" },
  { id: "yeme", phrase: "ресторан" },
  { id: "yeme", phrase: "餐厅" },
  { id: "yeme", phrase: "レストラン" },
  { id: "yeme", phrase: "레스토랑" },
  { id: "yeme", phrase: "مطعم" },
  { id: "yeme", phrase: "रेस्तरां" },
  { id: "konaklama", phrase: "hotel" },
  { id: "konaklama", phrase: "hôtel" },
  { id: "konaklama", phrase: "отель" },
  { id: "konaklama", phrase: "酒店" },
  { id: "konaklama", phrase: "ホテル" },
  { id: "konaklama", phrase: "호텔" },
  { id: "konaklama", phrase: "فندق" },
  { id: "konaklama", phrase: "होटल" },
  { id: "hukuk", phrase: "lawyer" },
  { id: "hukuk", phrase: "attorney" },
  { id: "hukuk", phrase: "anwalt" },
  { id: "hukuk", phrase: "avocat" },
  { id: "hukuk", phrase: "abogado" },
  { id: "hukuk", phrase: "advogado" },
  { id: "hukuk", phrase: "адвокат" },
  { id: "hukuk", phrase: "律师" },
  { id: "hukuk", phrase: "弁護士" },
  { id: "hukuk", phrase: "변호사" },
  { id: "hukuk", phrase: "محامي" },
  { id: "hukuk", phrase: "वकील" },
  { id: "usta", phrase: "plumber", focus: "tesisat" },
  { id: "usta", phrase: "klempner", focus: "tesisat" },
  { id: "usta", phrase: "plombier", focus: "tesisat" },
  { id: "usta", phrase: "fontanero", focus: "tesisat" },
  { id: "usta", phrase: "encanador", focus: "tesisat" },
  { id: "usta", phrase: "сантехник", focus: "tesisat" },
  { id: "usta", phrase: "水管工", focus: "tesisat" },
  { id: "usta", phrase: "配管", focus: "tesisat" },
  { id: "usta", phrase: "배관", focus: "tesisat" },
  { id: "usta", phrase: "سباك", focus: "tesisat" },
  { id: "usta", phrase: "प्लंबर", focus: "tesisat" },
  { id: "usta", phrase: "electrician", focus: "elektrik" },
  { id: "oto", phrase: "mechanic" },
  { id: "oto", phrase: "auto repair" },
  { id: "oto", phrase: "car service" },
  { id: "temizlik", phrase: "cleaning" },
  { id: "temizlik", phrase: "cleaner" },
  { id: "guzellik", phrase: "hair salon" },
  { id: "guzellik", phrase: "barber" },
  { id: "emlak", phrase: "real estate" },
  { id: "cocuk", phrase: "kindergarten" },
  { id: "cocuk", phrase: "daycare" },
  { id: "egitim", phrase: "language course" },
]

const folded = aliases.map((item) => ({ ...item, phrase: fold(item.phrase) }))

export function worldAliases(id: string) {
  return folded.filter((item) => item.id === id)
}

export function worldFocus(id: string, phrase: string) {
  return folded.find((item) => item.id === id && item.phrase === phrase)?.focus
}

export function isWorldPhrase(id: string, phrase: string) {
  return folded.some((item) => item.id === id && item.phrase === phrase)
}
