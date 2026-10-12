export const localeIds = ["tr", "en", "de", "fr", "es", "pt", "ar", "ru", "zh", "ja", "ko", "hi"] as const

export type LocaleId = (typeof localeIds)[number]
