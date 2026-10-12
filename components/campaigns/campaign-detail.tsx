"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { renderSVG } from "uqr"
import { BadgeCheck, Share2 } from "lucide-react"
import { useGuestGate } from "@/components/auth/guest-gate"
import { formatDay } from "@/components/campaigns/campaign-card"
import { Cover, Stars } from "@/components/directory/bits"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { rememberCategory, trackCampaign, useCampaigns } from "@/lib/campaign-store"
import {
  campaignUrl,
  isCampaignOwner,
  isPublic,
  liveStatus,
  redeemCoupon,
  sectorLabel,
  sponsoredActive,
  todayISO,
  type Campaign,
} from "@/lib/campaigns"
import { useDirectory } from "@/lib/directory-context"
import { useLocale } from "@/lib/use-locale"

export function CampaignDetail({ slug }: { slug: string }) {
  const { campaigns, ready, actorId, savedIds, toggleSaved, saveCampaign } = useCampaigns()
  const { visibleBusinesses } = useDirectory()
  const { account } = useAuth()
  const { allow, member } = useGuestGate()
  const { locale, t } = useLocale()
  const campaign = campaigns.find((item) => item.slug === slug) ?? null
  const today = todayISO()

  const publicId = campaign && isPublic(campaign, today) ? campaign.id : ""
  const category = campaign?.category ?? ""
  useEffect(() => {
    if (!publicId) return
    trackCampaign(publicId, "detail")
    rememberCategory(category)
  }, [publicId, category])

  if (!campaign && !ready) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="h-72 animate-pulse rounded-3xl bg-foreground/5" />
      </div>
    )
  }
  if (!campaign) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-heading text-4xl">{t("campaign.missing")}</h1>
        <Link href="/kampanyalar" className="mt-4 inline-block text-sm text-primary">
          {t("campaign.title")}
        </Link>
      </div>
    )
  }

  const business = visibleBusinesses.find((item) => item.id === campaign.businessId)
  const trust = business ? { verified: business.verified, rating: business.rating, reviewCount: business.reviewCount } : null
  const live = liveStatus(campaign, today)
  const staff = account?.role === "admin" || (account ? isCampaignOwner(account.id, campaign, business?.ownerAccountId) : false)
  if (live !== "published" && !staff) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <p className="text-sm font-medium text-primary">{campaign.businessName}</p>
        <h1 className="mt-2 font-heading text-4xl text-balance">{campaign.title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{live === "expired" ? t("campaign.expired") : t("campaign.notLive")}</p>
        <Link href="/kampanyalar" className="mt-4 inline-block text-sm text-primary">
          {t("campaign.title")}
        </Link>
      </div>
    )
  }

  return (
    <DetailBody
      campaign={campaign}
      trust={trust}
      member={member}
      saved={savedIds.includes(campaign.id)}
      locale={locale}
      sponsored={sponsoredActive(campaign, today)}
      expired={live === "expired"}
      onSave={() => toggleSaved(campaign.id)}
      onRedeem={(code) => {
        const result = redeemCoupon(campaign, actorId, code, today)
        if (result.ok) saveCampaign(result.campaign)
        return result.ok ? "ok" : result.reason
      }}
      onAllow={allow}
    />
  )
}

function DetailBody({
  campaign,
  trust,
  member,
  saved,
  locale,
  sponsored,
  expired,
  onSave,
  onRedeem,
  onAllow,
}: {
  campaign: Campaign
  trust: { verified: boolean; rating: number; reviewCount: number } | null
  member: boolean
  saved: boolean
  locale: string
  sponsored: boolean
  expired: boolean
  onSave: () => void
  onRedeem: (code: string) => "ok" | "status" | "code" | "limit" | "once" | "actor"
  onAllow: (fn: () => void) => void
}) {
  const { t } = useLocale()
  const { saveSettings, settings } = useCampaigns()
  const [code, setCode] = useState(campaign.code)
  const [notice, setNotice] = useState("")
  const [copied, setCopied] = useState(false)
  const svg = useMemo(() => renderSVG(campaignUrl(campaign), { ecc: "M", border: 2, pixelSize: 3, blackColor: "#241c16", whiteColor: "#fffdf8" }), [campaign])
  const digits = campaign.whatsapp.replace(/[^\d]/g, "")
  const badge = campaign.discountPercent > 0 ? `%${campaign.discountPercent}` : campaign.advantage

  async function share() {
    const url = campaignUrl(campaign)
    const payload = { title: campaign.title, text: campaign.shortText, url }
    if (navigator.share) {
      try {
        await navigator.share(payload)
        trackCampaign(campaign.id, "share")
        return
      } catch {
        // The share sheet can be dismissed. Copy the link instead.
      }
    }
    await navigator.clipboard.writeText(url)
    trackCampaign(campaign.id, "share")
    setCopied(true)
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:py-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/kampanyalar" className="text-primary">{t("campaign.title")}</Link>
          {" · "}
          <Link href={`/kampanyalar/${campaign.category}`} className="hover:text-primary">{sectorLabel(campaign.category)}</Link>
          {" · "}
          {campaign.district}, {campaign.city}
        </p>
        <h1 className="mt-3 font-heading text-4xl leading-tight text-balance md:text-5xl">{campaign.title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{campaign.shortText}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {badge ? <span className="rounded-full bg-primary px-3 py-1 text-primary-foreground">{badge}</span> : null}
          {sponsored ? <span className="rounded-full bg-secondary px-3 py-1">{t("campaign.sponsored")}</span> : null}
          {expired ? <span className="rounded-full bg-secondary px-3 py-1">{t("campaign.expired")}</span> : null}
          {trust?.verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1">
              <BadgeCheck className="size-3.5 text-primary" />
              {t("campaign.verified")}
            </span>
          ) : null}
        </div>
        <Cover src={campaign.image} alt={campaign.title} className="mt-6 h-72 w-full rounded-3xl md:h-96" />
        <div className="mt-6 max-w-2xl text-sm leading-7">
          <p>{campaign.longText}</p>
          <h2 className="mt-6 font-heading text-2xl">{t("campaign.terms")}</h2>
          <p className="mt-2 text-muted-foreground">{campaign.terms}</p>
        </div>
      </div>
      <aside className="space-y-4">
        <div className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
          <p className="text-sm text-muted-foreground">{t("campaign.business")}</p>
          <Link href={`/isletme/${campaign.businessSlug}`} className="mt-1 block font-heading text-2xl hover:text-primary">
            {campaign.businessName}
          </Link>
          {trust && trust.rating > 0 ? (
            <p className="mt-2 flex items-center gap-2 text-sm">
              <Stars rating={trust.rating} />
              <span className="text-muted-foreground">{trust.rating.toFixed(1)} · {trust.reviewCount}</span>
            </p>
          ) : null}
          <p className="mt-3 text-sm text-muted-foreground">{campaign.address}</p>
          <p className="mt-2 text-sm">
            {t("campaign.until")} {formatDay(campaign.startDate, locale)} – {formatDay(campaign.endDate, locale)}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">{t("campaign.code")}</p>
          <p className="font-heading text-2xl tracking-wide">{campaign.code}</p>
          <div className="mt-4 grid gap-2">
            {member ? (
              <Button variant="outline" className="h-11 rounded-full" nativeButton={false} render={<a href={`tel:${campaign.phone}`} />}>
                {campaign.phone}
              </Button>
            ) : (
              <Button type="button" variant="outline" className="h-11 rounded-full" onClick={() => onAllow(() => undefined)}>
                {t("campaign.phone")}
              </Button>
            )}
            {member ? (
              <Button
                variant="outline"
                className="h-11 rounded-full"
                nativeButton={false}
                render={<a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" onClick={() => trackCampaign(campaign.id, "whatsapp")} />}
              >
                {t("campaign.whatsapp")}
              </Button>
            ) : (
              <Button type="button" variant="outline" className="h-11 rounded-full" onClick={() => onAllow(() => undefined)}>
                {t("campaign.whatsapp")}
              </Button>
            )}
            {campaign.website ? (
              member ? (
                <Button
                  variant="outline"
                  className="h-11 rounded-full"
                  nativeButton={false}
                  render={<a href={campaign.website} target="_blank" rel="noreferrer" onClick={() => trackCampaign(campaign.id, "website")} />}
                >
                  {t("campaign.website")}
                </Button>
              ) : (
                <Button type="button" variant="outline" className="h-11 rounded-full" onClick={() => onAllow(() => undefined)}>
                  {t("campaign.website")}
                </Button>
              )
            ) : null}
          </div>
        </div>
        <form
          className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10"
          onSubmit={(event) => {
            event.preventDefault()
            onAllow(() => {
              const reason = onRedeem(code)
              setNotice(reason === "ok" ? t("campaign.redeemed") : reason === "once" ? t("campaign.once") : reason === "limit" ? t("campaign.full") : reason === "code" ? t("campaign.badCode") : t("campaign.notLive"))
            })
          }}
        >
          <h2 className="font-heading text-2xl">{t("campaign.use")}</h2>
          <label className="mt-3 block text-xs text-muted-foreground" htmlFor="campaign-code">{t("campaign.code")}</label>
          <input id="campaign-code" value={code} onChange={(event) => setCode(event.target.value)} className="mt-1 h-11 w-full rounded-xl bg-background px-3 text-sm ring-1 ring-foreground/10 outline-none" />
          <Button type="submit" className="mt-3 h-11 w-full rounded-full" disabled={expired}>
            {t("campaign.use")}
          </Button>
          {notice ? <p className="mt-2 text-sm">{notice}</p> : null}
          <p className="mt-2 text-xs text-muted-foreground">{t("campaign.limitNote")}</p>
        </form>
        <div className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
          <h2 className="font-heading text-xl">{t("campaign.qr")}</h2>
          <div className="mt-3 max-w-48" role="img" aria-label={t("campaign.qr")} dangerouslySetInnerHTML={{ __html: svg }} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-11 rounded-full" onClick={onSave}>
              {saved ? t("campaign.saved") : t("campaign.save")}
            </Button>
            <Button type="button" variant="outline" className="h-11 rounded-full" onClick={() => void share()}>
              <Share2 className="size-4" />
              {copied ? t("campaign.copied") : t("campaign.share")}
            </Button>
          </div>
          <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <input
              type="checkbox"
              checked={settings.personalization}
              onChange={(event) => saveSettings({ ...settings, personalization: event.target.checked })}
            />
            {t("campaign.personal")}
          </label>
        </div>
      </aside>
    </div>
  )
}
