"use client"

import { useSyncExternalStore } from "react"
import {
  defaultSettings,
  normalizeSettings,
  seedCampaigns,
  todayISO,
  type Campaign,
  type CampaignSettings,
} from "@/lib/campaigns"

const STORAGE_KEY = "pinwego.campaigns.v1"

export type CampaignEvent = "view" | "detail" | "click" | "save" | "unsave" | "share" | "whatsapp" | "website" | "redeem"

type Persisted = {
  patches: Record<string, Campaign>
  removed: string[]
  savedIds: string[]
  actorId: string
  settings: CampaignSettings
  viewedCategories: string[]
}

const serverState: Persisted = {
  patches: {},
  removed: [],
  savedIds: [],
  actorId: "",
  settings: defaultSettings,
  viewedCategories: [],
}

let memory: Persisted = serverState
let loaded = false
const listeners = new Set<() => void>()

function isCampaign(value: unknown): value is Campaign {
  if (!value || typeof value !== "object") return false
  const row = value as Partial<Campaign>
  return typeof row.id === "string" && typeof row.slug === "string" && typeof row.businessId === "string" && typeof row.status === "string"
}

function readStorage(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...serverState, actorId: mintActor() }
    const data = JSON.parse(raw) as Partial<Persisted>
    const patches: Record<string, Campaign> = {}
    if (data.patches && typeof data.patches === "object") {
      for (const [id, row] of Object.entries(data.patches)) {
        if (isCampaign(row)) patches[id] = row
      }
    }
    return {
      patches,
      removed: Array.isArray(data.removed) ? data.removed.filter((id) => typeof id === "string") : [],
      savedIds: Array.isArray(data.savedIds) ? data.savedIds.filter((id) => typeof id === "string") : [],
      actorId: typeof data.actorId === "string" && data.actorId ? data.actorId : mintActor(),
      settings: normalizeSettings(data.settings),
      viewedCategories: Array.isArray(data.viewedCategories) ? data.viewedCategories.filter((id) => typeof id === "string").slice(0, 12) : [],
    }
  } catch {
    return { ...serverState, actorId: mintActor() }
  }
}

function mintActor() {
  return `yerel-${Math.random().toString(36).slice(2, 10)}`
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  if (!loaded) {
    loaded = true
    memory = readStorage()
  }
  return memory
}

function getServerSnapshot() {
  return serverState
}

function commit(next: Persisted) {
  memory = next
  loaded = true
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory))
  } catch {
    // The overlay can exceed the browser quota after a large image. Keep the in-memory copy.
  }
  listeners.forEach((listener) => listener())
}

export function listCampaigns(state: Persisted = getSnapshot()) {
  const removed = new Set(state.removed)
  const byId = new Map<string, Campaign>()
  for (const item of seedCampaigns) {
    if (!removed.has(item.id)) byId.set(item.id, state.patches[item.id] ?? item)
  }
  for (const [id, item] of Object.entries(state.patches)) {
    if (!removed.has(id)) byId.set(id, item)
  }
  return [...byId.values()]
}

export function replaceCampaign(campaign: Campaign) {
  const current = getSnapshot()
  commit({ ...current, patches: { ...current.patches, [campaign.id]: campaign } })
}

export function rememberCategory(category: string) {
  const current = getSnapshot()
  if (!current.settings.personalization || current.viewedCategories.includes(category)) return
  commit({ ...current, viewedCategories: [category, ...current.viewedCategories].slice(0, 12) })
}

function bump(campaign: Campaign, field: "views" | "clicks" | "whatsappClicks" | "websiteClicks" | "saves" | "shares") {
  replaceCampaign({ ...campaign, [field]: campaign[field] + 1 })
}

export function trackCampaign(id: string, event: CampaignEvent) {
  const campaign = listCampaigns().find((item) => item.id === id)
  if (!campaign) return
  const day = todayISO()
  if (event === "view" || event === "detail") {
    const key = `pinwego.campaign.view.${id}.${day}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, "1")
    } catch {
      return
    }
    bump(campaign, "views")
    return
  }
  if (event === "click") bump(campaign, "clicks")
  if (event === "whatsapp") bump(campaign, "whatsappClicks")
  if (event === "website") bump(campaign, "websiteClicks")
  if (event === "share") bump(campaign, "shares")
  if (event === "save") bump(campaign, "saves")
  if (event === "unsave") replaceCampaign({ ...campaign, saves: Math.max(0, campaign.saves - 1) })
}

export function useCampaigns() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const campaigns = listCampaigns(state)
  return {
    campaigns,
    savedIds: state.savedIds,
    actorId: state.actorId,
    settings: state.settings,
    viewedCategories: state.viewedCategories,
    ready: state !== serverState,
    isSaved: (id: string) => state.savedIds.includes(id),
    toggleSaved: (id: string) => {
      const current = getSnapshot()
      const saved = current.savedIds.includes(id)
      commit({
        ...current,
        savedIds: saved ? current.savedIds.filter((item) => item !== id) : [...current.savedIds, id],
      })
      trackCampaign(id, saved ? "unsave" : "save")
    },
    saveCampaign: (campaign: Campaign) => replaceCampaign(campaign),
    saveSettings: (settings: CampaignSettings) => {
      const current = getSnapshot()
      commit({ ...current, settings: { ...normalizeSettings(settings), moderationRequired: true } })
    },
  }
}
