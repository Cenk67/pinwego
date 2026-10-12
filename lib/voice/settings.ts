import { SPEECH_LANGUAGES, speechLanguageForLocale } from "@/lib/voice/languages"

export type SpeechProvider = "browser" | "openai" | "google" | "azure" | "whisper"

export type VoiceCopyKey =
  | "unsupported"
  | "denied"
  | "noMic"
  | "nothing"
  | "unclear"
  | "network"
  | "api"
  | "provider"
  | "locationNeed"

export type VoiceSettings = {
  enabled: boolean
  defaultLanguage: string
  languages: string[]
  provider: SpeechProvider
  parser: boolean
  maxSeconds: number
  analytics: boolean
  appearance: "outline" | "solid"
  copy: Record<VoiceCopyKey, string>
}

export const VOICE_SETTINGS_KEY = "pinwego.voice.v1"

const copyKeys: VoiceCopyKey[] = [
  "unsupported",
  "denied",
  "noMic",
  "nothing",
  "unclear",
  "network",
  "api",
  "provider",
  "locationNeed",
]

function emptyCopy(): Record<VoiceCopyKey, string> {
  return {
    unsupported: "",
    denied: "",
    noMic: "",
    nothing: "",
    unclear: "",
    network: "",
    api: "",
    provider: "",
    locationNeed: "",
  }
}

export const defaultVoiceSettings: VoiceSettings = {
  enabled: true,
  defaultLanguage: "auto",
  languages: SPEECH_LANGUAGES.map((item) => item.id),
  provider: "browser",
  parser: true,
  maxSeconds: 20,
  analytics: true,
  appearance: "outline",
  copy: emptyCopy(),
}

const providers: SpeechProvider[] = ["browser", "openai", "google", "azure", "whisper"]

function storage() {
  try {
    if (typeof localStorage !== "undefined") return localStorage
  } catch {
    /* private mode */
  }
  return null
}

export function normalizeVoiceSettings(value: unknown): VoiceSettings {
  const raw = value && typeof value === "object" ? (value as Partial<VoiceSettings>) : {}
  const known = new Set(SPEECH_LANGUAGES.map((item) => item.id))
  const languages = Array.isArray(raw.languages)
    ? raw.languages.filter((item): item is string => typeof item === "string" && known.has(item))
    : defaultVoiceSettings.languages
  const copy = emptyCopy()
  const incoming = (
    raw.copy && typeof raw.copy === "object" ? raw.copy : {}
  ) as Partial<Record<VoiceCopyKey, unknown>>
  for (const key of copyKeys) {
    const text = incoming[key]
    copy[key] = typeof text === "string" ? text.slice(0, 240) : ""
  }
  const requested = typeof raw.defaultLanguage === "string" ? raw.defaultLanguage : "auto"
  const maxSeconds = Number(raw.maxSeconds)
  return {
    enabled: raw.enabled !== false,
    defaultLanguage: requested === "auto" || known.has(requested) ? requested : "auto",
    languages: languages.length ? languages : ["tr-TR"],
    provider: providers.includes(raw.provider as SpeechProvider) ? (raw.provider as SpeechProvider) : "browser",
    parser: raw.parser !== false,
    maxSeconds: Number.isFinite(maxSeconds) ? Math.min(60, Math.max(5, Math.round(maxSeconds))) : 20,
    analytics: raw.analytics !== false,
    appearance: raw.appearance === "solid" ? "solid" : "outline",
    copy,
  }
}

let current = defaultVoiceSettings
let loaded = false
const listeners = new Set<() => void>()

export function getVoiceSettings() {
  if (!loaded) {
    loaded = true
    const box = storage()
    if (box) {
      try {
        const raw = box.getItem(VOICE_SETTINGS_KEY)
        if (raw) current = normalizeVoiceSettings(JSON.parse(raw))
      } catch {
        current = defaultVoiceSettings
      }
    }
  }
  return current
}

export function getServerVoiceSettings() {
  return defaultVoiceSettings
}

export function subscribeVoice(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function publish(next: VoiceSettings) {
  current = next
  loaded = true
  const box = storage()
  if (box) {
    try {
      box.setItem(VOICE_SETTINGS_KEY, JSON.stringify(next))
    } catch {
      /* ignore quota */
    }
  }
  listeners.forEach((listener) => listener())
}

export function updateVoiceSettings(patch: Partial<VoiceSettings>) {
  publish(
    normalizeVoiceSettings({
      ...getVoiceSettings(),
      ...patch,
      copy: { ...getVoiceSettings().copy, ...patch.copy },
    }),
  )
}

export function resetVoiceSettings() {
  publish(defaultVoiceSettings)
}

export function voiceMessage(settings: VoiceSettings, key: VoiceCopyKey, fallback: string) {
  const custom = settings.copy[key]?.trim()
  return custom || fallback
}

export function initialSpeechLanguage(locale: string, settings: VoiceSettings = getVoiceSettings()) {
  if (settings.defaultLanguage !== "auto" && settings.languages.includes(settings.defaultLanguage)) {
    return settings.defaultLanguage
  }
  const mapped = speechLanguageForLocale(locale)
  if (settings.languages.includes(mapped)) return mapped
  return settings.languages[0] ?? "tr-TR"
}
