import type { Ad, AdSlotId } from "./types"

export const AD_SLOTS: { id: AdSlotId; label: string }[] = [
  { id: "anasayfa-ust", label: "Ana sayfa, arama altı" },
  { id: "anasayfa-orta", label: "Ana sayfa, sektörlerden sonra" },
  { id: "isletme-icerik", label: "İşletme sayfası, bilgi akışı" },
  { id: "isletme-yan", label: "İşletme sayfası, yan sütun" },
]

const SLOT_IDS = new Set<AdSlotId>(AD_SLOTS.map((slot) => slot.id))

export const SEED_ADS: Ad[] = [
  {
    id: "reklam-marmara-sigorta",
    advertiser: "Marmara Sigorta",
    title: "Dükkanını tek poliçeyle kapat",
    body: "Yangın, cam kırılması ve üçüncü şahıs sorumluluğu aynı teklifte. İşletme kaydına bakarken kampanyayı da gör.",
    href: "/ara?q=sigorta",
    image: "/photos/office.jpg",
    placements: ["anasayfa-ust"],
    active: true,
  },
  {
    id: "reklam-atlas-kargo",
    advertiser: "Atlas Kargo",
    title: "Aynı gün semt içi teslimat",
    body: "Paket işletmeden alınır, müşteriye aynı gün bırakılır. Şehir içi gönderiler için sabit ücret.",
    href: "/ara?q=kargo",
    image: "/photos/logistics.jpg",
    placements: ["anasayfa-orta"],
    active: true,
  },
  {
    id: "reklam-pinar-temizlik",
    advertiser: "Pınar Temizlik",
    title: "Vitrin ve ofis, haftalık plan",
    body: "Cam, zemin ve mutfak aynı ekipte. İşletme bilgisini okurken bu sponsor alanı da durur.",
    href: "/ara?q=temizlik",
    image: "/photos/cleaning.jpg",
    placements: ["anasayfa-orta", "isletme-icerik"],
    active: true,
  },
  {
    id: "reklam-sahil-odeme",
    advertiser: "Sahil Ödeme",
    title: "Masada QR ile tahsilat",
    body: "Komisyon oranını işletmenin yanında gör. Kurulum kaydı bu tarayıcıdaki reklam alanıdır.",
    href: "/ara?q=odeme",
    image: "/photos/cafe.jpg",
    placements: ["isletme-yan"],
    active: true,
  },
  {
    id: "reklam-eski-kampanya",
    advertiser: "Eski Kampanya",
    title: "Bu reklam yayında değil",
    body: "Yönetici panelinden açılınca ana sayfadaki arama altı alana düşer.",
    href: "/ara",
    image: "/photos/bakery.jpg",
    placements: ["anasayfa-ust"],
    active: false,
  },
]

export function seedAds(): Ad[] {
  return SEED_ADS.map((ad) => ({ ...ad, placements: [...ad.placements] }))
}

export function slotLabel(id: AdSlotId) {
  return AD_SLOTS.find((slot) => slot.id === id)?.label ?? id
}

function isSlot(value: unknown): value is AdSlotId {
  return typeof value === "string" && SLOT_IDS.has(value as AdSlotId)
}

export function normalizeAd(value: unknown): Ad | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Partial<Ad>
  const id = typeof raw.id === "string" ? raw.id.trim() : ""
  const advertiser = typeof raw.advertiser === "string" ? raw.advertiser.trim() : ""
  const title = typeof raw.title === "string" ? raw.title.trim() : ""
  const body = typeof raw.body === "string" ? raw.body.trim() : ""
  if (!id || !advertiser || !title || !body) return null
  const placements = Array.isArray(raw.placements)
    ? [...new Set(raw.placements.filter(isSlot))]
    : []
  return {
    id,
    advertiser,
    title,
    body,
    href: typeof raw.href === "string" ? raw.href.trim() : "",
    image: typeof raw.image === "string" ? raw.image.trim() : "",
    placements,
    active: raw.active === true,
  }
}

export function parseAds(value: unknown): Ad[] {
  if (!Array.isArray(value)) return seedAds()
  return value.flatMap((item) => {
    const ad = normalizeAd(item)
    return ad ? [ad] : []
  })
}

export function adsFor(ads: Ad[], slot: AdSlotId) {
  return ads.filter((ad) => ad.active && ad.placements.includes(slot))
}

export function adHref(value: string): string | null {
  const href = value.trim()
  if (!href) return null
  if (href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/\\")) return href
  try {
    const url = new URL(href)
    if (url.protocol === "http:" || url.protocol === "https:") return href
  } catch {
    return null
  }
  return null
}

export function adImage(value: string): string | null {
  const src = value.trim()
  if (!src) return null
  if (src.startsWith("/") && !src.startsWith("//") && !src.startsWith("/\\")) return src
  try {
    const url = new URL(src)
    if (url.protocol === "http:" || url.protocol === "https:") return src
  } catch {
    return null
  }
  return null
}
