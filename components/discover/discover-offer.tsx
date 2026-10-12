"use client"

import Link from "next/link"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { discoverPath, mapsSearchUrl } from "@/lib/discover"
import { recordDiscoverEvent, rememberDiscoverLead, useDiscoverSettings } from "@/lib/discover-store"
import { useLocale } from "@/lib/use-locale"

export function DiscoverOffer({ query, city, count }: { query: string; city: string; count: number }) {
  const { t } = useLocale()
  const settings = useDiscoverSettings()
  const maps = settings.maps ? mapsSearchUrl(query, city) : ""
  const discover = discoverPath(query, city)
  const register = `${settings.registerPath.startsWith("/") ? settings.registerPath : "/listele"}`

  useEffect(() => {
    if (count !== 0) return
    recordDiscoverEvent({ type: "pinwego_miss", q: query, city, count })
  }, [query, city, count])

  return (
    <section className="my-4 rounded-3xl bg-card px-5 py-5 ring-1 ring-foreground/10">
      <h2 className="font-heading text-2xl">{count === 0 ? t("discover.missTitle") : t("discover.thinTitle")}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{count === 0 ? t("discover.missBody") : t("discover.thinBody")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {maps ? (
          <Button
            className="h-11 rounded-full"
            nativeButton={false}
            render={<a href={maps} target="_blank" rel="noopener noreferrer" onClick={() => recordDiscoverEvent({ type: "maps_click", q: query, city })} />}
          >
            {t("discover.maps")}
          </Button>
        ) : null}
        {settings.places ? (
          <Button variant="outline" className="h-11 rounded-full" nativeButton={false} render={<Link href={discover} />}>
            {t("discover.more")}
          </Button>
        ) : null}
        <Button
          variant="outline"
          className="h-11 rounded-full"
          nativeButton={false}
          render={<Link href={register} onClick={() => { rememberDiscoverLead(); recordDiscoverEvent({ type: "register_click", q: query, city }) }} />}
        >
          {t("discover.add")}
        </Button>
      </div>
    </section>
  )
}
