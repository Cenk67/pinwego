"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"

export function VisitBeacon() {
  const pathname = usePathname()
  useEffect(() => {
    if (!pathname || pathname.startsWith("/api")) return
    const controller = new AbortController()
    void fetch("/api/olay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify({ path: pathname }),
      signal: controller.signal,
    }).catch(() => undefined)
    return () => controller.abort()
  }, [pathname])
  return null
}
