"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { recordDiscoverEvent, rememberDiscoverLead, useDiscoverSettings } from "@/lib/discover-store"
import { trackNeed } from "@/lib/need-client"
import { phoneMapsUrl, phoneRegisterPath, phoneWebUrl, type PhoneQuery } from "@/lib/phone-lookup"
import { useLocale } from "@/lib/use-locale"

export function PhoneLookupNote({
  query,
  count,
  filters,
  allowOutside,
}: {
  query: PhoneQuery
  count: number
  filters: boolean
  allowOutside: boolean
}) {
  const { t } = useLocale()
  const settings = useDiscoverSettings()
  const outside = allowOutside && settings.enabled && query.complete
  const maps = outside && settings.maps ? phoneMapsUrl(query) : ""
  const web = outside ? phoneWebUrl(query) : ""
  const register = phoneRegisterPath(query)
  const title = !query.complete ? t("phone.shortTitle") : count === 0 ? t("phone.missTitle") : count === 1 ? t("phone.hitOne") : t("phone.hitMany", { count })
  const body = !query.complete ? t("phone.shortBody") : count === 0 ? t("phone.missBody") : ""

  return (
    <section className="mb-4 rounded-3xl bg-card px-5 py-5 ring-1 ring-foreground/10">
      <h2 className="font-heading text-2xl text-balance">{title}</h2>
      {body ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p> : null}
      {filters ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("phone.filters")}</p> : null}
      {count === 0 ? (
        <>
          {outside ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("phone.privacy")}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              className="h-11 rounded-full"
              nativeButton={false}
              render={
                <Link
                  href={register}
                  onClick={() => {
                    rememberDiscoverLead()
                    recordDiscoverEvent({ type: "register_click", q: "numara", city: "" })
                    trackNeed({ kind: "register", q: "numara" })
                  }}
                />
              }
            >
              {t("discover.add")}
            </Button>
            {maps ? (
              <Button
                variant="outline"
                className="h-11 rounded-full"
                nativeButton={false}
                render={<a href={maps} target="_blank" rel="noopener noreferrer" />}
              >
                {t("phone.maps")}
              </Button>
            ) : null}
            {web ? (
              <Button
                variant="outline"
                className="h-11 rounded-full"
                nativeButton={false}
                render={<a href={web} target="_blank" rel="noopener noreferrer" />}
              >
                {t("phone.web")}
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  )
}
