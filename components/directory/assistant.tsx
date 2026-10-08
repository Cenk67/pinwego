"use client"

import Link from "next/link"
import { Sparkles, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { allBusinesses, suggestions } from "@/lib/catalog"
import { useDirectory } from "@/lib/directory-context"
import { formatRating } from "@/lib/format"
import { concierge, type RankedBusiness } from "@/lib/match"

type Message = {
  id: string
  role: "user" | "assistant"
  text: string
  results?: RankedBusiness[]
}

export function Assistant() {
  const { assistantOpen, setAssistantOpen, listings, city } = useDirectory()
  const [draft, setDraft] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "hello",
      role: "assistant",
      text: "Katalogda semt, bütçe ya da aciliyet yaz. Üç kayda kadar gerekçesiyle getiririm.",
    },
  ])
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [messages, assistantOpen])

  function ask(text: string) {
    const query = text.trim()
    if (!query) return
    const answer = concierge(query, allBusinesses(listings), city)
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text: query },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: answer.text,
        results: answer.results,
      },
    ])
    setDraft("")
  }

  if (!assistantOpen) {
    return (
      <button
        type="button"
        onClick={() => setAssistantOpen(true)}
        className="fixed right-4 bottom-6 z-40 hidden h-12 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-lg md:flex"
      >
        <Sparkles className="size-4" />
        Asistan
      </button>
    )
  }

  return (
    <section
      className="fixed inset-x-3 top-20 bottom-20 z-50 flex flex-col overflow-hidden rounded-3xl bg-popover ring-1 ring-foreground/10 shadow-2xl md:inset-auto md:right-6 md:bottom-6 md:h-[34rem] md:w-[24rem]"
      aria-label="pinwego asistanı"
    >
      <header className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
        <div>
          <p className="font-heading text-lg leading-none">Asistan</p>
          <p className="mt-1 text-xs text-muted-foreground">Katalog içinden eşleştirir</p>
        </div>
        <button
          type="button"
          aria-label="Asistanı kapat"
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
              <p>{message.text}</p>
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
            </div>
          </div>
        ))}
        {messages.length === 1 ? (
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 3).map((item) => (
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
          <span className="sr-only">Asistana yaz</span>
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Üsküdar’da elektrikçi"
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
