import { cities } from "@/lib/catalog"
import { distanceKm, fold, slugifyKey } from "@/lib/format"
import { seedSectors } from "@/lib/sectors"

export const CAMPAIGN_ORIGIN = "https://pinwego.com"
export const NEAR_KM = 40

export const campaignStatuses = [
  "draft",
  "pending_moderation",
  "approved",
  "rejected",
  "published",
  "expired",
  "archived",
  "suspended",
] as const

export type CampaignStatus = (typeof campaignStatuses)[number]

export const auditActions = [
  "CREATED",
  "SUBMITTED",
  "AI_REVIEWED",
  "APPROVED",
  "REJECTED",
  "EDITED",
  "PUBLISHED",
  "SUSPENDED",
  "UNPUBLISHED",
  "EXPIRED",
  "ARCHIVED",
  "FEATURED",
] as const

export type AuditAction = (typeof auditActions)[number]

export type AiFlag = "caps" | "exclaim" | "discount" | "short" | "image" | "terms" | "dates"

export type AiReview = {
  flags: AiFlag[]
  note: string
  at: string
}

export type AuditEntry = {
  action: AuditAction
  at: string
  note: string
}

export type Campaign = {
  id: string
  slug: string
  businessId: string
  businessSlug: string
  businessName: string
  ownerAccountId: string
  title: string
  shortText: string
  longText: string
  image: string
  category: string
  subcategory: string
  discountPercent: number
  advantage: string
  startDate: string
  endDate: string
  code: string
  terms: string
  usageLimit: number
  city: string
  district: string
  address: string
  phone: string
  whatsapp: string
  website: string
  lat: number
  lng: number
  status: CampaignStatus
  moderationNote: string
  featured: boolean
  sponsored: boolean
  sponsorUntil: string
  createdAt: string
  updatedAt: string
  views: number
  clicks: number
  whatsappClicks: number
  websiteClicks: number
  saves: number
  shares: number
  redeems: number
  redemptions: string[]
  aiReview: AiReview | null
  audit: AuditEntry[]
}

export type RankWeights = {
  view: number
  click: number
  save: number
  share: number
  whatsapp: number
  verified: number
  sponsored: number
  featured: number
  complete: number
  personal: number
}

export type CampaignSettings = {
  weights: RankWeights
  discountFlag: number
  shortMin: number
  exclaimMax: number
  sponsorWeek: number
  sponsorMonth: number
  personalization: boolean
  moderationRequired: true
}

export type CampaignSort = "yeni" | "populer" | "bitis" | "indirim"

export type CampaignQuery = {
  q?: string
  city?: string
  category?: string
  minDiscount?: number
  sort?: CampaignSort
  endingDays?: number
  near?: { lat: number; lng: number } | null
  viewedCategories?: string[]
}

export type Trust = {
  verified: boolean
  rating: number
  reviewCount: number
}

export type PaymentProviderId = "paytr" | "iyzico" | "stripe"

export type PaymentResult = {
  ok: false
  provider: PaymentProviderId
  reason: "not_connected"
}

const held: CampaignStatus[] = ["draft", "pending_moderation", "rejected", "archived", "suspended"]

export const defaultWeights: RankWeights = {
  view: 0.2,
  click: 1,
  save: 2,
  share: 1.5,
  whatsapp: 1.2,
  verified: 4,
  sponsored: 12,
  featured: 6,
  complete: 1,
  personal: 8,
}

export const defaultSettings: CampaignSettings = {
  weights: defaultWeights,
  discountFlag: 90,
  shortMin: 12,
  exclaimMax: 2,
  sponsorWeek: 750,
  sponsorMonth: 2400,
  personalization: false,
  moderationRequired: true,
}

export function todayISO(now = new Date()) {
  return now.toISOString().slice(0, 10)
}

export function liveStatus(campaign: Campaign, today = todayISO()): CampaignStatus {
  if (held.includes(campaign.status)) return campaign.status
  if (campaign.endDate < today) return "expired"
  if (campaign.startDate > today) return "approved"
  return "published"
}

export function isPublic(campaign: Campaign, today = todayISO()) {
  return liveStatus(campaign, today) === "published"
}

export function sponsoredActive(campaign: Campaign, today = todayISO()) {
  return campaign.sponsored && (!campaign.sponsorUntil || campaign.sponsorUntil >= today)
}

export function citySlug(city: string) {
  return slugifyKey(city)
}

const cityBySlug = new Map(cities.map((city) => [slugifyKey(city.name), city.name]))
const categoryIds = new Set(seedSectors.map((sector) => sector.id))

export function resolveSegment(segment: string): { kind: "city"; city: string } | { kind: "category"; category: string } | null {
  const key = segment.trim().toLowerCase()
  const city = cityBySlug.get(key)
  if (city) return { kind: "city", city }
  if (categoryIds.has(key)) return { kind: "category", category: key }
  return null
}

export function campaignPath(campaign: Pick<Campaign, "city" | "category" | "slug">) {
  return `/kampanyalar/${citySlug(campaign.city)}/${campaign.category}/${campaign.slug}`
}

export function campaignUrl(campaign: Pick<Campaign, "city" | "category" | "slug">) {
  return `${CAMPAIGN_ORIGIN}${campaignPath(campaign)}`
}

export function uniqueSlug(title: string, taken: string[]) {
  const base = slugifyKey(title) || "kampanya"
  if (!taken.includes(base)) return base
  let n = 2
  while (taken.includes(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

function entry(action: AuditAction, at: string, note = ""): AuditEntry {
  return { action, at, note }
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function reviewCampaign(campaign: Pick<Campaign, "title" | "shortText" | "image" | "terms" | "discountPercent" | "startDate" | "endDate">, settings: CampaignSettings = defaultSettings, at = todayISO()): AiReview {
  const flags: AiFlag[] = []
  const letters = campaign.title.replace(/[^\p{L}]/gu, "")
  if (letters.length >= 8 && campaign.title === campaign.title.toLocaleUpperCase("tr-TR") && letters !== letters.toLocaleLowerCase("tr-TR")) {
    flags.push("caps")
  }
  const bangs = `${campaign.title}${campaign.shortText}`.split("!").length - 1
  if (bangs > settings.exclaimMax) flags.push("exclaim")
  if (campaign.discountPercent >= settings.discountFlag) flags.push("discount")
  if (campaign.shortText.trim().length < settings.shortMin) flags.push("short")
  if (!campaign.image.trim()) flags.push("image")
  if (!campaign.terms.trim()) flags.push("terms")
  if (campaign.endDate < campaign.startDate) flags.push("dates")
  const note = flags.length
    ? "Ön kontrol uyarı üretti. Bu kayıt kendiliğinden yayınlanmaz."
    : "Ön kontrol uyarı görmedi. Yayın kararı yine moderasyondadır."
  return { flags, note, at }
}

export function suggestCampaignCopy(sentence: string) {
  const clean = sentence.trim().replace(/\s+/g, " ")
  if (!clean) return { title: "", shortText: "", longText: "" }
  const title = clean.length > 72 ? `${clean.slice(0, 69)}…` : clean
  return {
    title,
    shortText: `${clean} Koşullar kampanya sayfasında.`,
    longText: `${clean} Bu metin bir öneridir. İndirim, tarih ve koşullar işletmenin kendi metnidir; yayınlanmadan önce düzenlenir.`,
  }
}

export function qualityScore(campaign: Campaign, trust?: Trust | null) {
  let score = 35
  if (campaign.image) score += 10
  if (campaign.longText.trim().length > 40) score += 10
  if (campaign.terms.trim().length > 10) score += 10
  if (campaign.code.trim()) score += 5
  if (campaign.advantage.trim() || campaign.discountPercent > 0) score += 10
  if (trust?.verified) score += 10
  if ((trust?.rating ?? 0) >= 4.5) score += 5
  score -= (campaign.aiReview?.flags.length ?? 0) * 8
  return Math.max(0, Math.min(100, score))
}

export function rankScore(campaign: Campaign, trust: Trust | null, settings: CampaignSettings, today: string, personal: boolean) {
  const weights = settings.weights
  const complete = [campaign.title, campaign.shortText, campaign.longText, campaign.image, campaign.terms, campaign.code].filter((item) => item.trim()).length
  return (
    campaign.views * weights.view +
    campaign.clicks * weights.click +
    campaign.saves * weights.save +
    campaign.shares * weights.share +
    campaign.whatsappClicks * weights.whatsapp +
    (trust?.verified ? weights.verified : 0) +
    (sponsoredActive(campaign, today) ? weights.sponsored : 0) +
    (campaign.featured ? weights.featured : 0) +
    complete * weights.complete +
    (personal ? weights.personal : 0)
  )
}

export function listPublic(campaigns: Campaign[], query: CampaignQuery, settings: CampaignSettings = defaultSettings, today = todayISO(), trustFor?: (campaign: Campaign) => Trust | null) {
  const needle = fold(query.q ?? "")
  const cityName = query.city ? cityBySlug.get(query.city.toLowerCase()) ?? query.city : ""
  const rows = campaigns.filter((campaign) => {
    if (!isPublic(campaign, today)) return false
    if (cityName && fold(campaign.city) !== fold(cityName) && citySlug(campaign.city) !== query.city?.toLowerCase()) return false
    if (query.category && campaign.category !== query.category) return false
    if ((query.minDiscount ?? 0) > 0 && campaign.discountPercent < (query.minDiscount ?? 0)) return false
    if (query.endingDays && query.endingDays > 0) {
      const end = Date.parse(`${campaign.endDate}T00:00:00Z`)
      const start = Date.parse(`${today}T00:00:00Z`)
      const days = Math.round((end - start) / 86400000)
      if (days < 0 || days > query.endingDays) return false
    }
    if (query.near) {
      const km = distanceKm(query.near, campaign)
      if (km > NEAR_KM) return false
    }
    if (!needle) return true
    const hay = fold(`${campaign.title} ${campaign.shortText} ${campaign.businessName} ${campaign.city} ${campaign.district} ${campaign.category} ${campaign.advantage}`)
    return hay.includes(needle)
  })
  const sort = query.sort ?? "populer"
  const viewed = new Set(query.viewedCategories ?? [])
  rows.sort((a, b) => {
    if (sort === "yeni") return b.createdAt.localeCompare(a.createdAt)
    if (sort === "bitis") return a.endDate.localeCompare(b.endDate)
    if (sort === "indirim") return b.discountPercent - a.discountPercent || b.createdAt.localeCompare(a.createdAt)
    const score = (campaign: Campaign) => rankScore(campaign, trustFor?.(campaign) ?? null, settings, today, settings.personalization && viewed.has(campaign.category))
    return score(b) - score(a)
  })
  return rows
}

export type DraftInput = {
  title: string
  shortText: string
  longText: string
  image: string
  discountPercent: number
  advantage: string
  startDate: string
  endDate: string
  code: string
  terms: string
  usageLimit: number
  business: {
    id: string
    slug: string
    name: string
    ownerAccountId?: string
    category: string
    subcategory: string
    city: string
    district: string
    address: string
    phone: string
    website?: string
    lat: number
    lng: number
    contacts?: { whatsapp?: string }
  }
}

export function blankDraft(business: DraftInput["business"], ownerAccountId: string, taken: string[], now = new Date()): Campaign {
  const at = now.toISOString()
  const day = todayISO(now)
  const slug = uniqueSlug("yeni kampanya", taken)
  return {
    id: `c-${slug}-${now.getTime().toString(36)}`,
    slug,
    businessId: business.id,
    businessSlug: business.slug,
    businessName: business.name,
    ownerAccountId: ownerAccountId || business.ownerAccountId || "",
    title: "",
    shortText: "",
    longText: "",
    image: "",
    category: business.category,
    subcategory: business.subcategory,
    discountPercent: 0,
    advantage: "",
    startDate: day,
    endDate: day,
    code: "",
    terms: "",
    usageLimit: 100,
    city: business.city,
    district: business.district,
    address: business.address,
    phone: business.phone,
    whatsapp: business.contacts?.whatsapp || business.phone,
    website: business.website ?? "",
    lat: business.lat,
    lng: business.lng,
    status: "draft",
    moderationNote: "",
    featured: false,
    sponsored: false,
    sponsorUntil: "",
    createdAt: at,
    updatedAt: at,
    views: 0,
    clicks: 0,
    whatsappClicks: 0,
    websiteClicks: 0,
    saves: 0,
    shares: 0,
    redeems: 0,
    redemptions: [],
    aiReview: null,
    audit: [entry("CREATED", at)],
  }
}

export type CampaignPatch = Partial<Pick<Campaign, "title" | "shortText" | "longText" | "image" | "discountPercent" | "advantage" | "startDate" | "endDate" | "code" | "terms" | "usageLimit" | "whatsapp" | "website" | "subcategory">>

export function applyCopy(campaign: Campaign, patch: CampaignPatch, taken: string[], now = new Date()): Campaign {
  const at = now.toISOString()
  const next: Campaign = {
    ...campaign,
    ...patch,
    discountPercent: clampPercent(patch.discountPercent ?? campaign.discountPercent),
    usageLimit: Math.max(0, Math.round(patch.usageLimit ?? campaign.usageLimit)),
    updatedAt: at,
  }
  if (patch.title && patch.title !== campaign.title) {
    const pool = taken.filter((slug) => slug !== campaign.slug)
    next.slug = uniqueSlug(patch.title, pool)
  }
  return next
}

export type Actor = { id: string; role: "musteri" | "isletme" | "admin" }

export function isCampaignOwner(actorId: string, campaign: Campaign, businessOwnerId = "") {
  if (!actorId) return false
  return campaign.ownerAccountId === actorId || businessOwnerId === actorId
}

export type ModerationResult = { ok: true; campaign: Campaign } | { ok: false; error: "forbidden" | "reason" | "invalid" }

function owned(actor: Actor, campaign: Campaign, businessOwnerId = "") {
  return actor.role === "admin" || isCampaignOwner(actor.id, campaign, businessOwnerId)
}

export function submitCampaign(campaign: Campaign, settings: CampaignSettings = defaultSettings, now = new Date()): Campaign {
  const at = now.toISOString()
  const aiReview = reviewCampaign(campaign, settings, at)
  return {
    ...campaign,
    status: "pending_moderation",
    aiReview,
    updatedAt: at,
    audit: [...campaign.audit, entry("SUBMITTED", at), entry("AI_REVIEWED", at, aiReview.note)],
  }
}

export function moderate(
  actor: Actor,
  campaign: Campaign,
  action:
    | { type: "submit" }
    | { type: "approve" }
    | { type: "reject"; note: string }
    | { type: "suspend" }
    | { type: "unpublish" }
    | { type: "archive" }
    | { type: "feature"; on: boolean }
    | { type: "sponsor"; on: boolean; until: string }
    | { type: "edit"; patch: CampaignPatch; taken: string[] },
  businessOwnerId = "",
  settings: CampaignSettings = defaultSettings,
  now = new Date(),
): ModerationResult {
  if (!owned(actor, campaign, businessOwnerId)) return { ok: false, error: "forbidden" }
  const at = now.toISOString()
  if (action.type === "edit") {
    if (actor.role === "musteri") return { ok: false, error: "forbidden" }
    let next = applyCopy(campaign, action.patch, action.taken, now)
    const wasLive = campaign.status === "published" || campaign.status === "approved" || liveStatus(campaign, todayISO(now)) === "published"
    if (actor.role !== "admin" && (wasLive || campaign.status === "rejected" || campaign.status === "pending_moderation")) {
      next = submitCampaign({ ...next, status: "draft" }, settings, now)
      next.audit = [...campaign.audit, entry("EDITED", at), ...next.audit.slice(campaign.audit.length)]
    } else if (actor.role === "admin" && (campaign.status === "published" || campaign.status === "approved")) {
      next = {
        ...next,
        status: "pending_moderation",
        aiReview: reviewCampaign(next, settings, at),
        audit: [...campaign.audit, entry("EDITED", at), entry("SUBMITTED", at)],
      }
    } else {
      next = { ...next, audit: [...campaign.audit, entry("EDITED", at)] }
    }
    return { ok: true, campaign: next }
  }
  if (action.type === "submit") {
    if (actor.role === "musteri") return { ok: false, error: "forbidden" }
    if (!campaign.title.trim() || !campaign.shortText.trim() || campaign.endDate < campaign.startDate) return { ok: false, error: "invalid" }
    return { ok: true, campaign: submitCampaign(campaign, settings, now) }
  }
  if (actor.role !== "admin") return { ok: false, error: "forbidden" }
  if (action.type === "approve") {
    return {
      ok: true,
      campaign: {
        ...campaign,
        status: "approved",
        moderationNote: "",
        updatedAt: at,
        audit: [...campaign.audit, entry("APPROVED", at), entry("PUBLISHED", at)],
      },
    }
  }
  if (action.type === "reject") {
    const note = action.note.trim()
    if (!note) return { ok: false, error: "reason" }
    return {
      ok: true,
      campaign: {
        ...campaign,
        status: "rejected",
        moderationNote: note,
        updatedAt: at,
        audit: [...campaign.audit, entry("REJECTED", at, note)],
      },
    }
  }
  if (action.type === "suspend" || action.type === "unpublish") {
    return {
      ok: true,
      campaign: {
        ...campaign,
        status: "suspended",
        updatedAt: at,
        audit: [...campaign.audit, entry(action.type === "unpublish" ? "UNPUBLISHED" : "SUSPENDED", at)],
      },
    }
  }
  if (action.type === "archive") {
    return {
      ok: true,
      campaign: { ...campaign, status: "archived", updatedAt: at, audit: [...campaign.audit, entry("ARCHIVED", at)] },
    }
  }
  if (action.type === "feature") {
    return {
      ok: true,
      campaign: {
        ...campaign,
        featured: action.on,
        updatedAt: at,
        audit: [...campaign.audit, entry("FEATURED", at, action.on ? "on" : "off")],
      },
    }
  }
  return {
    ok: true,
    campaign: {
      ...campaign,
      sponsored: action.on,
      sponsorUntil: action.on ? action.until : "",
      updatedAt: at,
      audit: [...campaign.audit, entry("FEATURED", at, action.on ? `sponsor ${action.until}` : "sponsor off")],
    },
  }
}

export type RedeemResult =
  | { ok: true; campaign: Campaign }
  | { ok: false; reason: "status" | "code" | "limit" | "once" | "actor" }

export function redeemCoupon(campaign: Campaign, actorId: string, code: string, today = todayISO()): RedeemResult {
  if (!actorId.trim()) return { ok: false, reason: "actor" }
  if (!isPublic(campaign, today)) return { ok: false, reason: "status" }
  if (fold(code) !== fold(campaign.code) || !campaign.code.trim()) return { ok: false, reason: "code" }
  if (campaign.redemptions.includes(actorId)) return { ok: false, reason: "once" }
  if (campaign.usageLimit > 0 && campaign.redeems >= campaign.usageLimit) return { ok: false, reason: "limit" }
  return {
    ok: true,
    campaign: {
      ...campaign,
      redeems: campaign.redeems + 1,
      redemptions: [...campaign.redemptions, actorId],
      updatedAt: new Date().toISOString(),
    },
  }
}

export function createPayment(provider: PaymentProviderId): PaymentResult {
  return { ok: false, provider, reason: "not_connected" }
}

export function normalizeSettings(value: unknown): CampaignSettings {
  const raw = value && typeof value === "object" ? (value as Partial<CampaignSettings>) : {}
  const weights = raw.weights && typeof raw.weights === "object" ? raw.weights : {}
  const num = (input: unknown, fallback: number) => (typeof input === "number" && Number.isFinite(input) ? input : fallback)
  return {
    weights: {
      view: num(weights.view, defaultWeights.view),
      click: num(weights.click, defaultWeights.click),
      save: num(weights.save, defaultWeights.save),
      share: num(weights.share, defaultWeights.share),
      whatsapp: num(weights.whatsapp, defaultWeights.whatsapp),
      verified: num(weights.verified, defaultWeights.verified),
      sponsored: num(weights.sponsored, defaultWeights.sponsored),
      featured: num(weights.featured, defaultWeights.featured),
      complete: num(weights.complete, defaultWeights.complete),
      personal: num(weights.personal, defaultWeights.personal),
    },
    discountFlag: num(raw.discountFlag, defaultSettings.discountFlag),
    shortMin: num(raw.shortMin, defaultSettings.shortMin),
    exclaimMax: num(raw.exclaimMax, defaultSettings.exclaimMax),
    sponsorWeek: num(raw.sponsorWeek, defaultSettings.sponsorWeek),
    sponsorMonth: num(raw.sponsorMonth, defaultSettings.sponsorMonth),
    personalization: raw.personalization === true,
    moderationRequired: true,
  }
}

export function campaignJsonLd(campaign: Campaign) {
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: campaign.title,
    description: campaign.shortText,
    url: campaignUrl(campaign),
    validFrom: campaign.startDate,
    validThrough: campaign.endDate,
    category: campaign.category,
    seller: { "@type": "Organization", name: campaign.businessName },
    ...(campaign.discountPercent > 0
      ? { discount: `${campaign.discountPercent}%`, priceSpecification: { "@type": "PriceSpecification", priceCurrency: "TRY" } }
      : {}),
  }
}

function seed(partial: Omit<Campaign, "audit" | "aiReview" | "redemptions" | "saves" | "shares" | "redeems" | "websiteClicks" | "whatsappClicks" | "featured" | "sponsorUntil" | "sponsored" | "moderationNote" | "ownerAccountId" | "usageLimit"> & Partial<Campaign>): Campaign {
  const at = partial.createdAt
  const status = partial.status
  const audit: AuditEntry[] = [entry("CREATED", at)]
  if (status === "pending_moderation") audit.push(entry("SUBMITTED", at), entry("AI_REVIEWED", at))
  if (status === "rejected") audit.push(entry("SUBMITTED", at), entry("REJECTED", at, partial.moderationNote ?? ""))
  if (status === "published" || status === "approved") audit.push(entry("APPROVED", at), entry("PUBLISHED", at))
  return {
    ownerAccountId: "",
    moderationNote: "",
    featured: false,
    sponsored: false,
    sponsorUntil: "",
    usageLimit: 200,
    saves: 0,
    shares: 0,
    redeems: 0,
    whatsappClicks: 0,
    websiteClicks: 0,
    redemptions: [],
    aiReview: null,
    ...partial,
    audit: partial.audit ?? audit,
  }
}

export const seedCampaigns: Campaign[] = [
  seed({
    id: "kampanya-yokustepe",
    slug: "yokustepe-kahvalti-yuzde-20",
    businessId: "yokustepe-kahvalti-waffle",
    businessSlug: "yokustepe-kahvalti-waffle",
    businessName: "Yokuştepe Kahvaltı % Waffle",
    title: "Kahvaltı tabağında %20",
    shortText: "Hafta içi serpme kahvaltıda yüzde yirmi. Pazar günü hariç.",
    longText: "Serpme kahvaltı hesabına yüzde yirmi uygulanır. İçecekler ve waffle porsiyonu ayrıca ücretlenir. Masa başına bir kampanya geçerlidir. Kod kasada söylenir.",
    image: "/photos/breakfast.jpg",
    category: "yeme",
    subcategory: "Hızlı yemek",
    discountPercent: 20,
    advantage: "%20 kahvaltı",
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    code: "PW-KAHVE",
    terms: "Pazar günleri geçerli değildir. Başka indirimle birleşmez.",
    city: "Zonguldak",
    district: "Karadeniz Ereğli",
    address: "Tacettin Halatçı sokak No:3/E, Karadeniz Ereğli, Zonguldak",
    phone: "+90 372 502 3687",
    whatsapp: "+90 372 502 3687",
    website: "https://www.yokustepe.com",
    lat: 41.281226,
    lng: 31.423947,
    status: "published",
    createdAt: "2026-10-08T09:00:00.000Z",
    updatedAt: "2026-10-08T09:00:00.000Z",
    views: 80,
    clicks: 18,
  }),
  seed({
    id: "kampanya-balikci",
    slug: "balikci-mehmet-yuzde-30",
    businessId: "balikci-mehmet",
    businessSlug: "balikci-mehmet",
    businessName: "Balıkçı Mehmet",
    title: "Günün balığında %30",
    shortText: "Öğle oturumunda günün balığı yüzde otuz indirimli.",
    longText: "Öğle 12:00–16:00 arasında günün balığına yüzde otuz uygulanır. Üst kat rezervasyonu ve meze tabağı kampanya dışındadır. Kod rezervasyonda belirtilir.",
    image: "/photos/seafood.jpg",
    category: "yeme",
    subcategory: "Balık restoranı",
    discountPercent: 30,
    advantage: "%30 günün balığı",
    startDate: "2026-10-01",
    endDate: "2026-11-15",
    code: "PW-BALIK",
    terms: "Yalnızca öğle oturumu. Alkollü içecekler dahil değildir.",
    city: "İstanbul",
    district: "Karaköy",
    address: "Kemankeş Cad. No: 18, Karaköy",
    phone: "0212 555 01 18",
    whatsapp: "0212 555 01 18",
    website: "",
    lat: 41.0234,
    lng: 28.9752,
    status: "published",
    featured: true,
    sponsored: true,
    sponsorUntil: "2026-10-20",
    createdAt: "2026-10-02T09:00:00.000Z",
    updatedAt: "2026-10-02T09:00:00.000Z",
    views: 480,
    clicks: 90,
    saves: 24,
    shares: 11,
    whatsappClicks: 36,
  }),
  seed({
    id: "kampanya-atolye",
    slug: "atolye-sac-ikinci-islem",
    businessId: "atolye-sac",
    businessSlug: "atolye-sac",
    businessName: "Atölye Saç",
    title: "Kesimde ikinci işlem hediye",
    shortText: "Aynı gün kesim alanlara fön ikinci işlem olarak hediye.",
    longText: "Kadın veya erkek kesim ücretine aynı gün fön eklenmez. Boya ve analiz ücreti kampanya dışındadır. Randevu sırasında kod yazılır.",
    image: "/photos/salon.jpg",
    category: "guzellik",
    subcategory: "Kuaför",
    discountPercent: 0,
    advantage: "İkinci işlem hediye",
    startDate: "2026-10-01",
    endDate: "2026-10-15",
    code: "PW-SAC",
    terms: "Aynı gün ve aynı misafir için geçerlidir. Bayram günleri kapalıdır.",
    city: "İstanbul",
    district: "Nişantaşı",
    address: "Teşvikiye Cad. No: 27, Nişantaşı",
    phone: "0212 555 03 27",
    whatsapp: "0212 555 03 27",
    website: "",
    lat: 41.0516,
    lng: 28.9948,
    status: "published",
    createdAt: "2026-10-05T09:00:00.000Z",
    updatedAt: "2026-10-05T09:00:00.000Z",
    views: 70,
    clicks: 15,
  }),
  seed({
    id: "kampanya-oto",
    slug: "kadikoy-oto-servis-yuzde-15",
    businessId: "kadikoy-oto-servis",
    businessSlug: "kadikoy-oto-servis",
    businessName: "Kadıköy Oto Servis",
    title: "Periyodik bakımda %15",
    shortText: "Yağ ve filtre dahil periyodik bakımda yüzde on beş.",
    longText: "Periyodik bakım paketine yüzde on beş uygulanır. Lastik, kaporta ve yedek parça kampanya dışındadır. İş emri açılırken kod söylenir.",
    image: "/photos/repair.jpg",
    category: "oto",
    subcategory: "Oto servis",
    discountPercent: 15,
    advantage: "%15 periyodik bakım",
    startDate: "2026-10-01",
    endDate: "2026-12-01",
    code: "PW-OTO",
    terms: "Randevulu araçlar. Başka servis kampanyasıyla birleşmez.",
    city: "İstanbul",
    district: "Kadıköy",
    address: "Kadıköy, İstanbul",
    phone: "0212 555 40 00",
    whatsapp: "0212 555 40 00",
    website: "",
    lat: 40.9902,
    lng: 29.0274,
    status: "published",
    createdAt: "2026-10-03T09:00:00.000Z",
    updatedAt: "2026-10-03T09:00:00.000Z",
    views: 40,
    clicks: 8,
  }),
  seed({
    id: "kampanya-dent",
    slug: "nisanta-dent-kontrol",
    businessId: "nisanta-dent",
    businessSlug: "nisanta-dent",
    businessName: "Nişanta Dent",
    title: "Kontrol muayenesinde %10",
    shortText: "Diş taşı temizliği randevusunda kontrol ücreti yüzde on indirimli.",
    longText: "Diş taşı temizliği ile aynı ziyarette yapılan kontrol muayenesine yüzde on uygulanır. Röntgen ve tedavi kalemleri ayrıca ücretlenir.",
    image: "/photos/dental.jpg",
    category: "saglik",
    subcategory: "Diş kliniği",
    discountPercent: 10,
    advantage: "%10 kontrol",
    startDate: "2026-10-01",
    endDate: "2026-11-30",
    code: "PW-DIS",
    terms: "İlk ziyaret için geçerlidir. Sigorta açıklaması klinikle yapılır.",
    city: "İstanbul",
    district: "Nişantaşı",
    address: "Valikonağı Cad. No: 19, Nişantaşı",
    phone: "0212 555 06 19",
    whatsapp: "0212 555 06 19",
    website: "",
    lat: 41.0528,
    lng: 28.9962,
    status: "published",
    createdAt: "2026-10-04T09:00:00.000Z",
    updatedAt: "2026-10-04T09:00:00.000Z",
    views: 60,
    clicks: 10,
  }),
  seed({
    id: "kampanya-izgara",
    slug: "kuzey-izgara-yuzde-50",
    businessId: "kuzey-izgara",
    businessSlug: "kuzey-izgara",
    businessName: "Kuzey Izgara",
    title: "Izgara tabakta %50",
    shortText: "Hafta içi öğlen ızgara tabakta yüzde elli. İçecek hariç.",
    longText: "Hafta içi 12:00–15:00 arasında seçili ızgara tabağına yüzde elli uygulanır. Izgara dışı ana yemekler ve içecekler kampanya dışındadır.",
    image: "/photos/lokanta.jpg",
    category: "yeme",
    subcategory: "Izgara",
    discountPercent: 50,
    advantage: "%50 ızgara tabağı",
    startDate: "2026-10-10",
    endDate: "2026-10-28",
    code: "PW-IZGARA",
    terms: "Hafta içi öğle. Masa başına bir tabak.",
    city: "İzmir",
    district: "Alsancak",
    address: "Kıbrıs Şehitleri Cad. No: 88, Alsancak",
    phone: "0232 555 01 88",
    whatsapp: "0232 555 01 88",
    website: "",
    lat: 38.4368,
    lng: 27.1422,
    status: "published",
    createdAt: "2026-10-11T09:00:00.000Z",
    updatedAt: "2026-10-11T09:00:00.000Z",
    views: 140,
    clicks: 22,
  }),
  seed({
    id: "kampanya-sofra",
    slug: "sofra-42-hafta-ici",
    businessId: "sofra-42",
    businessSlug: "sofra-42",
    businessName: "Sofra 42",
    title: "Hafta içi mezede %40",
    shortText: "Pazartesi–perşembe meze seçkisinde yüzde kırk.",
    longText: "Hafta içi akşam meze seçkisine yüzde kırk yazılır. Cuma ve canlı müzik gecesi kampanya dışındadır. Metin moderasyon sırasındadır.",
    image: "/photos/meyhane.jpg",
    category: "yeme",
    subcategory: "Meyhane",
    discountPercent: 40,
    advantage: "%40 meze",
    startDate: "2026-10-01",
    endDate: "2026-11-30",
    code: "PW-SOFRA",
    terms: "Cuma, cumartesi ve pazar geçerli değildir.",
    city: "İstanbul",
    district: "Kadıköy",
    address: "Moda Cad. No: 42, Kadıköy",
    phone: "0216 555 01 42",
    whatsapp: "0216 555 01 42",
    website: "",
    lat: 40.9846,
    lng: 29.0268,
    status: "pending_moderation",
    createdAt: "2026-10-12T08:00:00.000Z",
    updatedAt: "2026-10-12T08:00:00.000Z",
    views: 0,
    clicks: 0,
    aiReview: { flags: [], note: "Ön kontrol uyarı görmedi. Yayın kararı yine moderasyondadır.", at: "2026-10-12T08:00:00.000Z" },
  }),
  seed({
    id: "kampanya-mudita",
    slug: "mudita-spa-masaj",
    businessId: "mudita-spa",
    businessSlug: "mudita-spa",
    businessName: "Mudita Spa",
    title: "Masaj seansında %25",
    shortText: "Tüm vücut seansında yüzde yirmi beş.",
    longText: "Seksen dakikalık seansa yüzde yirmi beş yazılır. Kanıt fiyat listesi eklenmeden gönderildi.",
    image: "/photos/spa.jpg",
    category: "guzellik",
    subcategory: "Spa",
    discountPercent: 25,
    advantage: "%25 masaj",
    startDate: "2026-10-01",
    endDate: "2026-11-01",
    code: "PW-SPA",
    terms: "Randevulu seans.",
    city: "İstanbul",
    district: "Kadıköy",
    address: "Caferağa Mah. Moda Cad. No: 118, Kadıköy",
    phone: "0216 555 03 18",
    whatsapp: "0216 555 03 18",
    website: "",
    lat: 40.9862,
    lng: 29.0254,
    status: "rejected",
    moderationNote: "İndirim oranı kanıtsız. Fiyat listesiyle yeniden gönderin.",
    createdAt: "2026-10-06T09:00:00.000Z",
    updatedAt: "2026-10-07T09:00:00.000Z",
    views: 0,
    clicks: 0,
  }),
  seed({
    id: "kampanya-marmara",
    slug: "marmara-kahvesi-kahvalti",
    businessId: "marmara-kahvesi",
    businessSlug: "marmara-kahvesi",
    businessName: "Marmara Kahvesi",
    title: "Kahvede ikinci içecek",
    shortText: "Kahvaltı yanında ikinci filtre kahve ikramdı. Süresi doldu.",
    longText: "Eylül boyunca kahvaltı siparişine ikinci filtre kahve yazılırdı. Bitiş tarihinden sonra listeye girmez.",
    image: "/photos/cafe.jpg",
    category: "yeme",
    subcategory: "Kahvaltı & kafe",
    discountPercent: 0,
    advantage: "İkinci kahve",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    code: "PW-KAHVE2",
    terms: "Süresi dolmuştur.",
    city: "İstanbul",
    district: "Cihangir",
    address: "Akarsu Yokuşu No: 9, Cihangir",
    phone: "0212 555 01 09",
    whatsapp: "0212 555 01 09",
    website: "",
    lat: 41.0328,
    lng: 28.9834,
    status: "published",
    createdAt: "2026-09-01T09:00:00.000Z",
    updatedAt: "2026-09-01T09:00:00.000Z",
    views: 200,
    clicks: 40,
  }),
]

export function findSeedCampaign(slug: string) {
  return seedCampaigns.find((campaign) => campaign.slug === slug) ?? null
}

export function sectorLabel(id: string) {
  return seedSectors.find((sector) => sector.id === id)?.label ?? id
}
