import type { AccountStatus, AccountStore, PublicAccount } from "@/lib/account-record"

export const customersKey = "customers:v1"

export type CustomerRow = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  birthDate: string
  occupation: string
  status: AccountStatus
  createdAt: string
  verifiedAt: string
  updatedAt: string
  lastLoginAt: string
  marketing: boolean
  legacyId: boolean
}

export type CustomerAudit = {
  at: string
  actor: "yonetici" | "musteri"
  action: string
  detail: string
}

function asRow(value: unknown): CustomerRow | null {
  if (!value || typeof value !== "object") return null
  const row = value as Partial<CustomerRow>
  if (typeof row.id !== "string" || typeof row.email !== "string") return null
  const status = row.status
  if (status !== "bekliyor" && status !== "aktif" && status !== "askida" && status !== "silindi") return null
  return {
    id: row.id,
    email: row.email,
    firstName: typeof row.firstName === "string" ? row.firstName : "",
    lastName: typeof row.lastName === "string" ? row.lastName : "",
    phone: typeof row.phone === "string" ? row.phone : "",
    birthDate: typeof row.birthDate === "string" ? row.birthDate : "",
    occupation: typeof row.occupation === "string" ? row.occupation : "",
    status,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : "",
    verifiedAt: typeof row.verifiedAt === "string" ? row.verifiedAt : "",
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : "",
    lastLoginAt: typeof row.lastLoginAt === "string" ? row.lastLoginAt : "",
    marketing: row.marketing === true,
    legacyId: row.legacyId === true,
  }
}

export async function readCustomers(store: AccountStore) {
  const raw = await store.get(customersKey)
  if (!raw) return []
  try {
    const data = JSON.parse(raw) as { items?: unknown }
    if (!Array.isArray(data.items)) return []
    return data.items.map(asRow).filter((item): item is CustomerRow => item !== null)
  } catch {
    return []
  }
}

export function customerTotals(items: CustomerRow[]) {
  const total = items.length
  const aktif = items.filter((item) => item.status === "aktif").length
  const bekliyor = items.filter((item) => item.status === "bekliyor").length
  const askida = items.filter((item) => item.status === "askida").length
  const silindi = items.filter((item) => item.status === "silindi").length
  const verified = items.filter((item) => item.verifiedAt.length > 0).length
  const rate = total === 0 ? 0 : Math.round((verified / total) * 100)
  return { total, aktif, bekliyor, askida, silindi, verified, rate }
}

export async function rememberCustomer(store: AccountStore, account: PublicAccount, marketing = false) {
  if (account.role !== "musteri") return
  const items = await readCustomers(store)
  const prior = items.find((item) => item.id === account.id)
  if (!prior && items.length >= 4000) return
  const row: CustomerRow = {
    id: account.id,
    email: account.email,
    firstName: account.customer?.firstName ?? "",
    lastName: account.customer?.lastName ?? "",
    phone: account.phone,
    birthDate: account.customer?.birthDate ?? "",
    occupation: account.customer?.occupation ?? "",
    status: account.status,
    createdAt: account.createdAt,
    verifiedAt: account.verifiedAt,
    updatedAt: account.updatedAt,
    lastLoginAt: account.lastLoginAt,
    marketing: marketing,
    legacyId: account.customer?.legacyId === true,
  }
  const next = [row, ...items.filter((item) => item.id !== row.id)].slice(0, 4000)
  await store.put(customersKey, JSON.stringify({ items: next }))
}

function logKey(id: string) {
  return `custlog:${id}`
}

export async function readCustomerAudit(store: AccountStore, id: string) {
  const raw = await store.get(logKey(id))
  if (!raw) return []
  try {
    const data = JSON.parse(raw) as { items?: unknown }
    if (!Array.isArray(data.items)) return []
    return data.items.filter((item): item is CustomerAudit => {
      if (!item || typeof item !== "object") return false
      const row = item as Partial<CustomerAudit>
      return typeof row.at === "string" && (row.actor === "yonetici" || row.actor === "musteri") && typeof row.action === "string" && typeof row.detail === "string"
    }).slice(0, 40)
  } catch {
    return []
  }
}

export async function noteCustomerAudit(store: AccountStore, id: string, actor: CustomerAudit["actor"], action: string, detail: string, nowIso: string) {
  const items = await readCustomerAudit(store, id)
  const next = [{ at: nowIso, actor, action: action.slice(0, 40), detail: detail.slice(0, 180) }, ...items].slice(0, 40)
  await store.put(logKey(id), JSON.stringify({ items: next }))
}
