"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { discoverCity, discoverPath, discoverQuery, mapsSearchUrl, registerDraftPath, videoSearchUrl, webSearchUrl, type DiscoverPlace, type DiscoverReason } from "@/lib/discover"
import { recordDiscoverEvent, rememberDiscoverLead, useDiscoverSettings } from "@/lib/discover-store"
import { useLocale } from "@/lib/use-locale"

type Loaded = { ok: true; places: DiscoverPlace[] } | { ok: false; reason: DiscoverReason; places: [] }

export function DiscoverScreen() {
  const params = useSearchParams()
  const router = useRouter()
  const { locale, t } = useLocale()
  const settings = useDiscoverSettings()
  const query = discoverQuery(params.get("q") ?? "")
  const city = discoverCity(params.get("sehir") ?? "")
  const requestKey = `${query}\n${city}\n${locale}\n${settings.places}\n${settings.country}\n${settings.maxResults}`
  const [seenQuery, setSeenQuery] = useState(query)
  const [draft, setDraft] = useState(query)
  const [fetched, setFetched] = useState<{ key: string; data: Loaded } | null>(null)
  if (query !== seenQuery) {
    setSeenQuery(query)
    setDraft(query)
  }
  const maps = settings.maps ? mapsSearchUrl(query, city) : ""
  const web = webSearchUrl(query, city)
  const video = videoSearchUrl(query, city)
  const idle: Loaded | null = !query
    ? { ok: false, reason: "invalid", places: [] }
    : !settings.places
      ? { ok: false, reason: "off", places: [] }
      : null

  useEffect(() => {
    if (!query || !settings.places) return
    const controller = new AbortController()
    const search = new URLSearchParams({ q: query, dil: locale, ulke: settings.country, adet: String(settings.maxResults) })
    if (city) search.set("sehir", city)
    recordDiscoverEvent({ type: "places_request", q: query, city })
    fetch(`/api/kesif?${search.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as Loaded
        if (!data || typeof data !== "object" || !("ok" in data)) throw new Error("bad")
        setFetched({ key: requestKey, data })
        if (data.ok) recordDiscoverEvent({ type: "places_result", q: query, city, count: data.places.length })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setFetched({ key: requestKey, data: { ok: false, reason: "unavailable", places: [] } })
      })
    return () => controller.abort()
  }, [query, city, locale, settings.places, settings.country, settings.maxResults, requestKey])

  const loaded = idle ?? (fetched?.key === requestKey ? fetched.data : null)
  const reason = loaded && !loaded.ok ? loaded.reason : ""
  const places = loaded?.ok ? loaded.places : []

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm font-medium text-primary">{t("discover.pageKicker")}</p>
      <h1 className="mt-2 font-heading text-4xl leading-tight">{query || t("discover.again")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{city ? `${city} · ` : ""}{places.length ? t("discover.count", { count: places.length }) : t("discover.source")}</p>
      <form
        className="mt-5 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault()
          router.push(discoverPath(draft, city))
        }}
      >
        <Input value={draft} onChange={(event) => setDraft(event.target.value)} aria-label={t("discover.again")} className="h-11" />
        <Button type="submit" className="h-11 rounded-full">{t("discover.again")}</Button>
      </form>
      {reason === "unconfigured" ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("discover.unconfigured")}</p> : null}
      {reason === "quota" ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("discover.quota")}</p> : null}
      {reason === "off" ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("discover.off")}</p> : null}
      {reason === "unavailable" ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("discover.error")}</p> : null}
      {reason === "invalid" ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("discover.missBody")}</p> : null}
      {loaded?.ok && places.length === 0 ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("discover.empty")}</p> : null}
      <div className="mt-5 grid gap-3">
        {places.map((place) => (
          <article key={place.id} className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
            <h2 className="font-heading text-2xl">{place.name}</h2>
            {place.address ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{place.address}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {place.mapsUrl ? (
                <Button variant="outline" className="h-11 rounded-full" nativeButton={false} render={<a href={place.mapsUrl} target="_blank" rel="noopener noreferrer" onClick={() => recordDiscoverEvent({ type: "maps_click", q: query, city })} />}>
                  {t("discover.map")}
                </Button>
              ) : null}
              <Button
                variant="outline"
                className="h-11 rounded-full"
                nativeButton={false}
                render={
                  <Link
                    href={registerDraftPath(settings, place.name, place.address)}
                    onClick={() => {
                      rememberDiscoverLead()
                      recordDiscoverEvent({ type: "register_click", q: query, city })
                    }}
                  />
                }
              >
                {t("discover.add")}
              </Button>
            </div>
            <p className="mt-3 text-sm leading-6">{t("discover.lead")}</p>
          </article>
        ))}
      </div>
      {places.length ? <p className="mt-4 text-xs leading-5 text-muted-foreground">{t("discover.attribution")}</p> : null}
      <div className="mt-6 flex flex-wrap gap-2">
        {maps ? (
          <Button className="h-11 rounded-full" nativeButton={false} render={<a href={maps} target="_blank" rel="noopener noreferrer" onClick={() => recordDiscoverEvent({ type: "maps_click", q: query, city })} />}>
            {t("discover.allMaps")}
          </Button>
        ) : null}
        {web ? (
          <Button variant="outline" className="h-11 rounded-full" nativeButton={false} render={<a href={web} target="_blank" rel="noopener noreferrer" onClick={() => recordDiscoverEvent({ type: "web_click", q: query, city })} />}>
            {t("discover.web")}
          </Button>
        ) : null}
        {video ? (
          <Button variant="outline" className="h-11 rounded-full" nativeButton={false} render={<a href={video} target="_blank" rel="noopener noreferrer" onClick={() => recordDiscoverEvent({ type: "video_click", q: query, city })} />}>
            {t("discover.video")}
          </Button>
        ) : null}
        <Button variant="outline" className="h-11 rounded-full" nativeButton={false} render={<Link href="/ara" />}>
          {t("nav.search")}
        </Button>
      </div>
    </div>
  )
}
