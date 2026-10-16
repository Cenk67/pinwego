import { accountStore } from "@/lib/account-kv"
import { listingsKey, parseBook, toBusiness } from "@/lib/listings"
import { businessCode, findBusiness, resolveQr, type QrHit } from "@/lib/qr"
import type { Business } from "@/lib/types"

export async function openQr(code: string): Promise<{ hit: QrHit; business: Business } | null> {
  const known = resolveQr(code)
  if (known) {
    const business = findBusiness(known.businessId)
    if (!business || business.profile?.published === false) return null
    return { hit: known, business }
  }
  const store = await accountStore()
  if (!store) return null
  const book = parseBook(await store.get(listingsKey))
  if (!book) return null
  const clean = code.trim().toLowerCase()
  if (!/^[a-z2-9]{10}$/.test(clean)) return null
  const row = book.listings.find((item) => {
    if (item.hidden) return false
    return businessCode(item.id, "business") === clean || businessCode(item.id, "vcard") === clean
  })
  if (!row) return null
  const kind = businessCode(row.id, "vcard") === clean ? "vcard" : "business"
  const hit: QrHit = { code: clean, kind, businessId: row.id }
  return { hit, business: toBusiness(row) }
}
