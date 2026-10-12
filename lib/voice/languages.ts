import type { LocaleId } from "@/lib/i18n-ids"

export type SpeechLanguage = {
  id: string
  label: string
}

export const SPEECH_LANGUAGES: SpeechLanguage[] = [
  { id: "tr-TR", label: "Türkçe" },
  { id: "en-US", label: "English (US)" },
  { id: "en-GB", label: "English (UK)" },
  { id: "de-DE", label: "Deutsch" },
  { id: "fr-FR", label: "Français" },
  { id: "es-ES", label: "Español" },
  { id: "pt-BR", label: "Português" },
  { id: "ar-SA", label: "العربية" },
  { id: "ru-RU", label: "Русский" },
  { id: "zh-CN", label: "中文" },
  { id: "ja-JP", label: "日本語" },
  { id: "ko-KR", label: "한국어" },
  { id: "hi-IN", label: "हिन्दी" },
]

const localeSpeech: Record<LocaleId, string> = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  pt: "pt-BR",
  ar: "ar-SA",
  ru: "ru-RU",
  zh: "zh-CN",
  ja: "ja-JP",
  ko: "ko-KR",
  hi: "hi-IN",
}

export function speechLanguageForLocale(locale: string) {
  if (locale in localeSpeech) return localeSpeech[locale as LocaleId]
  return "tr-TR"
}

export function speechLanguageLabel(id: string) {
  return SPEECH_LANGUAGES.find((item) => item.id === id)?.label ?? id
}
