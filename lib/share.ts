import type { Business } from "@/lib/types"

export function businessShare(business: Business, origin = "") {
  const url = `${origin}/isletme/${business.slug}?kaynak=paylas`
  const title = `${business.name} · pinwego`
  const text = `${business.name} · ${business.subcategory} · ${business.district}, ${business.city}`
  return { url, title, text, message: `${text}\n${url}` }
}

export type SharePayload = { title: string; text: string; url: string }
export type ShareData = { title?: string; text?: string; url?: string }

function fields(share: SharePayload): ShareData {
  const title = share.title.trim()
  const text = share.text.trim()
  const url = absoluteShareUrl(share.url.trim())
  return {
    ...(title ? { title } : {}),
    ...(text ? { text } : {}),
    ...(url ? { url } : {}),
  }
}

export function absoluteShareUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url
  if (typeof window === "undefined" || !url.startsWith("/")) return url
  return `${window.location.origin}${url}`
}

export function shareCandidates(share: SharePayload): ShareData[] {
  const full = fields(share)
  const titled = { ...(full.title ? { title: full.title } : {}), ...(full.url ? { url: full.url } : {}) }
  const urlOnly = full.url ? { url: full.url } : {}
  const asText = {
    ...(full.title ? { title: full.title } : {}),
    text: [full.text, full.url].filter(Boolean).join("\n"),
  }
  const list = [full, titled, urlOnly, asText].filter((item) => Object.keys(item).length > 0)
  const seen = new Set<string>()
  return list.filter((item) => {
    const key = JSON.stringify(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function pickShareData(share: SharePayload, canShare?: (data: ShareData) => boolean) {
  const candidates = shareCandidates(share)
  if (!canShare) return candidates[0]
  for (const data of candidates) {
    try {
      if (canShare(data)) return data
    } catch {
      continue
    }
  }
  return candidates[0]
}

export function startSystemShare(
  share: SharePayload,
  api: {
    share?: (data: ShareData) => Promise<void>
    canShare?: (data: ShareData) => boolean
  } = typeof navigator === "undefined" ? {} : navigator,
) {
  if (typeof api.share !== "function") return Promise.resolve("unsupported" as const)
  const data = pickShareData(share, typeof api.canShare === "function" ? (item) => api.canShare!(item) : undefined)
  try {
    return Promise.resolve(api.share(data)).then(
      () => "shared" as const,
      (error: unknown) => (error instanceof Error && error.name === "AbortError" ? "abort" as const : "fail" as const),
    )
  } catch {
    return Promise.resolve("fail" as const)
  }
}

export function shareTargets(url: string, text: string, title: string) {
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(text)
  const encodedTitle = encodeURIComponent(title)
  const encodedAll = encodeURIComponent(`${text}\n${url}`)
  return [
    { id: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${encodedAll}` },
    { id: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}` },
    { id: "x", label: "X", href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}` },
    { id: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { id: "linkedin", label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { id: "mail", label: "E-posta", href: `mailto:?subject=${encodedTitle}&body=${encodedAll}` },
    { id: "sms", label: "SMS", href: `sms:?body=${encodedAll}` },
  ]
}
