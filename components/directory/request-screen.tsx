"use client"

import { useMemo, useState } from "react"
import { BusinessCard } from "@/components/directory/business-card"
import { fieldClass } from "@/components/directory/bits"
import { MiniMap } from "@/components/directory/mini-map"
import { PlaceEditor } from "@/components/directory/place-picker"
import { QuoteDialog } from "@/components/directory/quote-dialog"
import { WhenField, todayIso } from "@/components/directory/when-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { allBusinesses } from "@/lib/catalog"
import { useDirectory } from "@/lib/directory-context"
import { fold } from "@/lib/format"
import { defaultFilters, searchDirectory } from "@/lib/match"
import { applyPlace, placeLabel } from "@/lib/place"
import type { Business, CategoryId } from "@/lib/types"

const steps = ["Anlat", "Yer", "Eşleşme"]
const popular = ["yeme", "temizlik", "usta", "saglik", "oto", "hukuk", "konaklama", "guzellik"]

function budgetMaxPrice(budget: string) {
  const folded = fold(budget)
  if (!folded || folded.includes("fark etmez")) return 4
  if (["ekonomik", "ucuz", "uygun"].some((word) => folded.includes(word))) return 2
  if (folded.includes("orta")) return 3
  if (["ust", "luks", "premium"].some((word) => folded.includes(word))) return 4
  const amount = Number(budget.replace(/\./g, "").replace(/,/g, "").match(/\d+/)?.[0] ?? "")
  if (amount > 0 && amount <= 3000) return 2
  if (amount > 3000 && amount <= 20000) return 3
  return 4
}

export function RequestScreen() {
  const { listings, requests, place, setPlace, sectors } = useDirectory()
  const [step, setStep] = useState(0)
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<CategoryId | "hepsi">("hepsi")
  const [when, setWhen] = useState("Bu hafta")
  const [whenDate, setWhenDate] = useState("")
  const [budget, setBudget] = useState("")
  const [error, setError] = useState("")
  const [target, setTarget] = useState<Business | null>(null)

  const query = [
    description,
    place.neighborhood,
    place.district,
    place.province,
    when === "Bugün" || whenDate === todayIso() ? "bugün acil" : "",
    budgetMaxPrice(budget) <= 2 ? "uygun fiyat" : "",
    ["ust", "luks", "premium"].some((word) => fold(budget).includes(word)) ? "lüks" : "",
  ]
    .filter(Boolean)
    .join(" ")

  const matches = useMemo(() => {
    if (step < 2) return { items: [], widened: false }
    const origin = { name: place.province || place.country || "Konum", lat: place.lat, lng: place.lng }
    const ranked = searchDirectory(allBusinesses(listings), query, {
      ...defaultFilters,
      sehir: "hepsi",
      kategori: category,
      maxPrice: budgetMaxPrice(budget),
    }, origin)
    const scoped = applyPlace(ranked, place)
    return { items: scoped.items.slice(0, 3), widened: scoped.widened }
  }, [step, listings, query, place, category, budget])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <p className="text-sm font-medium text-primary">Talep</p>
      <h1 className="mt-2 font-heading text-4xl leading-tight md:text-5xl">İhtiyacı yaz, üç kayıt gelsin.</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Usta, temizlik, ofis tedariki ya da randevulu hizmet. Eşleşme katalogdaki fiyat ve dönüş süresine bakar.
      </p>
      <ol className="mt-6 flex gap-2 text-sm">
        {steps.map((label, index) => (
          <li
            key={label}
            className={
              index === step
                ? "rounded-full bg-primary px-3 py-1 text-primary-foreground"
                : "rounded-full bg-secondary px-3 py-1 text-muted-foreground"
            }
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <form
          className="mt-6 grid gap-4 rounded-3xl bg-card p-5 ring-1 ring-foreground/10"
          onSubmit={(event) => {
            event.preventDefault()
            if (description.trim().length < 8) {
              setError("İşi bir cümleyle anlat. En az sekiz karakter.")
              return
            }
            setError("")
            setStep(1)
          }}
        >
          <Label htmlFor="job">Ne lazım?</Label>
          <Textarea
            id="job"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Beşiktaş’ta iki oda boyanacak, eşyalar yerinde kalacak."
            className="min-h-28"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory("hepsi")}
              className={category === "hepsi" ? "rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground" : "rounded-full bg-secondary px-3 py-1 text-xs"}
            >
              Kategori serbest
            </button>
            {sectors
              .filter((item) => popular.includes(item.id))
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  className={category === item.id ? "rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground" : "rounded-full bg-secondary px-3 py-1 text-xs"}
                >
                  {item.label}
                </button>
              ))}
          </div>
          <label className="grid gap-1.5 text-sm">
            Tüm sektörler
            <select
              className={fieldClass}
              value={category}
              onChange={(event) => setCategory(event.target.value as CategoryId | "hepsi")}
            >
              <option value="hepsi">Hepsi</option>
              {sectors.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="h-11 rounded-xl">
            Devam
          </Button>
        </form>
      ) : null}

      {step === 1 ? (
        <form
          className="mt-6 grid gap-4 rounded-3xl bg-card p-5 ring-1 ring-foreground/10"
          onSubmit={(event) => {
            event.preventDefault()
            setStep(2)
          }}
        >
          <div className="grid gap-3">
            <div>
              <p className="text-sm font-medium">Konum</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Şehir listesi yok. Ülke, bölge, il, ilçe ve semt birbirine bağlıdır; yakınımdakiler tarayıcı konumunu
                kullanır. Seçtiğin nokta Google Haritalar üzerinde durur.
              </p>
            </div>
            <PlaceEditor current={place} onChange={setPlace} embedded />
          </div>
          <WhenField
            value={when}
            date={whenDate}
            onChange={(next) => {
              setWhen(next.when)
              setWhenDate(next.date)
            }}
          />
          <div className="grid gap-1.5">
            <Label htmlFor="job-budget">Bütçe</Label>
            <Input
              id="job-budget"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              placeholder="İstediğini yaz: 8.000 TL, malzeme dahil, fark etmez…"
              className="h-11"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setStep(0)}>
              Geri
            </Button>
            <Button type="submit" className="h-11 flex-1 rounded-xl">
              Eşleştir
            </Button>
          </div>
        </form>
      ) : null}

      {step === 2 ? (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {place.nearMe ? "Yakınımdakiler" : placeLabel(place)}
              {matches.items.length ? " · fiyatlar kayıtlı hizmet listesinden" : " · bu tarifte kayıt çıkmadı"}
              {matches.widened ? " · 40 km içinde örnek kayıt yok, en yakınlar duruyor" : ""}
            </p>
            <button type="button" className="text-sm text-primary" onClick={() => setStep(1)}>
              Konumu değiştir
            </button>
          </div>
          <MiniMap
            label={place.nearMe ? "Yakınımdakiler" : placeLabel(place)}
            points={matches.items.map((item) => item.business)}
            focus={place}
            className="mt-4 h-48"
          />
          {matches.items.length ? (
            <div className="mt-4 grid gap-4">
              {matches.items.map((item) => (
                <div key={item.business.id}>
                  <BusinessCard business={item.business} distanceKm={item.distanceKm} reason={item.reason} />
                  <Button
                    type="button"
                    className="mt-2 h-10 rounded-xl"
                    onClick={() => setTarget(item.business)}
                  >
                    Bu kayıtla devam et
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-3xl bg-card p-5 text-sm leading-6 text-muted-foreground ring-1 ring-foreground/10">
              Örnek katalog İstanbul, Ankara, İzmir, Antalya, Bursa ve Zonguldak kayıtlarından oluşur. Seçtiğin yer bu
              listede yoksa Google haritası yine o noktayı gösterir. Konumu değiştirip yeniden eşleştirebilirsin.
            </div>
          )}
        </div>
      ) : null}

      {requests.length ? (
        <section className="mt-10">
          <h2 className="font-heading text-2xl">Bu tarayıcıdaki talepler</h2>
          <ul className="mt-3 grid gap-2">
            {requests.slice(0, 4).map((request) => (
              <li key={request.id} className="rounded-2xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10">
                <span className="font-medium">{request.businessName}</span>
                <span className="text-muted-foreground"> · {request.when} · {request.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {target ? (
        <QuoteDialog
          business={target}
          open={Boolean(target)}
          onOpenChange={(next) => {
            if (!next) setTarget(null)
          }}
          initialWhen={when}
          initialWhenDate={whenDate}
          initialNote={[
            description,
            when ? `Ne zaman: ${when}` : "",
            budget.trim() ? `Bütçe: ${budget.trim()}` : "",
          ]
            .filter(Boolean)
            .join("\n")}
        />
      ) : null}
    </div>
  )
}
