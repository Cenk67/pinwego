"use client"

import Link from "next/link"
import { useEffect } from "react"
import { useMessages } from "@/lib/message-context"

export function MessageToast() {
  const { toast, dismissToast } = useMessages()

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => dismissToast(), 7000)
    return () => window.clearTimeout(timer)
  }, [toast, dismissToast])

  if (!toast) return null

  return (
    <Link
      href={toast.href}
      onClick={dismissToast}
      className="fixed inset-x-4 bottom-24 z-50 max-w-sm rounded-2xl bg-foreground px-4 py-3 text-sm text-background shadow-lg md:inset-x-auto md:right-4 md:bottom-8"
    >
      <p className="font-medium">Yeni mesaj · {toast.title}</p>
      <p className="mt-1 line-clamp-2 text-background/80">{toast.body}</p>
    </Link>
  )
}
