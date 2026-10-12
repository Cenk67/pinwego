import { seedCampaigns } from "@/lib/campaigns"
import { businesses } from "@/lib/catalog"
import type { Business } from "@/lib/types"

export const QR_ORIGIN = "https://pinwego.com"

export const qrKinds = ["business", "vcard", "campaign"] as const
export type QrKind = (typeof qrKinds)[number]

export const qrEventTypes = [
  "qr_scan",
  "qr_landing_view",
  "vcard_click",
  "vcard_download",
  "profile_click",
  "login_click",
  "register_click",
  "register_done",
  "campaign_view",
  "campaign_use",
] as const

export type QrEventType = (typeof qrEventTypes)[number]
export type QrDevice = "mobile" | "desktop"

export type QrEvent = {
  code: string
  businessId: string
  kind: QrKind
  type: QrEventType
  at: string
  device: QrDevice
  campaignId?: string
}

export type QrHit = {
  code: string
  kind: QrKind
  businessId: string
  campaignId?: string
}

const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"

function mix(value: string) {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function qrToken(seed: string) {
  let x = mix(`pinwego.qr.v1:${seed}`)
  let out = ""
  for (let i = 0; i < 10; i += 1) {
    x = Math.imul(x ^ (x >>> 16), 2246822519) >>> 0
    out += alphabet[x % alphabet.length]
  }
  return out
}

export function businessCode(businessId: string, kind: "business" | "vcard" = "business") {
  return qrToken(`${kind}:${businessId}`)
}

export function campaignCode(campaignId: string) {
  return qrToken(`campaign:${campaignId}`)
}

const index = new Map<string, QrHit>()

for (const business of businesses) {
  for (const kind of ["business", "vcard"] as const) {
    const code = businessCode(business.id, kind)
    index.set(code, { code, kind, businessId: business.id })
  }
}

for (const campaign of seedCampaigns) {
  const code = campaignCode(campaign.id)
  index.set(code, { code, kind: "campaign", businessId: campaign.businessId, campaignId: campaign.id })
}

export function resolveQr(code: string): QrHit | null {
  const clean = code.trim().toLowerCase()
  if (!/^[a-z2-9]{10}$/.test(clean)) return null
  return index.get(clean) ?? null
}

export function qrPath(code: string) {
  return `/q/${code}`
}

export function qrUrl(code: string) {
  return `${QR_ORIGIN}${qrPath(code)}`
}

export function vcardPath(code: string) {
  return `/q/${code}/vcard`
}

export function posterPath(code: string) {
  return `/q/${code}/baski`
}

export function profileUrl(slug: string) {
  return `${QR_ORIGIN}/isletme/${slug}`
}

const controls = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

export function vcardText(value: string) {
  return value.replace(controls, "").replace(/\\/g, "\\\\").replace(/\r\n|\n|\r/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,")
}

function fold(line: string) {
  const parts: string[] = []
  let rest = line
  let limit = 74
  while (rest.length > limit) {
    parts.push(rest.slice(0, limit))
    rest = rest.slice(limit)
    limit = 73
  }
  parts.push(rest)
  return parts.map((part, index) => (index === 0 ? part : ` ${part}`)).join("\r\n")
}

export function buildVCard(business: Pick<Business, "name" | "slug" | "phone" | "address" | "city" | "photo" | "website">) {
  const photo = business.photo.startsWith("/") ? `${QR_ORIGIN}${business.photo}` : ""
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${vcardText(business.name)}`,
    `ORG:${vcardText(business.name)}`,
    business.phone.trim() ? `TEL;TYPE=VOICE:${vcardText(business.phone)}` : "",
    `ADR;TYPE=WORK:;;${vcardText(business.address)};${vcardText(business.city)};;;Türkiye`,
    `URL:${profileUrl(business.slug)}`,
    business.website?.trim() ? `URL;TYPE=WORK:${vcardText(business.website.trim())}` : "",
    "NOTE:Pinwego",
    photo ? `PHOTO;MEDIATYPE=image/jpeg:${photo}` : "",
    "END:VCARD",
  ].filter(Boolean)
  return `${lines.map(fold).join("\r\n")}\r\n`
}

export function vcardFilename(slug: string) {
  const safe = slug.toLowerCase().replace(/[^a-z0-9-]/g, "") || "isletme"
  return `pinwego-${safe}.vcf`
}

export function allowQrEvent(lastAt: number, now: number, gapMs = 2000) {
  return now - lastAt >= gapMs
}

export function allowQrBurst(stamps: number[], now: number, limit = 30, windowMs = 60_000) {
  const fresh = stamps.filter((at) => now - at < windowMs)
  if (fresh.length >= limit) return { ok: false as const, stamps: fresh }
  return { ok: true as const, stamps: [...fresh, now] }
}

export type QrSummary = {
  scan: number
  landing: number
  vcard: number
  profile: number
  registerClick: number
  registerDone: number
  campaignView: number
  campaignUse: number
  week: number
  month: number
  vcardRate: number
  registerRate: number
}

function emptySummary(): QrSummary {
  return { scan: 0, landing: 0, vcard: 0, profile: 0, registerClick: 0, registerDone: 0, campaignView: 0, campaignUse: 0, week: 0, month: 0, vcardRate: 0, registerRate: 0 }
}

function bump(summary: QrSummary, type: QrEventType) {
  if (type === "qr_scan") summary.scan += 1
  if (type === "qr_landing_view") summary.landing += 1
  if (type === "vcard_download") summary.vcard += 1
  if (type === "profile_click") summary.profile += 1
  if (type === "register_click" || type === "login_click") summary.registerClick += 1
  if (type === "register_done") summary.registerDone += 1
  if (type === "campaign_view") summary.campaignView += 1
  if (type === "campaign_use") summary.campaignUse += 1
}

export function summarizeQr(events: QrEvent[], now = new Date()) {
  const summary = emptySummary()
  const week = now.getTime() - 7 * 86400000
  const month = now.getTime() - 30 * 86400000
  for (const event of events) {
    bump(summary, event.type)
    const at = Date.parse(event.at)
    if (event.type === "qr_scan" && at >= week) summary.week += 1
    if (event.type === "qr_scan" && at >= month) summary.month += 1
  }
  summary.vcardRate = summary.scan ? Math.round((summary.vcard / summary.scan) * 100) : 0
  summary.registerRate = summary.scan ? Math.round((summary.registerDone / summary.scan) * 100) : 0
  return summary
}

export function topQrBusinesses(events: QrEvent[], limit = 5) {
  const counts = new Map<string, number>()
  for (const event of events) {
    if (event.type !== "qr_scan") continue
    counts.set(event.businessId, (counts.get(event.businessId) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
}

function sample(businessId: string, kind: QrKind, type: QrEventType, at: string, device: QrDevice = "mobile", campaignId?: string): QrEvent {
  const code = kind === "campaign" && campaignId ? campaignCode(campaignId) : businessCode(businessId, kind === "vcard" ? "vcard" : "business")
  return { code, businessId, kind, type, at, device, campaignId }
}

export const seedQrEvents: QrEvent[] = [
  sample("yokustepe-kahvalti-waffle", "business", "qr_scan", "2026-10-08T09:00:00.000Z"),
  sample("yokustepe-kahvalti-waffle", "business", "qr_landing_view", "2026-10-08T09:00:00.000Z"),
  sample("yokustepe-kahvalti-waffle", "business", "vcard_download", "2026-10-08T09:01:00.000Z"),
  sample("yokustepe-kahvalti-waffle", "business", "profile_click", "2026-10-08T09:02:00.000Z"),
  sample("yokustepe-kahvalti-waffle", "business", "qr_scan", "2026-10-11T18:10:00.000Z"),
  sample("yokustepe-kahvalti-waffle", "business", "qr_landing_view", "2026-10-11T18:10:00.000Z"),
  sample("yokustepe-kahvalti-waffle", "business", "vcard_download", "2026-10-11T18:11:00.000Z"),
  sample("yokustepe-kahvalti-waffle", "business", "register_click", "2026-10-11T18:12:00.000Z"),
  sample("yokustepe-kahvalti-waffle", "business", "register_done", "2026-10-11T18:14:00.000Z"),
  sample("yokustepe-kahvalti-waffle", "business", "qr_scan", "2026-10-12T08:30:00.000Z", "desktop"),
  sample("yokustepe-kahvalti-waffle", "business", "qr_landing_view", "2026-10-12T08:30:00.000Z", "desktop"),
  sample("balikci-mehmet", "business", "qr_scan", "2026-10-10T12:00:00.000Z"),
  sample("balikci-mehmet", "business", "qr_landing_view", "2026-10-10T12:00:00.000Z"),
  sample("balikci-mehmet", "business", "vcard_download", "2026-10-10T12:02:00.000Z"),
  sample("balikci-mehmet", "business", "profile_click", "2026-10-10T12:03:00.000Z"),
  sample("balikci-mehmet", "campaign", "qr_scan", "2026-10-12T11:00:00.000Z", "mobile", "kampanya-balikci"),
  sample("balikci-mehmet", "campaign", "campaign_view", "2026-10-12T11:01:00.000Z", "mobile", "kampanya-balikci"),
]

export function findBusiness(id: string) {
  return businesses.find((item) => item.id === id) ?? null
}
