"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { resolveQr } from "@/lib/qr"
import { recordQrEvent, takeQrReturn } from "@/lib/qr-store"

export function QrArrival({ businessId }: { businessId: string }) {
  const params = useSearchParams()
  const { account } = useAuth()
  const code = params.get("kart") ?? ""

  useEffect(() => {
    const hit = resolveQr(code)
    if (!hit || hit.businessId !== businessId) return
    const mark = `pinwego.qr.profile.${code}`
    let seen = false
    try {
      seen = sessionStorage.getItem(mark) === "1"
      if (!seen) sessionStorage.setItem(mark, "1")
    } catch {
      seen = false
    }
    if (!seen) {
      recordQrEvent({ code, businessId, kind: hit.kind, type: "profile_click", campaignId: hit.campaignId })
    }
    if (account && takeQrReturn(code)) {
      recordQrEvent({ code, businessId, kind: hit.kind, type: "register_done", campaignId: hit.campaignId })
    }
  }, [account, businessId, code])

  return null
}
