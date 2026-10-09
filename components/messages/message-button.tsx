"use client"

import { useRouter } from "next/navigation"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGuestGate } from "@/components/auth/guest-gate"
import { useAuth } from "@/lib/auth-context"
import { useMessages } from "@/lib/message-context"
import { ownsListing } from "@/lib/message-store"
import type { Business } from "@/lib/types"
import { cn } from "cn"

export function MessageButton({
  business,
  compact = false,
  className,
}: {
  business: Business
  compact?: boolean
  className?: string
}) {
  const router = useRouter()
  const { account } = useAuth()
  const { allow } = useGuestGate()
  const { openWithBusiness } = useMessages()
  const mine = account ? ownsListing(account, business) : false

  function open() {
    allow(() => {
      if (mine) {
        router.push("/mesajlar")
        return
      }
      const thread = openWithBusiness(business)
      if (thread) router.push(`/mesajlar?konusma=${encodeURIComponent(thread.id)}`)
    })
  }

  if (compact) {
    return (
      <button
        type="button"
        aria-label={mine ? `${business.name} gelen kutusu` : `${business.name} mesaj gönder`}
        onClick={open}
        className={cn(
          "grid size-9 place-items-center rounded-full bg-white/95 text-foreground shadow-sm ring-1 ring-foreground/10",
          className,
        )}
      >
        <MessageCircle className="size-4" />
      </button>
    )
  }

  return (
    <Button type="button" variant="outline" className={cn("h-11 rounded-xl", className)} onClick={open}>
      <MessageCircle className="size-4" />
      {mine ? "Gelen kutusu" : "Mesaj gönder"}
    </Button>
  )
}
