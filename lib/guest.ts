const CONTACT_FACT = /^(site|web|website|telefon|tel|e-posta|eposta|email|mail)$/i

export function isContactFact(label: string, value: string) {
  const name = label.trim()
  if (CONTACT_FACT.test(name)) return true
  if (/https?:\/\//i.test(value)) return true
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value)) return true
  const compact = value.replace(/[^\d+]/g, "")
  return compact.length >= 7 && /^[+\d\s().-]+$/.test(value.trim())
}

export function watchCopy(text: string) {
  return text
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ")
    .replace(/\s*(?:Telefon|Tel|Site|Web|E-posta|Email)\s*:\s*/gi, " ")
    .replace(/(?:\+|00)?\d(?:[\s().-]*\d){6,}/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .replace(/\.\s*\./g, ".")
    .trim()
}
