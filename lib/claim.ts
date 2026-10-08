import type { Business } from "@/lib/types"

export const CLAIM_KEY = "pinwego.claim.v1"

export function claimListing(business: Business, ownerAccountId: string): Business {
  return {
    ...business,
    source: "senin",
    ownerAccountId,
    verified: true,
    about: `${business.about} İşletme sahibi kaydı kabul etti; bu tarayıcıdaki işletme hesabına yazıldı.`,
    facts: [...business.facts, { label: "Sahiplenme", value: "İşletme kaydıyla projeye alındı" }],
  }
}
