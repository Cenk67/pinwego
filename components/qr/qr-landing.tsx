"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { BadgeCheck, MapPin } from "lucide-react"
import { QrMark } from "@/components/qr/qr-mark"
import { Cover } from "@/components/directory/bits"
import { Button } from "@/components/ui/button"
import { withReturn } from "@/lib/auth-session"
import { useAuth } from "@/lib/auth-context"
import { campaignPath } from "@/lib/campaigns"
import { categoryById } from "@/lib/catalog"
import { sectorCopy } from "@/lib/sector-copy"
import { recordQrEvent, rememberQrReturn } from "@/lib/qr-store"
import { posterPath, profileUrl, qrUrl, vcardPath, type QrHit } from "@/lib/qr"
import { useLocale } from "@/lib/use-locale"
import type { Business } from "@/lib/types"

export type QrCardBusiness = Pick<
  Business,
  "id" | "slug" | "name" | "category" | "summary" | "phone" | "address" | "city" | "district" | "website" | "photo" | "openNow" | "lat" | "lng" | "verified"
>

export function QrLanding({
  hit,
  business,
  campaign,
}: {
  hit: QrHit
  business: QrCardBusiness
  campaign?: { id: string; slug: string; title: string; advantage: string; live: boolean } | null
}) {
  const { locale, t } = useLocale()
  const { account } = useAuth()
  const [saved, setSaved] = useState(false)
  const sector = sectorCopy(locale, categoryById(business.category))
  const profile = `/isletme/${business.slug}?kart=${hit.code}`
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lng}`
  const offerLive = Boolean(campaign?.live)

  useEffect(() => {
    const base = { code: hit.code, businessId: business.id, kind: hit.kind, campaignId: hit.campaignId }
    recordQrEvent({ ...base, type: "qr_scan" })
    recordQrEvent({ ...base, type: "qr_landing_view" })
    if (hit.kind === "campaign") recordQrEvent({ ...base, type: "campaign_view" })
  }, [hit.code, hit.kind, hit.campaignId, business.id])

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <p className="text-sm font-medium text-primary">{t("qr.kicker")}</p>
      <article className="mt-3 overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10">
        <Cover src={business.photo} alt="" className="h-52 w-full" />
        <div className="p-5">
          <p className="text-xs text-muted-foreground">{sector.label}</p>
          <h1 className="mt-1 font-heading text-4xl leading-tight">{business.name}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm">
            <span className={business.openNow ? "text-emerald-800" : "text-muted-foreground"}>{business.openNow ? t("qr.open") : t("qr.closed")}</span>
            {business.verified ? <BadgeCheck className="size-4 text-primary" aria-label={t("campaign.verified")} /> : null}
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{business.summary}</p>
          <p className="mt-4 flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <span className="block text-xs text-muted-foreground">{t("qr.address")}</span>
              {business.address}
            </span>
          </p>
          <p className="mt-2 text-sm">{business.district}, {business.city}</p>
          {business.phone ? (
            <p className="mt-3">
              <span className="block text-xs text-muted-foreground">{t("qr.phone")}</span>
              <span className="text-lg font-medium">{business.phone}</span>
            </p>
          ) : null}
          {business.website ? (
            <a className="mt-1 block text-sm text-primary" href={business.website} target="_blank" rel="noreferrer">
              {t("qr.website")}
            </a>
          ) : null}
          {hit.kind === "campaign" && campaign ? (
            <div className="mt-4 rounded-2xl bg-secondary px-3 py-3">
              <p className="text-xs text-muted-foreground">{t("qr.campaign")}</p>
              <p className="font-heading text-2xl">{offerLive ? campaign.title : t("qr.expiredOffer")}</p>
              {offerLive ? <p className="mt-1 text-sm">{campaign.advantage}</p> : null}
            </div>
          ) : null}
          <div className="mt-5 grid gap-2">
            <Button
              className="h-12 rounded-full text-base"
              nativeButton={false}
              render={
                <a
                  href={vcardPath(hit.code)}
                  onClick={() => {
                    setSaved(true)
                    recordQrEvent({ code: hit.code, businessId: business.id, kind: hit.kind, type: "vcard_click", campaignId: hit.campaignId })
                    recordQrEvent({ code: hit.code, businessId: business.id, kind: hit.kind, type: "vcard_download", campaignId: hit.campaignId })
                  }}
                />
              }
            >
              {t("qr.save")}
            </Button>
            {account ? (
              <Button variant="outline" className="h-12 rounded-full" nativeButton={false} render={<Link href={profile} />}>
                {t("qr.more")}
              </Button>
            ) : (
              <Button variant="outline" className="h-12 rounded-full" nativeButton={false} render={<Link href={withReturn("/hesap?kayit=musteri", profile)} onClick={() => { rememberQrReturn(hit.code); recordQrEvent({ code: hit.code, businessId: business.id, kind: hit.kind, type: "register_click", campaignId: hit.campaignId }) }} />}>
                {t("qr.more")}
              </Button>
            )}
            <a className="text-center text-sm text-primary" href={maps} target="_blank" rel="noreferrer">
              {t("qr.maps")}
            </a>
          </div>
          {saved ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("qr.downloaded")}</p> : null}
          {account ? null : (
            <div className="mt-5 rounded-2xl bg-secondary px-3 py-3">
              <p className="text-sm leading-6">{t("qr.registerLead")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button className="h-11 rounded-full" nativeButton={false} render={<Link href={withReturn("/hesap?kayit=musteri", profile)} onClick={() => { rememberQrReturn(hit.code); recordQrEvent({ code: hit.code, businessId: business.id, kind: hit.kind, type: "register_click", campaignId: hit.campaignId }) }} />}>
                  {t("qr.register")}
                </Button>
                <Button variant="outline" className="h-11 rounded-full" nativeButton={false} render={<Link href={withReturn("/hesap?kayit=giris&kapi=musteri", profile)} onClick={() => { rememberQrReturn(hit.code); recordQrEvent({ code: hit.code, businessId: business.id, kind: hit.kind, type: "login_click", campaignId: hit.campaignId }) }} />}>
                  {t("qr.login")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </article>
      {offerLive && campaign ? (
        <Link
          href={campaignPath({ city: business.city, category: business.category, slug: campaign.slug })}
          className="mt-3 block text-center text-sm text-primary"
          onClick={() => recordQrEvent({ code: hit.code, businessId: business.id, kind: hit.kind, type: "campaign_use", campaignId: campaign.id })}
        >
          {t("campaign.see")}
        </Link>
      ) : null}
      <p className="mt-4 text-center text-xs text-muted-foreground">{profileUrl(business.slug).replace("https://", "")}</p>
      <div className="mt-4 hidden justify-center md:flex">
        <QrMark text={qrUrl(hit.code)} label={business.name} />
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        <Link href={posterPath(hit.code)}>{t("qr.poster")}</Link>
      </p>
    </div>
  )
}

export function QrMissing() {
  const { t } = useLocale()
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <p className="text-sm font-medium text-primary">{t("qr.kicker")}</p>
      <h1 className="mt-2 font-heading text-4xl">{t("qr.missing")}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("qr.missingLead")}</p>
      <Button className="mt-6 h-11 rounded-full" nativeButton={false} render={<Link href="/kampanyalar" />}>
        {t("campaign.title")}
      </Button>
    </div>
  )
}
