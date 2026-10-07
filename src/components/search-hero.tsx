"use client"

import { useRouter } from "next/navigation"
import { MapPin, Sparkles } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { USER_LOCATION } from "@/lib/categories"

const PROMPTS = [
  "Kadıköy’de bu akşam 4 kişilik teraslı restoran",
  "Yakınımda acil tesisatçı",
  "Üsküdar kuaför, balayage randevusu",
  "İzmir’e zeytinyağı ihracatçısı",
  "Beşiktaş’te öğle arası berber",
]

export function SearchHero() {
  const router = useRouter()
  const [q, setQ] = useState("")

  function go(query: string, extra?: string) {
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (extra) extra.split("&").forEach((pair) => {
      const [k, v] = pair.split("=")
      if (k && v) params.set(k, v)
    })
    router.push(`/ara?${params.toString()}`)
  }

  return (
    <section className="paper-grid relative overflow-hidden border-b border-border">
      <div className="mx-auto max-w-6xl px-4 pt-12 pb-16 md:pt-20 md:pb-24">
        <p className="inline-flex items-center gap-2 rounded-full bg-card/80 px-3 py-1 text-xs font-medium ring-1 ring-foreground/10">
          <Sparkles className="size-3.5 text-primary" />
          Doğal dilde ara · harita · randevu · teklif · B2B istihbarat
        </p>
        <h1 className="mt-5 max-w-3xl text-4xl leading-[1.05] text-balance md:text-6xl">
          Ne arıyorsan Lumina anlasın.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
          Yelp yorumları, Booksy randevusu, Thumbtack teklifi ve Dun &amp; Bradstreet
          firma verisi tek katalogda. Cümle yaz, işletmeyi bul.
        </p>

        <form
          className="mt-8 rounded-2xl bg-card p-2 shadow-lg ring-1 ring-foreground/10 sm:p-3"
          onSubmit={(e) => {
            e.preventDefault()
            go(q)
          }}
        >
          <label className="sr-only" htmlFor="hero-q">
            Yapay zekâ araması
          </label>
          <textarea
            id="hero-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            rows={2}
            placeholder="Örn. Kadıköy’de bu akşam teraslı, orta fiyatlı restoran"
            className="w-full resize-none bg-transparent px-3 py-2 text-base outline-none md:text-lg"
          />
          <div className="flex flex-col gap-2 px-2 pb-1 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => go("yakınımda açık işletme", "near=1")}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <MapPin className="size-4 text-primary" />
              {USER_LOCATION.label} · yakınımda
            </button>
            <Button type="submit" size="lg" className="h-11 px-5">
              <Sparkles className="size-4" />
              AI ile ara
            </Button>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap gap-2">
          {PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setQ(p)
                go(p)
              }}
              className="rounded-full bg-card/70 px-3 py-1.5 text-left text-xs text-muted-foreground ring-1 ring-foreground/10 hover:text-foreground hover:ring-foreground/20 md:text-sm"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
