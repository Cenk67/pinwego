"use client"

import { useRef, useState } from "react"
import { Sparkles } from "lucide-react"
import { BusinessCard } from "@/components/business-card"
import { Button } from "@/components/ui/button"
import { runSearch } from "@/lib/search"
import type { Business } from "@/lib/types"

type Msg = {
  role: "user" | "assistant"
  text: string
  matches?: Business[]
}

const STARTERS = [
  "Kadıköy’de bu akşam teraslı restoran",
  "Yakınımda acil tesisatçı",
  "İhracat yapan gıda firması",
  "Üsküdar’da balayage randevusu",
]

function reply(query: string): Msg {
  const result = runSearch(query)
  const top = result.businesses.slice(0, 3)
  if (top.length === 0) {
    return {
      role: "assistant",
      text: "Bu cümleden net bir işletme çıkaramadım. Şehir veya kategori ekler misin? Örneğin “Ankara boya ustası” veya “Alsancak pizza”.",
    }
  }
  const names = top.map((b) => b.name).join(", ")
  return {
    role: "assistant",
    text: `${result.explanation} Öne çıkanlar: ${names}. Randevu veya teklif istiyorsan karttan devam et.`,
    matches: top,
  }
}

export function AssistantClient() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Ne arıyorsun? Restoran, randevu, ev hizmeti veya B2B firma yazman yeterli. Konum belirtmezsen Kadıköy civarını varsayarım.",
    },
  ])
  const [input, setInput] = useState("")
  const [pending, setPending] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  function send(text: string) {
    const q = text.trim()
    if (!q || pending) return
    setInput("")
    setMessages((m) => [...m, { role: "user", text: q }])
    setPending(true)
    window.setTimeout(() => {
      setMessages((m) => [...m, reply(q)])
      setPending(false)
      end.current?.scrollIntoView({ behavior: "smooth" })
    }, 450)
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col px-4 py-8">
      <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="size-4 text-primary" />
        Lumina asistan
      </p>
      <h1 className="mt-1 text-3xl md:text-4xl">Katalogu konuşarak tara</h1>

      <div className="mt-6 flex-1 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl bg-foreground px-4 py-3 text-sm text-background"
                  : "max-w-full space-y-3"
              }
            >
              {m.role === "assistant" && (
                <div className="rounded-2xl bg-card px-4 py-3 text-sm leading-relaxed ring-1 ring-foreground/10">
                  {m.text}
                </div>
              )}
              {m.role === "user" && m.text}
              {m.matches?.map((b) => (
                <BusinessCard key={b.slug} business={b} compact />
              ))}
            </div>
          </div>
        ))}
        {pending && (
          <p className="text-sm text-muted-foreground">Katalog taranıyor…</p>
        )}
        <div ref={end} />
      </div>

      <div className="sticky bottom-0 mt-6 space-y-3 bg-background/90 py-3 backdrop-blur">
        <div className="flex flex-wrap gap-2">
          {STARTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-full bg-card px-3 py-1.5 text-xs ring-1 ring-foreground/10 hover:ring-foreground/25"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Bir cümle yaz…"
            className="h-12 flex-1 rounded-xl border border-input bg-card px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          />
          <Button type="submit" className="h-12 px-5">
            Gönder
          </Button>
        </form>
      </div>
    </div>
  )
}
