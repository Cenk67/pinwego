import type { CategoryId } from "./types"

export const CATEGORIES: Array<{
  id: CategoryId
  label: string
  hint: string
  icon: string
  inspiredBy: string
}> = [
  {
    id: "restoranlar",
    label: "Restoranlar",
    hint: "Yorum, fotoğraf, menü",
    icon: "utensils",
    inspiredBy: "Yelp + Tripadvisor",
  },
  {
    id: "kafeler",
    label: "Kafeler",
    hint: "Yakınımda + çalışma alanı",
    icon: "coffee",
    inspiredBy: "Yelp",
  },
  {
    id: "guzellik",
    label: "Güzellik & bakım",
    hint: "Hizmet → fiyat → randevu",
    icon: "scissors",
    inspiredBy: "Booksy",
  },
  {
    id: "ev-hizmetleri",
    label: "Ev hizmetleri",
    hint: "Teklif topla, uzman eşleştir",
    icon: "hammer",
    inspiredBy: "Thumbtack + Angi",
  },
  {
    id: "saglik",
    label: "Sağlık",
    hint: "Klinik profili + randevu",
    icon: "stethoscope",
    inspiredBy: "Booksy",
  },
  {
    id: "b2b",
    label: "B2B & ticari",
    hint: "Firma istihbaratı",
    icon: "building",
    inspiredBy: "D&B + Kompass",
  },
  {
    id: "konaklama",
    label: "Konaklama",
    hint: "Seyahat + reputasyon",
    icon: "hotel",
    inspiredBy: "Tripadvisor",
  },
  {
    id: "profesyonel",
    label: "Profesyonel hizmet",
    hint: "Avukat, mali müşavir",
    icon: "briefcase",
    inspiredBy: "Thumbtack",
  },
  {
    id: "alisveris",
    label: "Alışveriş & dekor",
    hint: "Görsel + ürün + firma",
    icon: "shopping",
    inspiredBy: "Houzz",
  },
  {
    id: "otomotiv",
    label: "Otomotiv",
    hint: "Servis + randevu",
    icon: "car",
    inspiredBy: "Yellow Pages",
  },
]

export const CITIES = [
  { slug: "istanbul", label: "İstanbul", country: "Türkiye", lat: 41.0082, lng: 28.9784 },
  { slug: "ankara", label: "Ankara", country: "Türkiye", lat: 39.9334, lng: 32.8597 },
  { slug: "izmir", label: "İzmir", country: "Türkiye", lat: 38.4237, lng: 27.1428 },
  { slug: "antalya", label: "Antalya", country: "Türkiye", lat: 36.8969, lng: 30.7133 },
  { slug: "bursa", label: "Bursa", country: "Türkiye", lat: 40.1826, lng: 29.0665 },
  { slug: "new-york", label: "New York", country: "ABD", lat: 40.7128, lng: -74.006 },
  { slug: "london", label: "Londra", country: "Birleşik Krallık", lat: 51.5074, lng: -0.1278 },
] as const

export const USER_LOCATION = {
  label: "Kadıköy, İstanbul",
  citySlug: "istanbul",
  lat: 40.9903,
  lng: 29.029,
}

export const WEEKDAYS = [
  "pazartesi",
  "sali",
  "carsamba",
  "persembe",
  "cuma",
  "cumartesi",
  "pazar",
] as const

export const WEEKDAY_LABELS: Record<(typeof WEEKDAYS)[number], string> = {
  pazartesi: "Pazartesi",
  sali: "Salı",
  carsamba: "Çarşamba",
  persembe: "Perşembe",
  cuma: "Cuma",
  cumartesi: "Cumartesi",
  pazar: "Pazar",
}
