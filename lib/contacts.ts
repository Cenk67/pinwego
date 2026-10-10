import type { Business, BusinessContacts } from "@/lib/types"

export type { BusinessContacts }

export const contactKinds = [
  { id: "landline", label: "Sabit telefon", guest: "Sabit telefonu gör", placeholder: "0212 000 00 00" },
  { id: "mobile", label: "GSM", guest: "GSM'i gör", placeholder: "0532 000 00 00" },
  { id: "whatsapp", label: "WhatsApp", guest: "WhatsApp'ı gör", placeholder: "0532 000 00 00" },
] as const

export type ContactKind = (typeof contactKinds)[number]["id"]

export type ContactDraft = Record<ContactKind, string>

export function nationalDigits(value: string) {
  let digits = value.replace(/\D/g, "")
  if (digits.startsWith("00")) digits = digits.slice(2)
  if (digits.startsWith("90") && digits.length >= 12) digits = digits.slice(2)
  if (digits.startsWith("0")) digits = digits.slice(1)
  return digits
}

export function isMobileNumber(value: string) {
  const digits = nationalDigits(value)
  return digits.startsWith("5") && digits.length >= 10
}

export function displayPhone(value: string) {
  const digits = nationalDigits(value)
  if (digits.length !== 10) return value.trim()
  return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`
}

export function telHref(value: string) {
  const digits = nationalDigits(value)
  if (digits.length === 10) return `tel:+90${digits}`
  const raw = value.replace(/\D/g, "").replace(/^00/, "")
  return raw ? `tel:+${raw}` : ""
}

export function whatsappHref(value: string) {
  const digits = nationalDigits(value)
  const intl = digits.length === 10 ? `90${digits}` : value.replace(/\D/g, "").replace(/^00/, "")
  return intl ? `https://wa.me/${intl}` : ""
}

function line(kind: ContactKind, value: string) {
  const platform = contactKinds.find((item) => item.id === kind)!
  const href = kind === "whatsapp" ? whatsappHref(value) : telHref(value)
  return { ...platform, value: displayPhone(value), href }
}

export function visibleContacts(business: Pick<Business, "contacts" | "phone">) {
  if (business.contacts) {
    return contactKinds.flatMap((kind) => {
      const value = (business.contacts?.[kind.id] ?? "").trim()
      return value ? [line(kind.id, value)] : []
    })
  }
  const phone = (business.phone ?? "").trim()
  if (!phone) return []
  return [line(isMobileNumber(phone) ? "mobile" : "landline", phone)]
}

export function draftContacts(business: Pick<Business, "contacts" | "phone">): ContactDraft {
  if (business.contacts) {
    return {
      landline: business.contacts.landline ?? "",
      mobile: business.contacts.mobile ?? "",
      whatsapp: business.contacts.whatsapp ?? "",
    }
  }
  const phone = (business.phone ?? "").trim()
  const draft: ContactDraft = { landline: "", mobile: "", whatsapp: "" }
  if (!phone) return draft
  draft[isMobileNumber(phone) ? "mobile" : "landline"] = phone
  return draft
}

export function savedContacts(draft: ContactDraft) {
  const contacts: BusinessContacts = {}
  for (const kind of contactKinds) {
    const raw = (draft[kind.id] ?? "").trim()
    if (!raw) {
      contacts[kind.id] = ""
      continue
    }
    if (nationalDigits(raw).length < 10) {
      return { contacts, phone: "", error: `${kind.label} için en az 10 rakam yaz.` }
    }
    contacts[kind.id] = displayPhone(raw)
  }
  const phone = contacts.mobile || contacts.landline || contacts.whatsapp || ""
  return { contacts, phone, error: null as string | null }
}
