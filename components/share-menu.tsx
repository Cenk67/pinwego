"use client"

import { Check, Copy, Share2 } from "lucide-react"
import { useState, useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { shareTargets } from "@/lib/share"
import { useLocale } from "@/lib/use-locale"
import { cn } from "cn"

function subscribe() {
  return () => {}
}

function canShareNow() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function"
}

async function nativeShare(share: { title: string; text: string; url: string }) {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return "unsupported" as const
  try {
    await navigator.share({ title: share.title, text: share.text, url: share.url })
    return "shared" as const
  } catch (error) {
    return error instanceof Error && error.name === "AbortError" ? "abort" as const : "fail" as const
  }
}

export function ShareMenu({
  title,
  text,
  url,
  lead,
  compact = true,
  className,
  ariaLabel,
  onRecord,
}: {
  title: string
  text: string
  url: string
  lead: string
  compact?: boolean
  className?: string
  ariaLabel: string
  onRecord?: () => void
}) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [manual, setManual] = useState(false)
  const [instagram, setInstagram] = useState(false)
  const canShare = useSyncExternalStore(subscribe, canShareNow, () => false)
  const targets = shareTargets(url, text, title)
  const share = { title, text, url }

  function recorded() {
    onRecord?.()
  }

  async function shareNow() {
    setCopied(false)
    setManual(false)
    setInstagram(false)
    const result = await nativeShare(share)
    if (result === "shared") {
      recorded()
      return
    }
    if (result === "abort") return
    setOpen(true)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setManual(false)
      recorded()
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
          aria-label={ariaLabel}
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
            <p className="text-sm leading-6 text-muted-foreground">{lead}</p>
            <div className="grid grid-cols-2 gap-2">
              {targets.map((target) => (
                <Button
                  key={target.id}
                  variant="outline"
                  className="h-11 justify-start rounded-xl"
                  nativeButton={false}
                  render={<a href={target.href} target="_blank" rel="noreferrer" onClick={() => recorded()} />}
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
                <input readOnly value={url} className="h-11 rounded-xl bg-secondary px-3" onFocus={(event) => event.currentTarget.select()} />
              </label>
            ) : null}
            {canShare ? (
              <Button
                type="button"
                className="h-11 rounded-xl"
                onClick={() => {
                  void nativeShare(share).then((result) => {
                    if (result === "shared") recorded()
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
