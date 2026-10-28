export type CategoryId = string

export type BookingKind = "randevu" | "rezervasyon" | "teklif"

/** Who runs the record: a public body, a private party or a civil-society organisation. Kept apart from the sector tree. */
export type OrgKind = "kamu" | "ozel" | "stk"

/** Under which structure the service is offered; also independent of the sector tree. */
export type ProviderKind =
  | "kurum"
  | "isletme"
  | "usta"
  | "ulasim"
  | "icerik"
  | "serbest"
  | "diger"
  | "dernek"
  | "vakif"
  | "birlik"
  | "spor-kulubu"
  | "meslek-odasi"
  | "ticaret-odasi"

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

export type TimeRange = { start: string; end: string }

export type DayPlan = { closed: boolean; ranges: TimeRange[] }

export type SpecialDay = { date: string; closed: boolean; ranges: TimeRange[]; note: string }

export type ManualMark = { mode: "open" | "closed"; until: string; at: string; by?: string }

export type HourBook = { week: DayPlan[]; specials: SpecialDay[]; manual: ManualMark | null }

export type Presence = {
  state: "open" | "closed" | "unknown"
  source: "week" | "special" | "manual" | "unknown"
  labelKey: "hours.open" | "hours.closed" | "hours.manualOpen" | "hours.manualClosed" | "hours.unknown"
  detailKey: "" | "hours.nextOpen" | "hours.nextClose"
  time: string
  note: string
  today: number
  until: string
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
  /** Public permanent Pinwego id (`PW-` + 9 digits). Not a login secret. */
  pin?: string
  name: string
  category: CategoryId
  subcategory: string
  /** Further sector or sub-sector ids beyond the primary `category`. */
  categories?: CategoryId[]
  orgKind?: OrgKind
  /** Public status is a claim until an admin confirms it. */
  orgVerified?: boolean
  providerKind?: ProviderKind
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
  hourBook?: HourBook
  presence?: Presence
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
    | "subcategory"
    | "categories"
    | "orgKind"
    | "orgVerified"
    | "providerKind"
    | "city"
    | "district"
    | "address"
    | "priceLevel"
    | "booking"
    | "website"
    | "links"
    | "hours"
    | "hourBook"
    | "services"
    | "founded"
    | "photo"
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
