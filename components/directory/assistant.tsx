"use client"

import Link from "next/link"
import { Sparkles, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GuideList } from "@/components/blog/guide-list"
import { useBlog } from "@/components/blog/blog-context"
import { publicArticles, searchGuides, type GuideHit } from "@/lib/blog"
import { suggestions } from "@/lib/catalog"
import { mapsSearchUrl, videoSearchUrl, webSearchUrl, type DiscoverEventType } from "@/lib/discover"
import { recordDiscoverEvent } from "@/lib/discover-store"
import { trackNeed } from "@/lib/need-client"
import { searchSuggestions } from "@/lib/i18n"
import { useDirectory } from "@/lib/directory-context"
import { formatRating } from "@/lib/format"
import { concierge, type RankedBusiness } from "@/lib/match"
import { useNeedScope } from "@/lib/need-scope"
import { useLocale } from "@/lib/use-locale"

type Message = {
  id: string
  role: "user" | "assistant"
  text: string
  results?: RankedBusiness[]
  guides?: GuideHit[]
  outsideQuery?: string
}

export function Assistant() {
  const { assistantOpen, setAssistantOpen, visibleBusinesses, city } = useDirectory()
  const { locale, t } = useLocale()
  const scope = useNeedScope()
  const blog = useBlog()
  const chips = locale === "tr" ? suggestions : searchSuggestions[locale]
  const [draft, setDraft] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "hello",
      role: "assistant",
      text: "",
    },
  ])
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [messages, assistantOpen])

  function ask(text: string) {
    const query = text.trim()
    if (!query) return
    const answer = concierge(query, visibleBusinesses, city)
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text: query },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: answer.text,
        results: answer.results,
        guides: searchGuides(publicArticles(blog.document), query),
        outsideQuery: "outside" in answer && answer.outside ? query : undefined,
      },
    ])
    setDraft("")
  }

  if (!assistantOpen) {
    return (
      <button
        type="button"
        onClick={() => setAssistantOpen(true)}
        className="fixed end-4 bottom-24 z-40 flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-lg print:hidden md:bottom-6"
      >
        <Sparkles className="size-4" />
        {t("assist.open")}
      </button>
    )
  }

  return (
    <section
      className="fixed inset-x-3 top-20 bottom-20 z-50 flex flex-col overflow-hidden rounded-3xl bg-popover ring-1 ring-foreground/10 shadow-2xl print:hidden md:inset-auto md:end-6 md:bottom-6 md:h-[34rem] md:w-[24rem]"
      aria-label={t("assist.open")}
    >
      <header className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
        <div>
          <p className="font-heading text-lg leading-none">{t("assist.open")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("assist.matches")}</p>
        </div>
        <button
          type="button"
          aria-label={t("assist.close")}
          onClick={() => setAssistantOpen(false)}
          className="grid size-8 place-items-center rounded-full hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
        {messages.map((message) => (
          <div key={message.id} className={message.role === "user" ? "flex justify-end" : ""}>
            <div
              className={
                message.role === "user"
                  ? "max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground"
                  : "max-w-[95%] text-sm leading-6"
              }
            >
              <p>{message.id === "hello" ? t("assist.hello") : message.text}</p>
              {message.results?.length ? (
                <div className="mt-2 grid gap-2">
                  {message.results.map((item) => (
                    <Link
                      key={item.business.id}
                      href={`/isletme/${item.business.slug}`}
                      onClick={() => setAssistantOpen(false)}
                      className="rounded-2xl bg-card px-3 py-2 ring-1 ring-foreground/10"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-medium">{item.business.name}</span>
                        <span>{formatRating(item.business)}</span>
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {item.business.district} · {item.reason}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}
              {message.guides?.length ? (
                <GuideList hits={message.guides} onOpen={() => setAssistantOpen(false)} />
              ) : null}
              {message.outsideQuery && scope !== "pinwego" ? (
                <OutsideLinks query={message.outsideQuery} city={city} />
              ) : null}
            </div>
          </div>
        ))}
        {messages.length === 1 ? (
          <div className="flex flex-wrap gap-2">
            {chips.slice(0, 3).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => ask(item)}
                className="rounded-full bg-secondary px-3 py-1.5 text-left text-xs"
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}
        <div ref={endRef} />
      </div>
      <form
        className="flex gap-2 border-t border-foreground/10 p-3"
        onSubmit={(event) => {
          event.preventDefault()
          ask(draft)
        }}
      >
        <label className="flex-1">
          <span className="sr-only">{t("assist.open")}</span>
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("search.placeholder")}
            className="h-11"
          />
        </label>
        <Button type="submit" className="h-11 rounded-xl px-4">
          Sor
        </Button>
      </form>
    </section>
  )
}

function OutsideLinks({ query, city }: { query: string; city: string }) {
  const { t } = useLocale()
  const links: { href: string; label: string; type: DiscoverEventType }[] = []
  const maps = mapsSearchUrl(query, city)
  const web = webSearchUrl(query, city)
  const video = videoSearchUrl(query, city)
  if (maps) links.push({ href: maps, label: t("discover.maps"), type: "maps_click" })
  if (web) links.push({ href: web, label: t("discover.web"), type: "web_click" })
  if (video) links.push({ href: video, label: t("discover.video"), type: "video_click" })
  if (!links.length) return null
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {links.map((item) => (
        <a
          key={item.type}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            recordDiscoverEvent({ type: item.type, q: query, city })
            trackNeed({ kind: "external", q: query, city, target: item.type === "maps_click" ? "maps" : item.type === "video_click" ? "video" : "web" })
          }}
          className="rounded-full bg-secondary px-3 py-1.5 text-xs"
        >
          {item.label}
        </a>
      ))}
    </div>
  )
}
