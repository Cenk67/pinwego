"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useGuestGate } from "@/components/auth/guest-gate"
import {
  linkPlatforms,
  type BusinessLinks,
  type LinkKind,
  visibleLinks,
} from "@/lib/social-links"
import type { Business } from "@/lib/types"
import { cn } from "cn"

const tone: Record<LinkKind, string> = {
  website: "bg-foreground text-background",
  facebook: "bg-[#1877F2] text-white",
  instagram: "bg-[#E1306C] text-white",
  x: "bg-foreground text-background",
  linkedin: "bg-[#0A66C2] text-white",
  youtube: "bg-[#FF0033] text-white",
  tiktok: "bg-foreground text-background",
  n11: "bg-[#5C2D91] text-white",
  sahibinden: "bg-[#FFE500] text-foreground",
  arabam: "bg-[#E10600] text-white",
  hepsiemlak: "bg-[#D61F26] text-white",
  emlakjet: "bg-[#0091D5] text-white",
}

function Mark({ kind }: { kind: LinkKind }) {
  if (kind === "website") {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <ellipse cx="12" cy="12" rx="3.5" ry="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 12h16" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    )
  }
  if (kind === "facebook") {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path fill="currentColor" d="M14.2 20v-7.1h2.4l.4-2.8h-2.8V8.3c0-.8.2-1.4 1.4-1.4H17V4.4c-.3 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.6v2h-2.3v2.8H11.4V20h2.8Z" />
      </svg>
    )
  }
  if (kind === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16.6" cy="7.4" r="1" fill="currentColor" />
      </svg>
    )
  }
  if (kind === "x") {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path fill="currentColor" d="M6 5.5h3.1l3.1 4.3 3.6-4.3H18l-4.7 5.5L18.4 18.5h-3.1l-3.4-4.7-4 4.7H5.4l5.1-6L6 5.5Z" />
      </svg>
    )
  }
  if (kind === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path fill="currentColor" d="M7.2 9.2H4.6V19h2.6V9.2ZM5.9 4.5A1.5 1.5 0 1 0 5.9 7.5 1.5 1.5 0 0 0 5.9 4.5ZM19.4 19h-2.6v-5.1c0-1.4-.5-2.3-1.7-2.3-1 0-1.5.7-1.8 1.3-.1.2-.1.6-.1.9V19h-2.6s.1-8.6 0-9.8h2.6v1.6c.4-.6 1.2-1.8 3.1-1.8 2.2 0 3.9 1.5 3.9 4.6V19Z" />
      </svg>
    )
  }
  if (kind === "youtube") {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path fill="currentColor" d="M9.2 7.6v8.8L17.4 12 9.2 7.6Z" />
      </svg>
    )
  }
  if (kind === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path fill="currentColor" d="M14.2 4.2c.4 2.2 1.6 3.6 3.6 3.9v2.2c-1.2 0-2.3-.4-3.3-1.1v5.4a5.2 5.2 0 1 1-5.2-5.2c.2 0 .5 0 .7.1v2.3a2.9 2.9 0 1 0 2 2.8V4.2h2.2Z" />
      </svg>
    )
  }
  if (kind === "arabam") {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path fill="currentColor" d="M5 14.5 6.4 9.8A2 2 0 0 1 8.3 8.4h7.4a2 2 0 0 1 1.9 1.4L19 14.5v3.2h-1.4a1.6 1.6 0 0 1-3.2 0H9.6a1.6 1.6 0 0 1-3.2 0H5v-3.2Zm2.2-1.2h9.6l-.8-2.4H8l-.8 2.4Z" />
      </svg>
    )
  }
  if (kind === "hepsiemlak" || kind === "emlakjet") {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path fill="currentColor" d="M4.5 11.2 12 5l7.5 6.2V19a1 1 0 0 1-1 1h-4.2v-5.2H9.7V20H5.5a1 1 0 0 1-1-1v-7.8Z" />
      </svg>
    )
  }
  const letter = kind === "n11" ? "n" : "S"
  return <span className="text-[11px] font-bold leading-none">{letter}</span>
}

export function LinkLogo({ kind, className }: { kind: LinkKind; className?: string }) {
  return (
    <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", tone[kind], className)}>
      <Mark kind={kind} />
    </span>
  )
}

export function SocialLinks({ business }: { business: Pick<Business, "links" | "website"> }) {
  const items = visibleLinks(business)
  const { member, allow } = useGuestGate()
  if (!items.length) return null
  return (
    <section className="mt-5">
      <h2 className="font-heading text-lg">Sosyal Medya ve Linklerimiz</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.id}>
            {member ? (
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-secondary py-1 pr-3 pl-1 text-sm hover:bg-foreground/10"
              >
                <LinkLogo kind={item.id} />
                {item.label}
              </a>
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-secondary py-1 pr-3 pl-1 text-sm hover:bg-foreground/10"
                onClick={() => allow(() => undefined)}
              >
                <LinkLogo kind={item.id} />
                {item.label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function SocialLinkEditor({
  value,
  onChange,
}: {
  value: BusinessLinks
  onChange: (next: BusinessLinks) => void
}) {
  const [notice, setNotice] = useState("")
  return (
    <fieldset className="grid gap-2">
      <legend className="font-heading text-lg">Sosyal Medya ve Linklerimiz</legend>
      <p className="text-xs leading-5 text-muted-foreground">
        Dolu olanlar işletme sayfasında logo olarak durur. Boş bırakılan veya silinen link görünmez.
      </p>
      {linkPlatforms.map((platform) => {
        const current = value[platform.id] ?? ""
        return (
          <div key={platform.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
            <LinkLogo kind={platform.id} />
            <Input
              aria-label={platform.label}
              value={current}
              placeholder={`${platform.label} · ${platform.placeholder}`}
              className="h-10"
              onChange={(event) => {
                setNotice("")
                onChange({ ...value, [platform.id]: event.target.value })
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl px-3"
              disabled={!current.trim()}
              onClick={() => {
                const next = { ...value }
                delete next[platform.id]
                onChange(next)
                setNotice(`${platform.label} silindi. Kaydedince sayfadan kalkar.`)
              }}
            >
              Sil
            </Button>
          </div>
        )
      })}
      {notice ? <p className="text-xs text-muted-foreground">{notice}</p> : null}
    </fieldset>
  )
}
