export type CategoryId =
  | "restoranlar"
  | "kafeler"
  | "guzellik"
  | "ev-hizmetleri"
  | "saglik"
  | "b2b"
  | "konaklama"
  | "profesyonel"
  | "alisveris"
  | "otomotiv"

export type PriceLevel = 1 | 2 | 3 | 4

export type Review = {
  id: string
  author: string
  rating: number
  date: string
  text: string
  helpful: number
  photos?: string[]
  visitType?: string
}

export type Service = {
  id: string
  name: string
  durationMin: number
  price: number
  description?: string
}

export type BusinessIntel = {
  founded: number
  employees: string
  industry: string
  revenue?: string
  taxId?: string
  exportMarkets?: string[]
}

export type DayHours = {
  open: string
  close: string
  closed?: boolean
}

export type Business = {
  slug: string
  name: string
  category: CategoryId
  subcategory: string
  city: string
  citySlug: string
  district: string
  country: string
  address: string
  lat: number
  lng: number
  phone: string
  website?: string
  rating: number
  reviewCount: number
  priceLevel: PriceLevel
  tags: string[]
  amenities: string[]
  description: string
  hours: Record<string, DayHours>
  cover: string
  photos: string[]
  verified: boolean
  premium: boolean
  services?: Service[]
  quoteEnabled?: boolean
  intel?: BusinessIntel
  reviews: Review[]
  staff?: { id: string; name: string; role: string }[]
}

export type SearchIntent = {
  query: string
  category?: CategoryId
  city?: string
  district?: string
  priceMax?: PriceLevel
  priceMin?: PriceLevel
  tags: string[]
  amenities: string[]
  openNow?: boolean
  tonight?: boolean
  nearMe?: boolean
  wantsBooking?: boolean
  wantsQuote?: boolean
  partySize?: number
  sort: "relevance" | "rating" | "reviews" | "distance"
}

export type SearchResult = {
  intent: SearchIntent
  explanation: string
  chips: string[]
  businesses: Array<Business & { score: number; distanceKm?: number }>
}
