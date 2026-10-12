import { getVoiceSettings } from "@/lib/voice/settings"

export type VoiceEventName =
  | "voice_search_started"
  | "voice_search_completed"
  | "voice_search_failed"
  | "voice_search_permission_denied"

export type VoiceEvent = {
  name: VoiceEventName
  at: number
  language?: string
  queryLength?: number
  resultCount?: number
  reason?: string
}

export type VoiceStats = {
  started: number
  completed: number
  failed: number
  denied: number
  events: VoiceEvent[]
}

const KEY = "pinwego.voice.analytics.v1"

const empty: VoiceStats = { started: 0, completed: 0, failed: 0, denied: 0, events: [] }

let stats = empty
let loaded = false
const listeners = new Set<() => void>()

function storage() {
  try {
    if (typeof localStorage !== "undefined") return localStorage
  } catch {
    /* ignore */
  }
  return null
}

function read(): VoiceStats {
  if (loaded) return stats
  loaded = true
  const box = storage()
  if (!box) return stats
  try {
    const raw = box.getItem(KEY)
    if (!raw) return stats
    const parsed = JSON.parse(raw) as Partial<VoiceStats>
    stats = {
      started: Number(parsed.started) || 0,
      completed: Number(parsed.completed) || 0,
      failed: Number(parsed.failed) || 0,
      denied: Number(parsed.denied) || 0,
      events: Array.isArray(parsed.events) ? parsed.events.slice(0, 20) : [],
    }
  } catch {
    stats = empty
  }
  return stats
}

export function getVoiceStats() {
  return read()
}

export function getServerVoiceStats(): VoiceStats {
  return empty
}

export function subscribeVoiceStats(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function recordVoice(
  name: VoiceEventName,
  detail: { language?: string; queryLength?: number; resultCount?: number; reason?: string } = {},
) {
  if (!getVoiceSettings().analytics) return
  const current = read()
  const event: VoiceEvent = {
    name,
    at: Date.now(),
    language: detail.language,
    queryLength: detail.queryLength,
    resultCount: detail.resultCount,
    reason: detail.reason,
  }
  const next: VoiceStats = {
    started: current.started + (name === "voice_search_started" ? 1 : 0),
    completed: current.completed + (name === "voice_search_completed" ? 1 : 0),
    failed: current.failed + (name === "voice_search_failed" ? 1 : 0),
    denied: current.denied + (name === "voice_search_permission_denied" ? 1 : 0),
    events: [event, ...current.events].slice(0, 20),
  }
  stats = next
  loaded = true
  const box = storage()
  if (box) {
    try {
      box.setItem(KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((listener) => listener())
}
