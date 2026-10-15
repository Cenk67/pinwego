import { GALLERY_LIMIT, resolveProfile } from "@/lib/profile"
import type { Business, GalleryItem } from "@/lib/types"

export const COVER_LIMIT = 120_000
export const GALLERY_IMAGE_LIMIT = 160_000

export function listingGalleryKey(id: string) {
  return `listing-gallery:${id}`
}

export function isStockPhoto(value: string) {
  return value.startsWith("/photos/")
}

function clip(value: unknown, max: number) {
  if (typeof value !== "string") return ""
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
}

export function storedImage(value: unknown, limit: number) {
  if (typeof value !== "string") return ""
  const image = value.trim()
  if (!image || image.length > limit) return ""
  if (image.startsWith("/") && !image.startsWith("//") && !image.includes("..") && !image.includes("\\") && image.length <= 120) return image
  if (/^https:\/\/\S+$/i.test(image) && image.length <= 200) return image
  if (/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/]+={0,2}$/i.test(image)) return image
  return ""
}

export function storedCover(value: unknown) {
  return storedImage(value, COVER_LIMIT)
}

function tags(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => clip(item, 40)).filter((item) => item.length >= 2).slice(0, 8)
}

export function storedGallery(value: unknown) {
  if (!Array.isArray(value)) return []
  const items: GalleryItem[] = []
  for (const entry of value.slice(0, GALLERY_LIMIT)) {
    if (!entry || typeof entry !== "object") continue
    const row = entry as Partial<GalleryItem>
    const image = storedImage(row.image, GALLERY_IMAGE_LIMIT)
    if (!image) continue
    items.push({
      id: clip(row.id, 40) || `galeri-${items.length + 1}`,
      image,
      title: clip(row.title, 80),
      description: clip(row.description, 240),
      alt: clip(row.alt, 160),
      seoTags: tags(row.seoTags),
      aiTags: tags(row.aiTags),
      active: row.active !== false,
      order: items.length,
    })
  }
  return items
}

export function parseGalleryBook(raw: string | null) {
  if (!raw) return []
  try {
    const data = JSON.parse(raw) as { gallery?: unknown }
    return storedGallery(data?.gallery)
  } catch {
    return []
  }
}

function customGallery(business: Business | undefined) {
  return business?.profile?.gallery?.filter((item) => item.image && !isStockPhoto(item.image)) ?? []
}

export function keepListingMedia(previous: Business | undefined, incoming: Business): Business {
  if (!previous) return incoming
  const photo = incoming.photo && !isStockPhoto(incoming.photo) ? incoming.photo : !isStockPhoto(previous.photo) ? previous.photo : incoming.photo || previous.photo
  const profile = customGallery(incoming).length
    ? incoming.profile
    : customGallery(previous).length
      ? previous.profile
      : incoming.profile ?? previous.profile
  return { ...previous, ...incoming, photo, profile }
}

export function withListingMedia(business: Business, media: { photo?: unknown; gallery?: unknown } | null) {
  if (!media) return business
  const photo = storedCover(media.photo) || business.photo
  const gallery = storedGallery(media.gallery)
  if (!gallery.length) return photo === business.photo ? business : { ...business, photo }
  const profile = resolveProfile({ ...business, photo })
  return { ...business, photo, profile: { ...profile, gallery } }
}

export function coverImage(photo: string, gallery: GalleryItem[]) {
  if (photo && !isStockPhoto(photo)) return photo
  const custom = gallery.find((item) => item.active && item.image && !isStockPhoto(item.image))
  return custom?.image || photo
}

export function mediaReason(reason: string | undefined) {
  if (reason === "kapak") return "Kapak görseli kabul edilmedi. Daha küçük bir JPG, PNG veya WEBP seç."
  if (reason === "gorsel") return "Galeri görselleri kabul edilmedi."
  if (reason === "yetki") return "Bu kayıt için görsel değiştirme yetkin yok."
  if (reason === "oturum") return "Oturum kapandı. Yeniden giriş yap."
  if (reason === "yok") return "İşletme kaydı bulunamadı."
  return "Görseller sunucuya yazılamadı."
}
