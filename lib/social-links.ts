import type { Business, BusinessLinks } from "@/lib/types"

export type { BusinessLinks }

export const linkPlatforms = [
  { id: "website", label: "Web sitesi", placeholder: "ornek.com" },
  { id: "facebook", label: "Facebook", placeholder: "facebook.com/isletme" },
  { id: "instagram", label: "Instagram", placeholder: "instagram.com/isletme" },
  { id: "x", label: "X", placeholder: "x.com/isletme" },
  { id: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/company/isletme" },
  { id: "youtube", label: "YouTube", placeholder: "youtube.com/@isletme" },
  { id: "tiktok", label: "TikTok", placeholder: "tiktok.com/@isletme" },
  { id: "n11", label: "N11", placeholder: "n11.com/magaza/isletme" },
  { id: "sahibinden", label: "Sahibinden", placeholder: "sahibinden.com/..." },
  { id: "arabam", label: "Arabam.com", placeholder: "arabam.com/galeri/..." },
  { id: "hepsiemlak", label: "Hepsiemlak", placeholder: "hepsiemlak.com/..." },
  { id: "emlakjet", label: "Emlakjet", placeholder: "emlakjet.com/..." },
] as const

export type LinkKind = (typeof linkPlatforms)[number]["id"]

export function linkPlatform(id: string) {
  return linkPlatforms.find((item) => item.id === id)
}

export function normalizeLink(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withProtocol)
    if (url.protocol !== "http:" && url.protocol !== "https:") return ""
    if (!url.hostname.includes(".")) return ""
    return url.toString()
  } catch {
    return ""
  }
}

export function rawLink(business: Pick<Business, "links" | "website">, id: LinkKind) {
  const stored = business.links?.[id]
  if (stored !== undefined) return stored
  if (id === "website") return business.website ?? ""
  return ""
}

export function visibleLinks(business: Pick<Business, "links" | "website">) {
  return linkPlatforms.flatMap((platform) => {
    const href = normalizeLink(rawLink(business, platform.id))
    return href ? [{ ...platform, href }] : []
  })
}

export function draftLinks(business: Pick<Business, "links" | "website">): BusinessLinks {
  const draft: BusinessLinks = {}
  for (const platform of linkPlatforms) {
    const value = rawLink(business, platform.id).trim()
    if (value) draft[platform.id] = value
  }
  return draft
}

export function savedLinks(draft: BusinessLinks) {
  const links: BusinessLinks = {}
  for (const platform of linkPlatforms) {
    const raw = (draft[platform.id] ?? "").trim()
    if (!raw) continue
    const href = normalizeLink(raw)
    if (!href) return { links, website: "", error: `${platform.label} bağlantısı açılacak bir adres değil.` }
    links[platform.id] = href
  }
  return { links, website: links.website ?? "", error: null as string | null }
}
