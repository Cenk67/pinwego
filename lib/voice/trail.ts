import type { VoicePatch } from "@/lib/voice/intent"

export type VoiceTrail = {
  id: string
  mark: string
  open: boolean
  rating: string | null
  sort: string | null
  near: boolean
  family: boolean
  delivery: boolean
  note: "location" | null
}

export function voiceQueryMark(query: string) {
  let hash = 0
  const text = query.trim()
  for (let index = 0; index < text.length; index += 1) hash = (Math.imul(hash, 31) + text.charCodeAt(index)) >>> 0
  return `${text.length}:${hash}`
}

export type VoicePending = {
  id: string
  language: string
  queryLength: number
}

const CHIPS_KEY = "pinwego.voice.chips"
const PENDING_KEY = "pinwego.voice.pending"

let chips: VoiceTrail | null = null
let chipsLoaded = false
let pending: VoicePending | null = null
let pendingLoaded = false
let consumed = ""
const listeners = new Set<() => void>()

function storage() {
  try {
    if (typeof sessionStorage !== "undefined") return sessionStorage
  } catch {
    /* ignore */
  }
  return null
}

function publish() {
  listeners.forEach((listener) => listener())
}

export function subscribeVoiceTrail(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getVoiceTrail() {
  if (!chipsLoaded) {
    chipsLoaded = true
    const box = storage()
    if (box) {
      try {
        const raw = box.getItem(CHIPS_KEY)
        chips = raw ? (JSON.parse(raw) as VoiceTrail) : null
      } catch {
        chips = null
      }
    }
  }
  return chips
}

export function getServerVoiceTrail() {
  return null
}

export function stageVoiceTrail(
  patch: VoicePatch,
  detail: { language: string; queryLength: number; query: string; note?: "location" | null },
) {
  const id = `${Date.now()}`
  chips = {
    id,
    mark: voiceQueryMark(detail.query ?? ""),
    open: patch.acik === "1",
    rating: patch.puan,
    sort: patch.sirala,
    near: patch.near,
    family: patch.family,
    delivery: patch.delivery,
    note: detail.note ?? null,
  }
  pending = { id, language: detail.language, queryLength: detail.queryLength }
  chipsLoaded = true
  pendingLoaded = true
  consumed = ""
  const box = storage()
  if (box) {
    try {
      box.setItem(CHIPS_KEY, JSON.stringify(chips))
      box.setItem(PENDING_KEY, JSON.stringify(pending))
    } catch {
      /* ignore */
    }
  }
  publish()
}

export function clearVoiceTrail() {
  chips = null
  pending = null
  chipsLoaded = true
  pendingLoaded = true
  const box = storage()
  if (box) {
    try {
      box.removeItem(CHIPS_KEY)
      box.removeItem(PENDING_KEY)
    } catch {
      /* ignore */
    }
  }
  publish()
}

function readPending() {
  if (pendingLoaded) return pending
  pendingLoaded = true
  const box = storage()
  if (!box) return pending
  try {
    const raw = box.getItem(PENDING_KEY)
    pending = raw ? (JSON.parse(raw) as VoicePending) : null
  } catch {
    pending = null
  }
  return pending
}

export function consumeVoicePending() {
  const current = readPending()
  if (!current || current.id === consumed) return null
  consumed = current.id
  pending = null
  const box = storage()
  if (box) {
    try {
      box.removeItem(PENDING_KEY)
    } catch {
      /* ignore */
    }
  }
  return current
}
