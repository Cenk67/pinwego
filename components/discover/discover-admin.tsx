"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { defaultDiscoverSettings, normalizeSettings, type DiscoverEvent } from "@/lib/discover"
import { saveDiscoverSettings, useDiscoverEvents, useDiscoverSettings } from "@/lib/discover-store"
import { useAuth } from "@/lib/auth-context"

function count(events: DiscoverEvent[], type: DiscoverEvent["type"]) {
  return events.filter((event) => event.type === type).length
}

export function DiscoverAdmin() {
  const { account } = useAuth()
  const settings = useDiscoverSettings()
  const events = useDiscoverEvents()
  const [country, setCountry] = useState(settings.country)
  const [thin, setThin] = useState(String(settings.thin))
  const [maxResults, setMaxResults] = useState(String(settings.maxResults))
  const [registerPath, setRegisterPath] = useState(settings.registerPath)
  if (!account || account.role !== "admin") return null
  const requests = count(events, "places_request")
  const results = events.filter((event) => event.type === "places_result").reduce((sum, event) => sum + (event.count ?? 0), 0)
  return (
    <div className="mt-8 grid gap-4">
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
        Google anahtarı bu panelde görünmez ve repoya yazılmaz. Anahtar yokken Haritalar bağlantısı çalışır. Places listesi sunucu anahtarı ister. Bu sayaçlar bu tarayıcıdadır.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Sonuçsuz Pinwego araması", count(events, "pinwego_miss")],
          ["Places isteği", requests],
          ["Places sonucu", results],
          ["Haritalar tıklaması", count(events, "maps_click")],
          ["Web araması", count(events, "web_click")],
          ["Video araması", count(events, "video_click")],
          ["Kayıt sayfası", count(events, "register_click")],
          ["Kayıt oluştu", count(events, "register_done")],
        ].map(([label, value]) => (
          <article key={String(label)} className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-2 font-heading text-2xl">{value}</p>
          </article>
        ))}
      </div>
      <form
        className="grid gap-3 rounded-3xl bg-card p-5 ring-1 ring-foreground/10"
        onSubmit={(event) => {
          event.preventDefault()
          saveDiscoverSettings(normalizeSettings({ ...settings, country, thin: Number(thin), maxResults: Number(maxResults), registerPath }))
        }}
      >
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.enabled} onChange={(event) => saveDiscoverSettings({ ...settings, enabled: event.target.checked })} />
          Keşif alanını göster
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.places} onChange={(event) => saveDiscoverSettings({ ...settings, places: event.target.checked })} />
          Pinwego içinde Places listesini dene
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.maps} onChange={(event) => saveDiscoverSettings({ ...settings, maps: event.target.checked })} />
          Google Haritalar bağlantısını göster
        </label>
        <label className="grid gap-1 text-sm">
          Ülke kodu
          <Input value={country} onChange={(event) => setCountry(event.target.value)} className="h-11 max-w-32" />
        </label>
        <label className="grid gap-1 text-sm">
          Az sonuç eşiği
          <Input value={thin} onChange={(event) => setThin(event.target.value)} className="h-11 max-w-32" inputMode="numeric" />
        </label>
        <label className="grid gap-1 text-sm">
          Bir aramada en fazla sonuç
          <Input value={maxResults} onChange={(event) => setMaxResults(event.target.value)} className="h-11 max-w-32" inputMode="numeric" />
        </label>
        <label className="grid gap-1 text-sm">
          Kayıt sayfası
          <Input value={registerPath} onChange={(event) => setRegisterPath(event.target.value)} className="h-11 max-w-sm" />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="h-11 rounded-full">Ayarları kaydet</Button>
          <Button type="button" variant="outline" className="h-11 rounded-full" onClick={() => { saveDiscoverSettings(defaultDiscoverSettings); setCountry("TR"); setThin("3"); setMaxResults("8"); setRegisterPath("/listele") }}>
            Varsayılan
          </Button>
        </div>
      </form>
      {events.length === 0 ? <p className="text-sm text-muted-foreground">Bu tarayıcıda henüz keşif olayı yok.</p> : null}
    </div>
  )
}
