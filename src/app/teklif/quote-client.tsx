"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import { Check } from "lucide-react"
import { BusinessCard } from "@/components/business-card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { BUSINESSES } from "@/lib/businesses"
import { CATEGORIES, CITIES } from "@/lib/categories"
import { runSearch } from "@/lib/search"
import { saveQuote } from "@/lib/storage"
import type { CategoryId } from "@/lib/types"
import { cn } from "@/lib/utils"

const QUOTE_CATS: CategoryId[] = [
  "ev-hizmetleri",
  "profesyonel",
  "alisveris",
  "otomotiv",
  "b2b",
]

export function QuoteClient() {
  const params = useSearchParams()
  const hedef = params.get("hedef")
  const preset = BUSINESSES.find((b) => b.slug === hedef)
  const [category, setCategory] = useState<CategoryId>(
    preset?.category && QUOTE_CATS.includes(preset.category)
      ? preset.category
      : "ev-hizmetleri"
  )
  const [title, setTitle] = useState(preset ? `${preset.name} için iş` : "")
  const [detail, setDetail] = useState("")
  const [city, setCity] = useState(preset?.citySlug ?? "istanbul")
  const [budget, setBudget] = useState("2.000–5.000 ₺")
  const [when, setWhen] = useState("Bu hafta")
  const [sent, setSent] = useState(false)

  const matches = useMemo(() => {
    const res = runSearch(`${title} ${detail}`, {
      category,
      city,
      wantsQuote: true,
    })
    let list = res.businesses.filter((b) => b.quoteEnabled)
    if (preset && !list.some((b) => b.slug === preset.slug) && preset.quoteEnabled) {
      list = [{ ...preset, score: 99 }, ...list]
    }
    return list.slice(0, 4)
  }, [title, detail, category, city, preset])

  if (sent) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-teal text-teal-foreground">
          <Check />
        </div>
        <h1 className="mt-4 text-3xl">Teklif talebin gitti</h1>
        <p className="mt-2 text-muted-foreground">
          {matches.length} uzman eşleşti. Demo ortamında yanıtlar bu cihazda saklanır.
        </p>
        <Link href="/ara?teklif=1" className={cn(buttonVariants(), "mt-6 inline-flex")}>
          Diğer uzmanlara bak
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm text-muted-foreground">Thumbtack · Angi · HomeAdvisor akışı</p>
      <h1 className="mt-1 text-3xl md:text-5xl">İhtiyacı yaz, uzmanlar eşleşsin</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Tesisat, tadilat, hukuk veya tedarik. Lumina metni okur, teklif açık
        işletmeleri skorlar.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
        <form
          className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
          onSubmit={(e) => {
            e.preventDefault()
            saveQuote({
              id: `Q-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
              category,
              title: title.trim(),
              detail: detail.trim(),
              city,
              budget,
              when,
              matches: matches.map((m) => ({ slug: m.slug, name: m.name })),
              createdAt: new Date().toISOString(),
            })
            setSent(true)
          }}
        >
          <div className="grid gap-1.5">
            <Label>Kategori</Label>
            <div className="flex flex-wrap gap-2">
              {QUOTE_CATS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCategory(id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm ring-1",
                    category === id
                      ? "bg-foreground text-background ring-foreground"
                      : "ring-foreground/15"
                  )}
                >
                  {CATEGORIES.find((c) => c.id === id)?.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="baslik">Kısa başlık</Label>
            <Input
              id="baslik"
              className="h-10"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mutfak lavabo kaçağı"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="detay">Detay</Label>
            <Textarea
              id="detay"
              required
              rows={5}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Ne oldu, metrekare, aciliyet, malzeme tercihi…"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="sehir">Şehir</Label>
              <select
                id="sehir"
                className="h-10 rounded-lg border border-input bg-transparent px-2 text-sm"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                {CITIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="butce">Bütçe</Label>
              <Input
                id="butce"
                className="h-10"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ne">Ne zaman</Label>
              <Input
                id="ne"
                className="h-10"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" size="lg" className="h-11 w-full" disabled={matches.length === 0}>
            {matches.length} uzmana gönder
          </Button>
        </form>

        <div>
          <h2 className="text-xl">AI eşleşmeleri</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Talep metni değiştikçe öneriler güncellenir.
          </p>
          <div className="mt-4 space-y-3">
            {matches.length === 0 && (
              <p className="rounded-2xl bg-card p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
                Bu şehir ve kategoride teklif açık işletme yok. Başka bir şehir deneyin.
              </p>
            )}
            {matches.map((b) => (
              <BusinessCard key={b.slug} business={b} compact />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
