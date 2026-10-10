import { categoryById, cityCenter } from "./catalog"
import { distanceKm, fold } from "./format"
import type {
  Business,
  BusinessProfile,
  GalleryItem,
  ProfileChoice,
  ProfileService,
  Service,
} from "@/lib/types"

export const PROFILE_ORIGIN = "https://pinwego.com"
export const GALLERY_LIMIT = 10
export const SERVICE_LIMIT = 40
const TAG_LIMIT = 24
const PAYMENTS = ["Nakit", "Kart", "Havale", "Online"]

export type MatchIntent = {
  category?: string
  city?: string
  district?: string
  services: string[]
  aiTags: string[]
  night?: boolean
  onSite?: boolean
  openNow?: boolean
}

export type MatchBreakdown = {
  total: number
  category: number
  service: number
  location: number
  ai: number
  purpose: number
  reasons: string[]
}

export function tagKey(value: string) {
  return fold(value)
}

export function cleanTags(values: string[], limit = TAG_LIMIT) {
  const seen = new Set<string>()
  const next: string[] = []
  for (const value of values) {
    const label = value.replace(/\s+/g, " ").replace(/[<>]/g, "").trim()
    const key = tagKey(label)
    if (key.length < 2 || seen.has(key)) continue
    seen.add(key)
    next.push(label)
    if (next.length >= limit) break
  }
  return next
}

function text(value: unknown, limit: number) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit)
}

function sentences(value: string) {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function choice(value: unknown): ProfileChoice {
  return value === "var" || value === "yok" ? value : ""
}

function choiceLabel(value: ProfileChoice) {
  if (value === "var") return "Var"
  if (value === "yok") return "Yok"
  return ""
}

function serviceId(name: string, index: number) {
  return `hizmet-${tagKey(name).replace(/\s+/g, "-") || index}`
}

export function servesAtNight(business: Business) {
  return business.hours.some((day) => /2[2-3]:|00:|24/.test(day.hours))
}

export function deriveProfile(business: Business): BusinessProfile {
  const category = categoryById(business.category)
  const summary = sentences(business.summary)
  const about = sentences(business.about).filter((item) => !summary.includes(item))
  const shortBody = [...summary, ...about].slice(0, 4).join(" ")
  const seoTags = cleanTags([
    business.subcategory,
    `${business.city} ${business.subcategory}`,
    `${business.district} ${business.subcategory}`,
    category.label,
  ])
  const aiTags = cleanTags([
    `${business.subcategory} arıyorum`,
    `yakınımdaki ${business.subcategory.toLocaleLowerCase("tr-TR")}`,
    `${business.city} ${business.subcategory.toLocaleLowerCase("tr-TR")}`,
    ...business.services.map((service) => service.name),
  ])
  return {
    shortTitle: business.subcategory,
    shortBody,
    highlights: cleanTags(business.amenities, 6),
    aboutTitle: "Hakkımızda",
    aboutBody: business.about,
    seoTitle: `${business.name} | ${business.subcategory}, ${business.district}`,
    seoDescription: shortBody.slice(0, 160),
    seoTags,
    aiTags,
    pendingAiTags: [],
    founded: business.founded > 0 ? String(business.founded) : "",
    serviceArea: business.city,
    staffCount: "",
    payments: [],
    parking: "",
    access: "",
    appointment: business.booking === "randevu" || business.booking === "rezervasyon" ? "var" : "",
    online: "",
    onSite: "",
    services: business.services.map((service, index) => ({
      id: serviceId(service.name, index),
      name: service.name,
      summary: "",
      detail: "",
      price: service.price,
      unit: service.unit,
      duration: "",
      area: business.city,
      image: "",
      alt: "",
      seoTags: [],
      aiTags: cleanTags([service.name]),
      active: true,
      order: index,
    })),
    gallery: business.photo
      ? [
          {
            id: "kapak",
            image: business.photo,
            title: business.name,
            description: `${business.subcategory}, ${business.district}`,
            alt: `${business.name}, ${business.district}`,
            seoTags: seoTags.slice(0, 4),
            aiTags: [],
            active: true,
            order: 0,
          },
        ]
      : [],
    published: true,
  }
}

function asService(value: unknown, index: number): ProfileService | null {
  if (!value || typeof value !== "object") return null
  const item = value as Partial<ProfileService>
  const name = text(item.name, 80)
  if (!name) return null
  const price = Number(item.price)
  return {
    id: text(item.id, 40) || serviceId(name, index),
    name,
    summary: text(item.summary, 180),
    detail: text(item.detail, 800),
    price: Number.isFinite(price) && price >= 0 ? Math.round(price) : 0,
    unit: text(item.unit, 40),
    duration: text(item.duration, 40),
    area: text(item.area, 80),
    image: safeImage(item.image),
    alt: text(item.alt, 160),
    seoTags: cleanTags(Array.isArray(item.seoTags) ? item.seoTags : []),
    aiTags: cleanTags(Array.isArray(item.aiTags) ? item.aiTags : []),
    active: item.active !== false,
    order: index,
  }
}

function asGallery(value: unknown, index: number): GalleryItem | null {
  if (!value || typeof value !== "object") return null
  const item = value as Partial<GalleryItem>
  const image = safeImage(item.image)
  if (!image) return null
  return {
    id: text(item.id, 40) || `galeri-${index}`,
    image,
    title: text(item.title, 80),
    description: text(item.description, 240),
    alt: text(item.alt, 160),
    seoTags: cleanTags(Array.isArray(item.seoTags) ? item.seoTags : []),
    aiTags: cleanTags(Array.isArray(item.aiTags) ? item.aiTags : []),
    active: item.active !== false,
    order: index,
  }
}

function safeImage(value: unknown) {
  const image = text(value, 1_500_000)
  if (image.startsWith("/") || image.startsWith("https://") || image.startsWith("data:image/")) return image
  return ""
}

export function normalizeProfile(value: unknown, fallback: BusinessProfile): BusinessProfile {
  const item = value && typeof value === "object" ? (value as Partial<BusinessProfile>) : {}
  const services = (Array.isArray(item.services) ? item.services : fallback.services)
    .map(asService)
    .filter((service): service is ProfileService => Boolean(service))
    .slice(0, SERVICE_LIMIT)
    .map((service, index) => ({ ...service, order: index }))
  const gallery = (Array.isArray(item.gallery) ? item.gallery : fallback.gallery)
    .map(asGallery)
    .filter((slide): slide is GalleryItem => Boolean(slide))
    .slice(0, GALLERY_LIMIT)
    .map((slide, index) => ({ ...slide, order: index }))
  return {
    shortTitle: text(item.shortTitle, 80) || fallback.shortTitle,
    shortBody: text(item.shortBody, 600) || fallback.shortBody,
    highlights: cleanTags(Array.isArray(item.highlights) ? item.highlights : fallback.highlights, 6),
    aboutTitle: text(item.aboutTitle, 80) || "Hakkımızda",
    aboutBody: text(item.aboutBody, 2000) || fallback.aboutBody,
    seoTitle: text(item.seoTitle, 120) || fallback.seoTitle,
    seoDescription: text(item.seoDescription, 180) || fallback.seoDescription,
    seoTags: cleanTags(Array.isArray(item.seoTags) ? item.seoTags : fallback.seoTags),
    aiTags: cleanTags(Array.isArray(item.aiTags) ? item.aiTags : fallback.aiTags),
    pendingAiTags: cleanTags(Array.isArray(item.pendingAiTags) ? item.pendingAiTags : []),
    founded: text(item.founded, 4),
    serviceArea: text(item.serviceArea, 80),
    staffCount: text(item.staffCount, 40),
    payments: cleanTags(Array.isArray(item.payments) ? item.payments : [], 4).filter((payment) => PAYMENTS.includes(payment)),
    parking: choice(item.parking),
    access: choice(item.access),
    appointment: choice(item.appointment),
    online: choice(item.online),
    onSite: choice(item.onSite),
    services,
    gallery,
    published: item.published !== false,
  }
}

export function resolveProfile(business: Business) {
  const derived = deriveProfile(business)
  if (!business.profile) return derived
  return normalizeProfile(business.profile, derived)
}

export function activeServices(profile: BusinessProfile) {
  return profile.services.filter((service) => service.active && service.name).sort((a, b) => a.order - b.order)
}

export function activeGallery(profile: BusinessProfile) {
  return profile.gallery.filter((item) => item.active && item.image).sort((a, b) => a.order - b.order)
}

export function listingFields(profile: BusinessProfile): {
  summary: string
  about: string
  services: Service[]
  founded: number
  profile: BusinessProfile
} {
  const founded = Number(profile.founded)
  return {
    summary: profile.shortBody,
    about: profile.aboutBody,
    services: activeServices(profile).map((service) => ({
      name: service.name,
      price: service.price,
      unit: service.unit || "adet",
    })),
    founded: Number.isInteger(founded) && founded > 1800 && founded < 2100 ? founded : 0,
    profile,
  }
}

export function summaryRows(business: Business, profile: BusinessProfile) {
  const category = categoryById(business.category)
  const rows = [
    ["Kategori", category.label],
    ["Alt kategori", business.subcategory],
    ["Kuruluş yılı", profile.founded],
    ["Hizmet bölgesi", profile.serviceArea],
    ["Çalışan sayısı", profile.staffCount],
    ["Ödeme yöntemleri", profile.payments.join(", ")],
    ["Otopark", choiceLabel(profile.parking)],
    ["Engelli erişimi", choiceLabel(profile.access)],
    ["Randevu sistemi", choiceLabel(profile.appointment)],
    ["Online hizmet", choiceLabel(profile.online)],
    ["Yerinde hizmet", choiceLabel(profile.onSite)],
    ["Doğrulama", business.verified ? "Doğrulanmış işletme" : ""],
  ]
  return rows.filter((row): row is [string, string] => Boolean(row[1]))
}

export function suggestAiTags(business: Business, profile: BusinessProfile) {
  const category = categoryById(business.category)
  const lower = business.subcategory.toLocaleLowerCase("tr-TR")
  const ideas = [
    `${lower} arıyorum`,
    `yakınımdaki ${lower}`,
    `${business.city} ${lower}`,
    `${business.district} ${lower}`,
    `uygun fiyatlı ${lower}`,
    ...activeServices(profile).flatMap((service) => [
      service.name,
      `${service.name.toLocaleLowerCase("tr-TR")} yaptırmak istiyorum`,
    ]),
    ...profile.highlights,
    category.label,
  ]
  if (business.priceLevel <= 2) ideas.push(`uygun fiyatlı ${lower}`)
  if (business.contacts?.whatsapp) ideas.push("WhatsApp üzerinden ulaşabileceğim işletme")
  if (business.openNow) ideas.push(`şu an açık ${lower}`)
  if (servesAtNight(business)) ideas.push(`gece açık ${lower}`)
  if (profile.onSite === "var") ideas.push(`eve servis ${lower}`)
  if (profile.appointment === "var") ideas.push(`${lower} randevusu`)
  const taken = new Set([...profile.aiTags, ...profile.pendingAiTags].map(tagKey))
  return cleanTags(ideas).filter((tag) => !taken.has(tagKey(tag)))
}

function overlap(left: string[], right: string[]) {
  const keys = new Set(right.map(tagKey))
  return left.filter((item) => keys.has(tagKey(item)))
}

export function matchBreakdown(business: Business, intent: MatchIntent): MatchBreakdown {
  const profile = resolveProfile(business)
  const reasons: string[] = []
  const category = intent.category ? (business.category === intent.category ? 100 : 0) : 70
  if (intent.category && category === 100) reasons.push("Kategori uyuyor")

  const names = activeServices(profile).map((service) => service.name)
  const serviceHits = intent.services.length ? overlap(intent.services, [...names, ...profile.seoTags, business.subcategory]) : []
  const service = intent.services.length ? Math.round((serviceHits.length / intent.services.length) * 100) : names.length ? 60 : 20
  if (serviceHits.length) reasons.push("Hizmet uyuyor")

  let location = 40
  if (intent.city) {
    location = fold(business.city) === fold(intent.city) ? 80 : 0
    if (location === 80) reasons.push(business.city)
  }
  if (intent.district && fold(business.district) === fold(intent.district)) {
    location = 100
    reasons.push(business.district)
  }

  const tags = [...profile.aiTags, ...activeServices(profile).flatMap((service) => service.aiTags)]
  const tagHits = intent.aiTags.length ? overlap(intent.aiTags, tags) : []
  const ai = intent.aiTags.length ? Math.round((tagHits.length / intent.aiTags.length) * 100) : tags.length ? 50 : 0
  if (tagHits.length) reasons.push("Arama niyeti uyuyor")

  const checks = [intent.night, intent.onSite, intent.openNow].filter((item) => item !== undefined)
  let purposeHits = 0
  if (intent.night) purposeHits += servesAtNight(business) ? 1 : 0
  if (intent.onSite) purposeHits += profile.onSite === "var" ? 1 : 0
  if (intent.openNow) purposeHits += business.openNow ? 1 : 0
  const purpose = checks.length ? Math.round((purposeHits / checks.length) * 100) : 50
  if (intent.night && servesAtNight(business)) reasons.push("Gece açık")
  if (intent.onSite && profile.onSite === "var") reasons.push("Eve servis")
  if (intent.openNow && business.openNow) reasons.push("Şu an açık")

  const total = Math.round(category * 0.28 + service * 0.24 + location * 0.22 + ai * 0.16 + purpose * 0.1)
  return { total, category, service, location, ai, purpose, reasons }
}

export function profileReadiness(profile: BusinessProfile) {
  const checks = [
    profile.shortBody.length > 40,
    profile.aboutBody.length > 40,
    activeServices(profile).length > 0,
    activeGallery(profile).length > 0,
    profile.seoTags.length > 0,
    profile.aiTags.length > 0,
    profile.serviceArea.length > 0,
    profile.seoTitle.length > 0 && profile.seoDescription.length > 0,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

export function recommendBusinesses(list: Business[], business: Business) {
  const profile = resolveProfile(business)
  const intent: MatchIntent = {
    category: business.category,
    city: business.city,
    services: activeServices(profile).slice(0, 3).map((service) => service.name),
    aiTags: profile.aiTags.slice(0, 4),
  }
  const origin = cityCenter(business.city)
  const ranked = list
    .filter((item) => item.id !== business.id && item.profile?.published !== false && item.category === business.category)
    .map((item) => ({ business: item, match: matchBreakdown(item, intent), km: distanceKm(origin, item) }))
  const local = ranked.filter((item) => fold(item.business.city) === fold(business.city))
  return (local.length ? local : ranked)
    .sort((a, b) => b.match.total - a.match.total || a.km - b.km)
    .slice(0, 3)
}

function absoluteImage(src: string) {
  if (src.startsWith("https://")) return src
  if (src.startsWith("/")) return `${PROFILE_ORIGIN}${src}`
  return undefined
}

export function businessJsonLd(business: Business, profile: BusinessProfile) {
  const category = categoryById(business.category)
  const url = `${PROFILE_ORIGIN}/isletme/${business.slug}`
  const image = activeGallery(profile).map((item) => absoluteImage(item.image)).filter((item): item is string => Boolean(item))
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        name: business.name,
        description: profile.seoDescription || profile.shortBody,
        url,
        image,
        telephone: business.phone || undefined,
        address: {
          "@type": "PostalAddress",
          streetAddress: business.address,
          addressLocality: business.district,
          addressRegion: business.city,
          addressCountry: "TR",
        },
        geo: { "@type": "GeoCoordinates", latitude: business.lat, longitude: business.lng },
        ...(business.reviewCount
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: business.rating,
                reviewCount: business.reviewCount,
              },
            }
          : {}),
      },
      ...activeServices(profile).slice(0, 8).map((service) => ({
        "@type": "Service",
        name: service.name,
        description: service.summary || service.detail || undefined,
        areaServed: service.area || profile.serviceArea || business.city,
        provider: { "@type": "LocalBusiness", name: business.name, url },
        ...(service.price > 0
          ? { offers: { "@type": "Offer", price: service.price, priceCurrency: "TRY" } }
          : {}),
      })),
      ...activeGallery(profile).slice(0, 6).flatMap((item) => {
        const contentUrl = absoluteImage(item.image)
        if (!contentUrl) return []
        return [{ "@type": "ImageObject", contentUrl, name: item.title || business.name, description: item.alt || item.description }]
      }),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana sayfa", item: PROFILE_ORIGIN },
          { "@type": "ListItem", position: 2, name: business.city, item: `${PROFILE_ORIGIN}/ara?sehir=${encodeURIComponent(business.city)}` },
          {
            "@type": "ListItem",
            position: 3,
            name: category.label,
            item: `${PROFILE_ORIGIN}/ara?kategori=${business.category}&sehir=${encodeURIComponent(business.city)}`,
          },
          { "@type": "ListItem", position: 4, name: business.name, item: url },
        ],
      },
    ],
  }
}

export function moveItem<T>(items: T[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
