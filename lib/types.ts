export type CategoryId =
  | "yeme"
  | "konaklama"
  | "guzellik"
  | "ev"
  | "usta"
  | "saglik"
  | "b2b"
  | "dekor"

export type BookingKind = "randevu" | "rezervasyon" | "teklif"

export type Service = {
  name: string
  price: number
  unit: string
}

export type Review = {
  id: string
  author: string
  rating: number
  date: string
  text: string
  helpful: number
}

export type DayHours = {
  day: string
  hours: string
}

export type Fact = {
  label: string
  value: string
}

export type Business = {
  id: string
  slug: string
  name: string
  category: CategoryId
  subcategory: string
  city: string
  district: string
  address: string
  lat: number
  lng: number
  phone: string
  rating: number
  reviewCount: number
  priceLevel: 1 | 2 | 3 | 4
  openNow: boolean
  summary: string
  about: string
  services: Service[]
  amenities: string[]
  tags: string[]
  reviews: Review[]
  premium: boolean
  verified: boolean
  responseMinutes: number
  founded: number
  photo: string
  photoPosition: string
  booking: BookingKind
  hours: DayHours[]
  facts: Fact[]
  source: "katalog" | "senin"
}

export type Lead = {
  id: string
  businessId: string
  businessName: string
  kind: BookingKind
  name: string
  phone: string
  note: string
  when: string
  createdAt: string
}

export type SortKey = "ilgili" | "puan" | "yorum" | "mesafe" | "yanit" | "fiyat"

export type Filters = {
  sehir: string
  kategori: CategoryId | "hepsi"
  minRating: number
  maxPrice: number
  openNow: boolean
  verified: boolean
  premium: boolean
  sort: SortKey
}
