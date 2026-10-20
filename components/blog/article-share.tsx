"use client"

import { Check, Copy, Share2 } from "lucide-react"
import { useState, useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { shareTargets } from "@/lib/share"

function subscribe() {
  return () => {}
}

function canShareNow() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function"
}

export function ArticleShare({ title, text, path }: { title: string; text: string; path: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const canShare = useSyncExternalStore(subscribe, canShareNow, () => false)
  const origin = typeof window === "undefined" ? "https://pinwego.com" : window.location.origin
  const url = `${origin}${path}`
  const targets = shareTargets(url, text, title).filter((item) => ["whatsapp", "linkedin", "facebook", "x"].includes(item.id))

  async function shareNow() {
    if (canShare) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return
      }
    }
    setCopied(false)
    setOpen(true)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => void shareNow()}>
        <Share2 className="size-4" />
        Paylaş
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        {open ? (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl">Paylaş</DialogTitle>
            </DialogHeader>
            <p className="text-sm leading-6 text-muted-foreground">{title}</p>
            <div className="grid grid-cols-2 gap-2">
              {targets.map((target) => (
                <Button key={target.id} variant="outline" className="h-11 rounded-xl" nativeButton={false} render={<a href={target.href} target="_blank" rel="noreferrer" />}>
                  {target.label}
                </Button>
              ))}
            </div>
            <Button type="button" variant="secondary" className="h-11 rounded-xl" onClick={() => void copyLink()}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Bağlantı kopyalandı" : "Linki kopyala"}
            </Button>
            <p className="break-all text-xs text-muted-foreground">{url}</p>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  )
}
