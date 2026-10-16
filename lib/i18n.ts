import { localeIds, type LocaleId } from "@/lib/i18n-ids"
import { messages, type MessageKey } from "@/lib/messages"

export { localeIds, type LocaleId }

export const locales: { id: LocaleId; name: string; dir: "ltr" | "rtl" }[] = [
  { id: "tr", name: "Türkçe", dir: "ltr" },
  { id: "en", name: "English", dir: "ltr" },
  { id: "de", name: "Deutsch", dir: "ltr" },
  { id: "fr", name: "Français", dir: "ltr" },
  { id: "es", name: "Español", dir: "ltr" },
  { id: "pt", name: "Português", dir: "ltr" },
  { id: "ar", name: "العربية", dir: "rtl" },
  { id: "ru", name: "Русский", dir: "ltr" },
  { id: "zh", name: "中文", dir: "ltr" },
  { id: "ja", name: "日本語", dir: "ltr" },
  { id: "ko", name: "한국어", dir: "ltr" },
  { id: "hi", name: "हिन्दी", dir: "ltr" },
]

export const LOCALE_KEY = "pinwego.lang.v1"

export function isLocale(value: string | null | undefined): value is LocaleId {
  return localeIds.includes(value as LocaleId)
}

export function localeDir(locale: LocaleId) {
  return locales.find((item) => item.id === locale)?.dir ?? "ltr"
}

export function resolveLocale(stored: string | null | undefined, languages?: readonly string[]) {
  if (isLocale(stored)) return stored
  for (const tag of languages ?? []) {
    const base = tag.toLowerCase().split("-")[0]
    if (base === "zh") return "zh" as LocaleId
    if (isLocale(base)) return base
  }
  return "tr" as LocaleId
}

export function translate(locale: LocaleId, key: MessageKey, vars?: Record<string, string | number>) {
  const pack = messages[locale] ?? messages.en
  let text = pack[key] || messages.en[key] || messages.tr[key] || key
  if (vars) {
    for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value))
  }
  return text
}

let current: LocaleId = "tr"
const listeners = new Set<() => void>()

export function getLocale() {
  return current
}

export function getServerLocale(): LocaleId {
  return "tr"
}

export function subscribeLocale(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function applyDocument(locale: LocaleId) {
  if (typeof document === "undefined") return
  document.documentElement.lang = locale
  document.documentElement.dir = localeDir(locale)
}

export function setLocale(locale: LocaleId) {
  current = locale
  try {
    localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    /* ignore */
  }
  applyDocument(locale)
  listeners.forEach((listener) => listener())
}

export function bootLocale() {
  if (typeof window === "undefined") return current
  let stored: string | null = null
  try {
    stored = localStorage.getItem(LOCALE_KEY)
  } catch {
    stored = null
  }
  const next = resolveLocale(stored, navigator.languages)
  setLocale(next)
  return next
}

export const localeBootScript = `(function(){try{var ids=${JSON.stringify(localeIds)};var key=${JSON.stringify(LOCALE_KEY)};var stored=localStorage.getItem(key);var lang=stored;if(!lang||ids.indexOf(lang)<0){var prefs=navigator.languages||[navigator.language];lang="tr";for(var i=0;i<prefs.length;i++){var base=String(prefs[i]||"").toLowerCase().split("-")[0];if(base==="zh"){lang="zh";break}if(ids.indexOf(base)>=0){lang=base;break}}}if(!stored)localStorage.setItem(key,lang);document.documentElement.lang=lang;document.documentElement.dir=lang==="ar"?"rtl":"ltr";}catch(e){}})();`

export const searchSuggestions: Record<LocaleId, string[]> = {
  tr: [],
  en: ["dentist", "restaurant", "hotel", "pharmacy", "lawyer", "plumber"],
  de: ["Zahnarzt", "Restaurant", "Hotel", "Apotheke", "Anwalt", "Klempner"],
  fr: ["dentiste", "restaurant", "hôtel", "pharmacie", "avocat", "plombier"],
  es: ["dentista", "restaurante", "hotel", "farmacia", "abogado", "fontanero"],
  pt: ["dentista", "restaurante", "hotel", "farmácia", "advogado", "encanador"],
  ar: ["طبيب أسنان", "مطعم", "فندق", "صيدلية", "محامي", "سباك"],
  ru: ["стоматолог", "ресторан", "отель", "аптека", "адвокат", "сантехник"],
  zh: ["牙医", "餐厅", "酒店", "药店", "律师", "水管工"],
  ja: ["歯科", "レストラン", "ホテル", "薬局", "弁護士", "配管"],
  ko: ["치과", "레스토랑", "호텔", "약국", "변호사", "배관"],
  hi: ["दंत चिकित्सक", "रेस्तरां", "होटल", "फार्मेसी", "वकील", "प्लंबर"],
}
