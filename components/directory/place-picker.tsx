"use client"

import { MapPin, Navigation } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { countryCodes } from "@/lib/countries"
import { useDirectory } from "@/lib/directory-context"
import { googleEmbedUrl, googlePlaceLink } from "@/lib/google-map"
import { placeLabel, type AreaOption, type Place } from "@/lib/place"
import { cn } from "cn"

type Slot = "region" | "province" | "district" | "neighborhood"

const slots: { id: Slot; label: string }[] = [
  { id: "region", label: "Bölge" },
  { id: "province", label: "İl" },
  { id: "district", label: "İlçe" },
  { id: "neighborhood", label: "Semt" },
]

const emptyOptions: Record<Slot, AreaOption[]> = {
  region: [],
  province: [],
  district: [],
  neighborhood: [],
}

function countryName(code: string) {
  try {
    return new Intl.DisplayNames(["tr"], { type: "region" }).of(code) || code
  } catch {
    return code
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string }
  if (!response.ok) throw new Error(body.error || "Konum alınamadı.")
  return body
}

export function PlaceButton({
  className,
  compact = false,
  wide = false,
}: {
  className?: string
  compact?: boolean
  wide?: boolean
}) {
  const { place, setPlace } = useDirectory()
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        type="button"
        className={cn(
          "inline-flex min-w-0 items-center gap-1.5 rounded-2xl bg-secondary px-3 text-sm text-secondary-foreground",
          compact ? "h-9 max-w-36" : wide ? "h-12 w-full max-w-none justify-start" : "h-12 max-w-full sm:max-w-44",
          className,
        )}
      >
        <MapPin className="size-4 shrink-0" />
        <span className="truncate">{placeLabel(place)}</span>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">Konum</DialogTitle>
        </DialogHeader>
        {open ? <PlaceEditor current={place} onUse={(next) => { setPlace(next); setOpen(false) }} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function labeled(place: Place): Place {
  if (place.nearMe) return { ...place, label: "Yakınımdakiler" }
  const parts = [place.neighborhood, place.district, place.province, place.region, place.country].filter(Boolean)
  return { ...place, label: parts.slice(0, 2).join(", ") || place.country || "Konum" }
}

export function PlaceEditor({
  current,
  onUse,
  onChange,
  embedded = false,
  point,
}: {
  current: Place
  onUse?: (place: Place) => void
  onChange?: (place: Place) => void
  embedded?: boolean
  point?: { lat: number; lng: number } | null
}) {
  const countries = useMemo(
    () => countryCodes.map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name, "tr")),
    [],
  )
  const [draft, setDraft] = useState<Place>(current)
  const [options, setOptions] = useState(emptyOptions)
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<Place[]>([])
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const generation = useRef(0)

  function commitDraft(next: Place) {
    const located = labeled(next)
    setDraft(located)
    onChange?.(located)
    return located
  }

  async function loadLevel(level: Slot, place: Place, token: number) {
    setStatus("Sınırlar yükleniyor")
    setError("")
    const params = new URLSearchParams({
      level,
      country: place.countryCode.toLowerCase(),
      countryName: place.country,
      region: place.region,
      province: place.province,
      district: place.district,
      lat: String(place.lat || ""),
      lng: String(place.lng || ""),
    })
    const body = await readJson<{ slot: Slot; options: AreaOption[]; center?: { lat: number; lng: number } }>(
      await fetch(`/api/yer?${params}`),
    )
    if (generation.current !== token) return
    setOptions((currentOptions) => {
      const next = { ...currentOptions, [body.slot]: body.options }
      const order: Slot[] = ["region", "province", "district", "neighborhood"]
      for (const slot of order.slice(order.indexOf(body.slot) + 1)) next[slot] = []
      return next
    })
    if (body.center && Number.isFinite(body.center.lat) && Number.isFinite(body.center.lng)) {
      const next = labeled({ ...place, lat: body.center.lat, lng: body.center.lng })
      setDraft(next)
      onChange?.(next)
    }
    setStatus(body.options.length ? "" : "Bu düzeyde alt sınır yok.")
  }

  useEffect(() => {
    if (!current.countryCode) return
    const token = ++generation.current
    let cancel = false
    async function boot() {
      try {
        await loadLevel("region", current, token)
        if (cancel || generation.current !== token || !current.region) return
        await loadLevel("province", current, token)
        if (cancel || generation.current !== token || !current.province) return
        await loadLevel("district", current, token)
        if (cancel || generation.current !== token || !current.district) return
        await loadLevel("neighborhood", current, token)
      } catch {
        if (!cancel && generation.current === token) setError("Bölge listesi alınamadı. Arama kutusundan da seçebilirsin.")
      }
    }
    void boot()
    return () => {
      cancel = true
      generation.current += 1
    }
    // The editor remounts when the dialog opens. Live edits go through the selects, not this boot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function chooseCountry(code: string) {
    const token = ++generation.current
    const name = countryName(code)
    const next = commitDraft({
      ...draft,
      country: name,
      countryCode: code.toLowerCase(),
      region: "",
      province: "",
      district: "",
      neighborhood: "",
      nearMe: false,
    })
    setOptions(emptyOptions)
    setHits([])
    setStatus("Ülke haritada açılıyor")
    setError("")
    try {
      const places = await readJson<Place[]>(await fetch(`/api/yer?q=${encodeURIComponent(name)}&country=${code}`))
      const found = places.find((item) => item.countryCode.toLowerCase() === code.toLowerCase()) ?? places[0]
      const located = found ? commitDraft({ ...next, lat: found.lat, lng: found.lng, country: name, countryCode: code.toLowerCase() }) : next
      await loadLevel("region", located, token)
    } catch (caught) {
      setStatus("")
      setError(caught instanceof Error ? caught.message : "Ülke açılamadı.")
    }
  }

  async function chooseArea(slot: Slot, name: string) {
    const token = ++generation.current
    const order: Slot[] = ["region", "province", "district", "neighborhood"]
    const index = order.indexOf(slot)
    if (!name) {
      const cleared = { ...draft, nearMe: false, [slot]: "" }
      for (const finer of order.slice(index + 1)) cleared[finer] = ""
      commitDraft(cleared)
      setOptions((currentOptions) => {
        const next = { ...currentOptions }
        for (const finer of order.slice(index + 1)) next[finer] = []
        return next
      })
      return
    }
    const option = (options[slot] ?? []).find((item) => item.name === name)
    const next = { ...draft, nearMe: false, [slot]: name }
    const hasPoint = Boolean(option?.lat && option?.lng)
    if (hasPoint && option) {
      next.lat = option.lat
      next.lng = option.lng
    }
    for (const finer of order.slice(index + 1)) next[finer] = ""
    const located = commitDraft(next)
    setOptions((currentOptions) => {
      const cleared = { ...currentOptions }
      for (const finer of order.slice(index + 1)) cleared[finer] = []
      return cleared
    })
    const child = order[index + 1]
    if (!child) {
      setStatus("")
      return
    }
    try {
      const queried = hasPoint ? located : { ...located, lat: 0, lng: 0 }
      await loadLevel(child, queried, token)
    } catch (caught) {
      setStatus("")
      setError(caught instanceof Error ? caught.message : "Sınırlar yüklenemedi.")
    }
  }

  async function searchPlaces() {
    const text = query.trim()
    if (text.length < 2) return
    setStatus("Google haritası için konum aranıyor")
    setError("")
    try {
      const places = await readJson<Place[]>(await fetch(`/api/yer?q=${encodeURIComponent(text)}`))
      setHits(places)
      setStatus(places.length ? "" : "Bu ada yakın kayıt yok.")
    } catch (caught) {
      setStatus("")
      setError(caught instanceof Error ? caught.message : "Arama başarısız.")
    }
  }

  async function nearMe() {
    setError("")
    if (!navigator.geolocation) {
      setError("Bu tarayıcı konumu açamıyor.")
      return
    }
    setStatus("Konumun alınıyor")
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const place = await readJson<Place>(
            await fetch(`/api/yer?lat=${position.coords.latitude}&lng=${position.coords.longitude}`),
          )
          const located = commitDraft({ ...place, nearMe: true })
          setHits([])
          setStatus("")
          const token = ++generation.current
          if (located.countryCode) await loadLevel("region", located, token)
          if (generation.current === token && located.region) await loadLevel("province", located, token)
          if (generation.current === token && located.province) await loadLevel("district", located, token)
        } catch (caught) {
          setStatus("")
          setError(caught instanceof Error ? caught.message : "Yakın çevre çözülemedi.")
        }
      },
      () => {
        setStatus("")
        setError("Yakınımdakiler için tarayıcıdan konum izni vermen gerekir.")
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }

  async function applyHit(place: Place) {
    const next = commitDraft({ ...place, nearMe: false })
    setHits([])
    const token = ++generation.current
    try {
      if (next.countryCode) await loadLevel("region", next, token)
      if (generation.current === token && next.region) await loadLevel("province", next, token)
      if (generation.current === token && next.province) await loadLevel("district", next, token)
      if (generation.current === token && next.district) await loadLevel("neighborhood", next, token)
    } catch (caught) {
      if (generation.current === token) setError(caught instanceof Error ? caught.message : "Konum açılamadı.")
    }
  }

  return (
    <div className="grid gap-3">
      {embedded ? null : (
        <p className="text-sm leading-6 text-muted-foreground">
          Ülke, bölge, il, ilçe ve semt birbirine bağlıdır. Seçtiğin nokta Google Haritalar üzerinde durur.
        </p>
      )}
      <Button type="button" variant={draft.nearMe ? "default" : "outline"} className="h-11 rounded-xl" onClick={nearMe}>
        <Navigation className="size-4" />
        Yakınımdakiler
      </Button>
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Paris, Kadıköy, Moda…"
          className="h-11"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              void searchPlaces()
            }
          }}
        />
        <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => void searchPlaces()}>
          Bul
        </Button>
      </div>
      {hits.length ? (
        <ul className="grid gap-1">
          {hits.map((hit) => (
            <li key={`${hit.lat}-${hit.lng}-${hit.label}`}>
              <button
                type="button"
                className="w-full rounded-xl px-3 py-2 text-left text-sm ring-1 ring-foreground/10"
                onClick={() => applyHit(hit)}
              >
                {[hit.neighborhood, hit.district, hit.province, hit.region, hit.country].filter(Boolean).join(", ")}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <label className="grid gap-1.5 text-sm">
        Ülke
        <select
          className="h-11 rounded-xl bg-card px-3 ring-1 ring-foreground/10 outline-none"
          value={draft.countryCode.toUpperCase()}
          onChange={(event) => chooseCountry(event.target.value)}
        >
          <option value="">Ülke seç</option>
          {countries.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {slots.map((slot) => {
        const names = (options[slot.id] ?? []).map((item) => item.name)
        const selected = draft[slot.id]
        const values = selected && !names.includes(selected) ? [selected, ...names] : names
        const parentReady =
          slot.id === "region"
            ? Boolean(draft.countryCode)
            : Boolean(draft[slots[slots.findIndex((item) => item.id === slot.id) - 1].id])
        return (
          <label key={slot.id} className="grid gap-1.5 text-sm">
            {slot.label}
            <select
              className="h-11 rounded-xl bg-card px-3 ring-1 ring-foreground/10 outline-none disabled:opacity-50"
              value={selected}
              disabled={!parentReady}
              onChange={(event) => chooseArea(slot.id, event.target.value)}
            >
              <option value="">{values.length ? `${slot.label} seç` : "Üst sınırı seç"}</option>
              {values.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )
      })}
      <div className="overflow-hidden rounded-2xl ring-1 ring-foreground/10">
        <iframe
          title="Seçilen konumun Google haritası"
          src={googleEmbedUrl(
            point?.lat ?? draft.lat,
            point?.lng ?? draft.lng,
            point ? 16 : draft.neighborhood ? 15 : draft.district ? 13 : draft.province ? 11 : draft.region ? 8 : 6,
          )}
          className="h-48 w-full border-0"
        />
      </div>
      <a
        href={googlePlaceLink(point?.lat ?? draft.lat, point?.lng ?? draft.lng, point ? 16 : 14)}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-primary"
      >
        Google Haritalar’da aç
      </a>
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {embedded || !onUse ? null : (
        <Button type="button" className="h-11 rounded-xl" onClick={() => onUse(draft)}>
          Bu konumu kullan
        </Button>
      )}
    </div>
  )
}
