"use client"

import { Mic } from "lucide-react"
import { createContext, useContext, useEffect, useImperativeHandle, useRef, useState, useSyncExternalStore, type ReactNode, type Ref } from "react"
import { useDirectory } from "@/lib/directory-context"
import type { Place } from "@/lib/place"
import { recordVoice } from "@/lib/voice/analytics"
import { understandVoice, voicePatch, type VoicePatch } from "@/lib/voice/intent"
import { SPEECH_LANGUAGES } from "@/lib/voice/languages"
import type { SpeechErrorCode } from "@/lib/voice/session"
import {
  getServerVoiceSettings,
  getVoiceSettings,
  initialSpeechLanguage,
  subscribeVoice,
  voiceMessage,
  type VoiceCopyKey,
} from "@/lib/voice/settings"
import {
  clearVoiceTrail,
  consumeVoicePending,
  getServerVoiceTrail,
  getVoiceTrail,
  stageVoiceTrail,
  subscribeVoiceTrail,
  voiceQueryMark,
} from "@/lib/voice/trail"
import { useLocale } from "@/lib/use-locale"
import type { MessageKey } from "@/lib/messages"
import { cn } from "cn"

export type VoiceHandle = {
  listening: boolean
  stop: () => void
  cancel: () => void
}

type Phase = "idle" | "listening" | "near" | "locating" | "error"

type VoiceApi = {
  enabled: boolean
  appearance: "outline" | "solid"
  phase: Phase
  seconds: number
  lang: string
  notice: string
  languages: string[]
  start: () => void
  stop: () => void
  cancel: () => void
  chooseLanguage: (lang: string) => void
  useLocation: () => void
  searchWithoutLocation: () => void
}

const VoiceContext = createContext<VoiceApi | null>(null)

function useVoiceApi() {
  const api = useContext(VoiceContext)
  if (!api) throw new Error("Sesli arama arama kutusunun içinde kullanılır.")
  return api
}

function clock(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, "0")}`
}

function copyKey(code: SpeechErrorCode): VoiceCopyKey | null {
  if (code === "denied") return "denied"
  if (code === "no-mic") return "noMic"
  if (code === "nothing") return "nothing"
  if (code === "network") return "network"
  if (code === "api") return "api"
  if (code === "unclear") return "unclear"
  if (code === "aborted") return null
  return "api"
}

async function locationPermission(): Promise<"granted" | "prompt" | "denied"> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return "denied"
  const permissions = navigator.permissions
  if (!permissions?.query) return "prompt"
  try {
    const status = await permissions.query({ name: "geolocation" })
    if (status.state === "granted" || status.state === "prompt" || status.state === "denied") return status.state
  } catch {
    return "prompt"
  }
  return "prompt"
}

export function VoiceSearchRoot({
  value,
  onTranscript,
  onCommit,
  handleRef,
  children,
}: {
  value: string
  onTranscript: (value: string) => void
  onCommit: (value: string, patch: VoicePatch) => void
  handleRef?: Ref<VoiceHandle | null>
  children: ReactNode
}) {
  const { locale, t } = useLocale()
  const { visibleBusinesses, setPlace } = useDirectory()
  const settings = useSyncExternalStore(subscribeVoice, getVoiceSettings, getServerVoiceSettings)
  const [phase, setPhase] = useState<Phase>("idle")
  const [seconds, setSeconds] = useState(0)
  const [notice, setNotice] = useState("")
  const [lang, setLang] = useState(() => initialSpeechLanguage(locale, settings))
  const token = useRef(0)
  const active = useRef<{ stop: () => void; cancel: () => void } | null>(null)
  const snapshot = useRef(value)
  const pending = useRef<{ text: string; patch: VoicePatch } | null>(null)
  const phaseRef = useRef(phase)
  const langRef = useRef(lang)
  const valueRef = useRef(value)
  const businessesRef = useRef(visibleBusinesses)
  const setPlaceRef = useRef(setPlace)
  const onTranscriptRef = useRef(onTranscript)
  const onCommitRef = useRef(onCommit)
  const tRef = useRef(t)
  const picked = useRef(false)
  const locateToken = useRef(0)
  const stopRef = useRef<() => void>(() => undefined)
  const cancelRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    if (picked.current || phase !== "idle") return
    setLang(initialSpeechLanguage(locale, settings))
  }, [locale, settings, phase])

  function say(key: VoiceCopyKey) {
    return voiceMessage(getVoiceSettings(), key, tRef.current(`voice.${key}` as MessageKey))
  }

  function commit(text: string, patch: VoicePatch, speechLang: string, note: "location" | null) {
    pending.current = null
    stageVoiceTrail(patch, { language: speechLang, queryLength: text.length, query: text, note })
    setPhase("idle")
    setNotice("")
    onCommitRef.current(text, patch)
  }

  function fail(key: VoiceCopyKey, speechLang: string, code: string) {
    if (code === "denied") recordVoice("voice_search_permission_denied", { language: speechLang, reason: code })
    else recordVoice("voice_search_failed", { language: speechLang, reason: code })
    setNotice(say(key))
    setPhase("error")
  }

  function locate(text: string, patch: VoicePatch, speechLang: string) {
    setPhase("locating")
    setNotice(tRef.current("voice.locating"))
    if (!navigator.geolocation) {
      commit(text, { ...patch, near: false }, speechLang, "location")
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (token.current !== locateToken.current) return
        try {
          const response = await fetch(`/api/yer?lat=${position.coords.latitude}&lng=${position.coords.longitude}`)
          if (!response.ok) throw new Error("yer")
          const place = (await response.json()) as Place
          setPlaceRef.current({ ...place, nearMe: true })
          commit(text, patch, speechLang, null)
        } catch {
          commit(text, { ...patch, near: false }, speechLang, "location")
        }
      },
      () => {
        if (token.current !== locateToken.current) return
        commit(text, { ...patch, near: false }, speechLang, "location")
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }

  async function finish(text: string, speechLang: string, mine: number) {
    const current = getVoiceSettings()
    const clean = text.trim().slice(0, 240)
    if (!clean) {
      fail("nothing", speechLang, "nothing")
      return
    }
    const patch = voicePatch(understandVoice(clean, businessesRef.current), current.parser)
    if (!patch.near) {
      commit(clean, patch, speechLang, null)
      return
    }
    pending.current = { text: clean, patch }
    const permission = await locationPermission()
    if (token.current !== mine) return
    if (permission === "granted") {
      locateToken.current = mine
      locate(clean, patch, speechLang)
      return
    }
    if (permission === "denied") {
      commit(clean, { ...patch, near: false }, speechLang, "location")
      return
    }
    setNotice(say("locationNeed"))
    setPhase("near")
  }

  async function start(nextLang?: string) {
    const speechLang = nextLang ?? langRef.current
    const mine = ++token.current
    active.current?.cancel()
    active.current = null
    pending.current = null
    setLang(speechLang)
    setPhase("listening")
    setSeconds(0)
    setNotice("")
    if (!nextLang) snapshot.current = valueRef.current
    const current = getVoiceSettings()
    let session: typeof import("@/lib/voice/session")
    try {
      session = await import("@/lib/voice/session")
    } catch {
      if (token.current !== mine) return
      fail("api", speechLang, "api")
      return
    }
    if (token.current !== mine) return
    if (current.provider !== "browser") {
      fail("provider", speechLang, "provider")
      return
    }
    if (!session.browserSupportsSpeech()) {
      fail("unsupported", speechLang, "unsupported")
      return
    }
    recordVoice("voice_search_started", { language: speechLang })
    active.current = session.listen({
      lang: speechLang,
      maxSeconds: current.maxSeconds,
      onTranscript: (text) => {
        if (token.current !== mine) return
        onTranscriptRef.current(text)
      },
      onTick: (elapsed) => {
        if (token.current !== mine) return
        setSeconds(elapsed)
      },
      onError: (code) => {
        if (token.current !== mine) return
        const key = copyKey(code)
        if (!key) return
        fail(key, speechLang, code)
      },
      onEnd: (text) => {
        if (token.current !== mine) return
        void finish(text, speechLang, mine)
      },
    })
  }

  function stop() {
    if (phaseRef.current === "listening") {
      active.current?.stop()
      return
    }
    const current = pending.current
    if (current && phaseRef.current === "near") {
      commit(current.text, { ...current.patch, near: false }, langRef.current, null)
    }
  }

  function cancel() {
    token.current += 1
    locateToken.current = token.current + 1
    active.current?.cancel()
    active.current = null
    pending.current = null
    onTranscriptRef.current(snapshot.current)
    setPhase("idle")
    setNotice("")
  }

  function chooseLanguage(next: string) {
    picked.current = true
    setLang(next)
    langRef.current = next
    if (phaseRef.current === "listening") void start(next)
  }

  function useLocation() {
    const current = pending.current
    if (!current) return
    const mine = token.current
    locateToken.current = mine
    locate(current.text, current.patch, langRef.current)
  }

  function searchWithoutLocation() {
    const current = pending.current
    if (!current) return
    commit(current.text, { ...current.patch, near: false }, langRef.current, null)
  }

  useEffect(() => {
    phaseRef.current = phase
    langRef.current = lang
    valueRef.current = value
    businessesRef.current = visibleBusinesses
    setPlaceRef.current = setPlace
    onTranscriptRef.current = onTranscript
    onCommitRef.current = onCommit
    tRef.current = t
    stopRef.current = stop
    cancelRef.current = cancel
  })

  useImperativeHandle(handleRef, () => ({
    get listening() {
      const current = phaseRef.current
      return current === "listening" || current === "near" || current === "locating"
    },
    stop: () => stopRef.current(),
    cancel: () => cancelRef.current(),
  }))

  const api: VoiceApi = {
    enabled: settings.enabled,
    appearance: settings.appearance,
    phase,
    seconds,
    lang,
    notice,
    languages: settings.languages,
    start: () => void start(),
    stop,
    cancel,
    chooseLanguage,
    useLocation,
    searchWithoutLocation,
  }

  return <VoiceContext.Provider value={api}>{children}</VoiceContext.Provider>
}

export function VoiceMic() {
  const api = useVoiceApi()
  const { t } = useLocale()
  if (!api.enabled) return null
  const listening = api.phase === "listening"
  return (
    <button
      type="button"
      aria-label={t("voice.aria")}
      aria-pressed={listening}
      onClick={() => {
        if (api.phase === "listening") api.stop()
        else if (api.phase !== "locating") api.start()
      }}
      className={cn(
        "absolute end-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        listening
          ? "bg-red-600 text-white"
          : api.appearance === "solid"
            ? "bg-primary text-primary-foreground hover:bg-primary/80"
            : "bg-card text-foreground ring-1 ring-foreground/15 hover:bg-secondary",
      )}
    >
      <Mic className="size-5" />
    </button>
  )
}

function Wave() {
  return (
    <div className="mt-3 flex h-8 items-end gap-1" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6].map((index) => (
        <span
          key={index}
          className="w-1 rounded-full bg-red-600 motion-safe:animate-pulse"
          style={{ height: `${12 + ((index * 13) % 18)}px`, animationDelay: `${index * 120}ms` }}
        />
      ))}
    </div>
  )
}

export function VoicePanel() {
  const api = useVoiceApi()
  const { t } = useLocale()
  if (!api.enabled || api.phase === "idle") return null
  const languages = SPEECH_LANGUAGES.filter((item) => api.languages.includes(item.id))
  return (
    <div className="w-full rounded-2xl bg-card p-4 ring-1 ring-foreground/10" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "relative grid size-11 shrink-0 place-items-center rounded-full text-white",
            api.phase === "listening" ? "bg-red-600" : "bg-foreground/80",
          )}
        >
          {api.phase === "listening" ? <span className="absolute inset-0 rounded-full bg-red-600/40 motion-safe:animate-ping" /> : null}
          <Mic className="relative size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {api.phase === "listening"
              ? t("voice.listen")
              : api.phase === "locating"
                ? t("voice.locating")
                : api.phase === "near"
                  ? t("voice.locationNeed")
                  : api.notice}
          </p>
          {api.phase === "listening" ? <p className="text-xs text-muted-foreground">{clock(api.seconds)}</p> : null}
        </div>
        {api.phase === "listening" ? (
          <button type="button" onClick={api.stop} className="h-11 rounded-full bg-red-600 px-4 text-sm text-white">
            {t("voice.stop")}
          </button>
        ) : null}
      </div>
      {api.phase === "listening" ? <Wave /> : null}
      {api.phase === "listening" ? (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground">{t("voice.language")}</p>
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {languages.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => api.chooseLanguage(item.id)}
                className={
                  api.lang === item.id
                    ? "h-11 shrink-0 rounded-full bg-primary px-3 text-sm text-primary-foreground"
                    : "h-11 shrink-0 rounded-full bg-secondary px-3 text-sm"
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {api.phase === "near" ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={api.useLocation} className="h-11 rounded-full bg-primary px-4 text-sm text-primary-foreground">
            {t("voice.useLocation")}
          </button>
          <button type="button" onClick={api.searchWithoutLocation} className="h-11 rounded-full bg-secondary px-4 text-sm">
            {t("voice.searchAnyway")}
          </button>
        </div>
      ) : null}
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{t("voice.privacy")}</p>
      <button type="button" onClick={api.cancel} className="mt-2 h-11 text-sm text-muted-foreground">
        {t("voice.cancel")}
      </button>
    </div>
  )
}

export function VoiceTrail({ count, query }: { count: number; query: string }) {
  const trail = useSyncExternalStore(subscribeVoiceTrail, getVoiceTrail, getServerVoiceTrail)
  const { t } = useLocale()
  const current = trail && trail.mark === voiceQueryMark(query) ? trail : null
  useEffect(() => {
    if (trail && trail.mark !== voiceQueryMark(query)) clearVoiceTrail()
  }, [trail, query])
  useEffect(() => {
    const pending = consumeVoicePending()
    if (!pending) return
    recordVoice("voice_search_completed", {
      language: pending.language,
      queryLength: pending.queryLength,
      resultCount: count,
    })
  }, [count, trail?.id])
  if (!current) return null
  const sortLabel =
    current.sort === "fiyat"
      ? t("search.sortPrice")
        : current.sort === "mesafe"
        ? t("search.sortDistance")
        : current.sort === "puan"
          ? t("search.sortRating")
          : null
  const chips = [
    current.open ? t("voice.open") : null,
    current.rating ? t("voice.rating", { rating: current.rating }) : null,
    current.near ? t("voice.near") : null,
    current.family ? t("voice.family") : null,
    current.delivery ? t("voice.delivery") : null,
    sortLabel,
  ].filter((item): item is string => Boolean(item))
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">{t("voice.chip")}</span>
        {chips.map((item) => (
          <span key={item} className="rounded-full bg-secondary px-3 py-1 text-xs">
            {item}
          </span>
        ))}
      </div>
      {current.note === "location" ? <p className="mt-2 text-sm text-muted-foreground">{t("voice.locationNeed")}</p> : null}
    </div>
  )
}
