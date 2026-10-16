"use client"

import Link from "next/link"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { discoverPath, mapsSearchUrl, videoSearchUrl, webSearchUrl } from "@/lib/discover"
import { recordDiscoverEvent, rememberDiscoverLead, useDiscoverSettings } from "@/lib/discover-store"
import { trackNeed } from "@/lib/need-client"
import { useLocale } from "@/lib/use-locale"

export function DiscoverOffer({
  query,
  city,
  count,
  guides = false,
}: {
  query: string
  city: string
  count: number
  guides?: boolean
}) {
  const { t } = useLocale()
  const settings = useDiscoverSettings()
  const maps = settings.maps ? mapsSearchUrl(query, city) : ""
  const web = webSearchUrl(query, city)
  const video = videoSearchUrl(query, city)
  const discover = discoverPath(query, city)
  const register = `${settings.registerPath.startsWith("/") ? settings.registerPath : "/listele"}`
  const title = guides ? t("discover.guideTitle") : count === 0 ? t("discover.missTitle") : t("discover.thinTitle")
  const body = guides ? t("discover.guideBody") : count === 0 ? t("discover.missBody") : t("discover.thinBody")

  useEffect(() => {
    if (count !== 0) return
    recordDiscoverEvent({ type: "pinwego_miss", q: query, city, count })
  }, [query, city, count])
  const outside = (target: "maps" | "web" | "video" | "places" | "register") => {
    if (target === "register") trackNeed({ kind: "register", q: query, city })
    else trackNeed({ kind: "external", q: query, city, target })
  }

  return (
    <section className="my-4 rounded-3xl bg-card px-5 py-5 ring-1 ring-foreground/10">
      <h2 className="font-heading text-2xl">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t("need.externalHint")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {maps ? (
          <Button
            className="h-11 rounded-full"
            nativeButton={false}
            render={<a href={maps} target="_blank" rel="noopener noreferrer" onClick={() => { recordDiscoverEvent({ type: "maps_click", q: query, city }); outside("maps") }} />}
          >
            {t("discover.maps")}
          </Button>
        ) : null}
        {web ? (
          <Button
            variant="outline"
            className="h-11 rounded-full"
            nativeButton={false}
            render={<a href={web} target="_blank" rel="noopener noreferrer" onClick={() => { recordDiscoverEvent({ type: "web_click", q: query, city }); outside("web") }} />}
          >
            {t("discover.web")}
          </Button>
        ) : null}
        {video ? (
          <Button
            variant="outline"
            className="h-11 rounded-full"
            nativeButton={false}
            render={<a href={video} target="_blank" rel="noopener noreferrer" onClick={() => { recordDiscoverEvent({ type: "video_click", q: query, city }); outside("video") }} />}
          >
            {t("discover.video")}
          </Button>
        ) : null}
        {settings.places ? (
          <Button variant="outline" className="h-11 rounded-full" nativeButton={false} render={<Link href={discover} onClick={() => outside("places")} />}>
            {t("discover.more")}
          </Button>
        ) : null}
        <Button
          variant="outline"
          className="h-11 rounded-full"
          nativeButton={false}
          render={<Link href={register} onClick={() => { rememberDiscoverLead(); recordDiscoverEvent({ type: "register_click", q: query, city }); outside("register") }} />}
        >
          {t("discover.add")}
        </Button>
      </div>
    </section>
  )
}
