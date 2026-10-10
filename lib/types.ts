export type CategoryId = string

export type BookingKind = "randevu" | "rezervasyon" | "teklif"

export type Sector = {
  id: CategoryId
  label: string
  blurb: string
  photo: string
  tint: string
  icon: string
  booking: BookingKind
  phrases: string[]
  custom?: boolean
}

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

export type BusinessContacts = Partial<Record<"landline" | "mobile" | "whatsapp", string>>

export type BusinessLinks = Partial<
  Record<
    | "website"
    | "facebook"
    | "instagram"
    | "x"
    | "linkedin"
    | "youtube"
    | "tiktok"
    | "n11"
    | "sahibinden"
    | "arabam"
    | "hepsiemlak"
    | "emlakjet",
    string
  >
>

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
  contacts?: BusinessContacts
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
  source: "katalog" | "senin" | "google"
  website?: string
  googleUrl?: string
  links?: BusinessLinks
  ownerAccountId?: string
  profile?: BusinessProfile
}

export type ChatKind = "musteri-isletme" | "isletme-isletme"

export type ChatThread = {
  id: string
  kind: ChatKind
  listingId: string
  listingSlug: string
  listingName: string
  members: string[]
  updatedAt: string
  lastText: string
  lastFromId: string
}

export type ChatMessage = {
  id: string
  threadId: string
  fromId: string
  fromName: string
  text: string
  createdAt: string
  readBy: string[]
}

export type ChatNotice = {
  id: string
  accountId: string
  title: string
  body: string
  threadId: string
}

export type ChatBlock = {
  id: string
  threadId: string
  blockerId: string
  createdAt: string
}

export type ProfileChoice = "" | "var" | "yok"

export type ProfileService = {
  id: string
  name: string
  summary: string
  detail: string
  price: number
  unit: string
  duration: string
  area: string
  image: string
  alt: string
  seoTags: string[]
  aiTags: string[]
  active: boolean
  order: number
}

export type GalleryItem = {
  id: string
  image: string
  title: string
  description: string
  alt: string
  seoTags: string[]
  aiTags: string[]
  active: boolean
  order: number
}

export type BusinessProfile = {
  shortTitle: string
  shortBody: string
  highlights: string[]
  aboutTitle: string
  aboutBody: string
  seoTitle: string
  seoDescription: string
  seoTags: string[]
  aiTags: string[]
  pendingAiTags: string[]
  founded: string
  serviceArea: string
  staffCount: string
  payments: string[]
  parking: ProfileChoice
  access: ProfileChoice
  appointment: ProfileChoice
  online: ProfileChoice
  onSite: ProfileChoice
  services: ProfileService[]
  gallery: GalleryItem[]
  published: boolean
}

export type BusinessOverride = Partial<
  Pick<
    Business,
    | "name"
    | "phone"
    | "contacts"
    | "summary"
    | "about"
    | "verified"
    | "premium"
    | "openNow"
    | "category"
    | "city"
    | "district"
    | "address"
    | "priceLevel"
    | "booking"
    | "website"
    | "links"
    | "hours"
    | "services"
    | "founded"
    | "profile"
  >
>

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
