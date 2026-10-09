"use client"

import { Check, Copy, Share2 } from "lucide-react"
import { useState, useSyncExternalStore } from "react"
import { useGuestGate } from "@/components/auth/guest-gate"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { businessShare, shareTargets } from "@/lib/share"
import type { Business } from "@/lib/types"
import { cn } from "cn"

function subscribe() {
  return () => {}
}

function canShareNow() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function"
}

function payload(business: Business) {
  const origin = typeof window === "undefined" ? "" : window.location.origin
  return businessShare(business, origin)
}

async function nativeShare(business: Business) {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false
  const share = payload(business)
  try {
    await navigator.share({ title: share.title, text: share.text, url: share.url })
    return true
  } catch (error) {
    return error instanceof Error && error.name === "AbortError"
  }
}

export function ShareButton({
  business,
  className,
  compact = true,
}: {
  business: Business
  className?: string
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const { allow } = useGuestGate()
  const canShare = useSyncExternalStore(subscribe, canShareNow, () => false)
  const share = payload(business)
  const targets = shareTargets(share.url, share.text, share.title)

  function start() {
    allow(() => {
      void shareNow()
    })
  }

  async function shareNow() {
    setCopied(false)
    if (await nativeShare(business)) return
    setOpen(true)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(share.url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          aria-label={`${business.name} paylaş`}
          onClick={start}
          className={cn(
            "grid size-9 place-items-center rounded-full bg-white/95 text-foreground shadow-sm ring-1 ring-foreground/10",
            className,
          )}
        >
          <Share2 className="size-4" />
        </button>
      ) : (
        <Button type="button" variant="outline" className={cn("h-11 rounded-xl", className)} onClick={start}>
          <Share2 className="size-4" />
          Paylaş
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        {open ? (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">Paylaş</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-6 text-muted-foreground">
            {business.name} kaydını istediğin uygulamaya gönder. Telefonda sistem menüsü bütün uygulamaları listeler.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {targets.map((target) => (
              <Button
                key={target.id}
                variant="outline"
                className="h-11 justify-start rounded-xl"
                nativeButton={false}
                render={<a href={target.href} target="_blank" rel="noreferrer" />}
              >
                {target.label}
              </Button>
            ))}
          </div>
          <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={copyLink}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Bağlantı kopyalandı" : "Bağlantıyı kopyala"}
          </Button>
          {canShare ? (
            <Button type="button" className="h-11 rounded-xl" onClick={() => nativeShare(business)}>
              Diğer uygulamalar
            </Button>
          ) : null}
        </DialogContent>
        ) : null}
      </Dialog>
    </>
  )
}
