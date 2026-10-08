import type { Business } from "@/lib/types"

export function businessShare(business: Business, origin = "") {
  const url = `${origin}/isletme/${business.slug}`
  const title = `${business.name} · pinwego`
  const text = `${business.name} · ${business.subcategory} · ${business.district}, ${business.city}`
  return { url, title, text, message: `${text}\n${url}` }
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
