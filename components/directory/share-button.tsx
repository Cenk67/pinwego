"use client"

import { Check, Copy, Share2 } from "lucide-react"
import { useState, useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { businessShare, shareTargets } from "@/lib/share"
import type { Business } from "@/lib/types"
import { useLocale } from "@/lib/use-locale"
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
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return "unsupported" as const
  const share = payload(business)
  try {
    await navigator.share({ title: share.title, text: share.text, url: share.url })
    return "shared" as const
  } catch (error) {
    return error instanceof Error && error.name === "AbortError" ? "abort" as const : "fail" as const
  }
}

function recordShare(slug: string) {
  void fetch("/api/gorunum", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op: "paylas", slug }),
  }).catch(() => undefined)
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
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [manual, setManual] = useState(false)
  const [instagram, setInstagram] = useState(false)
  const canShare = useSyncExternalStore(subscribe, canShareNow, () => false)
  const share = payload(business)
  const targets = shareTargets(share.url, share.text, share.title)

  async function shareNow() {
    setCopied(false)
    setManual(false)
    setInstagram(false)
    const result = await nativeShare(business)
    if (result === "shared") {
      recordShare(business.slug)
      return
    }
    if (result === "abort") return
    setOpen(true)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(share.url)
      setCopied(true)
      setManual(false)
      recordShare(business.slug)
      return true
    } catch {
      setCopied(false)
      setManual(true)
      return false
    }
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          aria-label={`${business.name} ${t("views.share")}`}
          onClick={() => void shareNow()}
          className={cn(
            "grid size-9 place-items-center rounded-full bg-white/95 text-foreground shadow-sm ring-1 ring-foreground/10",
            className,
          )}
        >
          <Share2 className="size-4" />
        </button>
      ) : (
        <Button type="button" variant="outline" className={cn("h-11 rounded-xl", className)} onClick={() => void shareNow()}>
          <Share2 className="size-4" />
          {t("views.share")}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        {open ? (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">{t("views.shareTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-6 text-muted-foreground">{t("views.shareLead")}</p>
          <div className="grid grid-cols-2 gap-2">
            {targets.map((target) => (
              <Button
                key={target.id}
                variant="outline"
                className="h-11 justify-start rounded-xl"
                nativeButton={false}
                render={<a href={target.href} target="_blank" rel="noreferrer" onClick={() => recordShare(business.slug)} />}
              >
                {target.label}
              </Button>
            ))}
            <Button type="button" variant="outline" className="h-11 justify-start rounded-xl" onClick={() => void copyLink().then((ok) => setInstagram(ok))}>
              {t("views.instagram")}
            </Button>
          </div>
          {instagram ? <p className="text-sm text-primary">{t("views.instagramDone")}</p> : null}
          <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => void copyLink()}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? t("views.copied") : t("views.copy")}
          </Button>
          {manual ? (
            <label className="grid gap-1 text-sm">
              {t("views.copyFail")}
              <input readOnly value={share.url} className="h-11 rounded-xl bg-secondary px-3" onFocus={(event) => event.currentTarget.select()} />
            </label>
          ) : null}
          {canShare ? (
            <Button
              type="button"
              className="h-11 rounded-xl"
              onClick={() => {
                void nativeShare(business).then((result) => {
                  if (result === "shared") recordShare(business.slug)
                })
              }}
            >
              {t("views.moreApps")}
            </Button>
          ) : null}
        </DialogContent>
        ) : null}
      </Dialog>
    </>
  )
}
