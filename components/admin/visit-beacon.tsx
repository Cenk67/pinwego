"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { cookieChoice } from "@/components/directory/cookie-banner"

export function VisitBeacon() {
  const pathname = usePathname()
  useEffect(() => {
    if (!pathname || pathname.startsWith("/api")) return
    const controller = new AbortController()
    const send = () => {
      if (cookieChoice() !== "sayim") return
      void fetch("/api/olay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify({ path: pathname }),
        signal: controller.signal,
      }).catch(() => undefined)
    }
    send()
    window.addEventListener("pinwego-cerez", send)
    return () => {
      controller.abort()
      window.removeEventListener("pinwego-cerez", send)
    }
  }, [pathname])
  return null
}
