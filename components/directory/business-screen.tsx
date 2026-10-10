"use client"

import Link from "next/link"
import { BadgeCheck, Clock, MapPin, Navigation } from "lucide-react"
import { useState } from "react"
import { ClaimPrompt } from "@/components/directory/claim-button"
import { Cover, SaveButton, Stars } from "@/components/directory/bits"
import {
  AboutBlock,
  AiPicks,
  GalleryStrip,
  ProfileCrumbs,
  ProfileJsonLd,
  ServiceList,
  ShortRead,
  SummaryGrid,
} from "@/components/directory/profile-view"
import { ShareButton } from "@/components/directory/share-button"
import { MessageButton } from "@/components/messages/message-button"
import { MiniMap } from "@/components/directory/mini-map"
import { QuoteDialog } from "@/components/directory/quote-dialog"
import { ContactLines } from "@/components/directory/contact-lines"
import { SocialLinks } from "@/components/directory/social-links"
import { Button } from "@/components/ui/button"
import { useGuestGate } from "@/components/auth/guest-gate"
import { useDirectory } from "@/lib/directory-context"
import { resolveProfile } from "@/lib/profile"
import { isContactFact, watchCopy } from "@/lib/guest"
import {
  bookingLabel,
  distanceKm,
  formatDistance,
  formatRating,
  formatResponse,
  priceLabel,
  priceMarks,
} from "@/lib/format"

export function BusinessScreen({ slug }: { slug: string }) {
  const { ready, place, visibleBusinesses } = useDirectory()
  const { member, allow } = useGuestGate()
  const business = visibleBusinesses.find((item) => item.slug === slug)
  const [note, setNote] = useState("")
  const [open, setOpen] = useState(false)
  const [helpful, setHelpful] = useState<Record<string, number>>({})

  if (!business) {
    if (!ready) {
      return (
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="h-72 animate-pulse rounded-3xl bg-foreground/5" />
        </div>
      )
    }
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-heading text-4xl">Bu kayıt yok</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Bağlantı eski olabilir. Aramadan yeniden bakabilirsin.
        </p>
        <Button className="mt-6 h-11 rounded-full px-5" nativeButton={false} render={<Link href="/ara" />}>
          Aramaya dön
        </Button>
      </div>
    )
  }

  const profile = resolveProfile(business)
  const km = distanceKm(place, business)
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lng}`
  const about = member ? profile.aboutBody : watchCopy(profile.aboutBody)
  const shortBody = member ? profile.shortBody : watchCopy(profile.shortBody)
  const facts = member ? business.facts : business.facts.filter((fact) => !isContactFact(fact.label, fact.value))

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-28 md:py-10 md:pb-10">
      <ProfileJsonLd business={business} profile={profile} />
      <ProfileCrumbs business={business} />
      <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl">
            <Cover
              src={business.photo}
              alt={`${business.name}, ${business.district}`}
              position={business.photoPosition}
              className="absolute inset-0 size-full"
            />
            <div className="absolute top-3 right-3 flex gap-1.5">
              <MessageButton business={business} compact />
              <ShareButton business={business} />
              <SaveButton business={business} />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-heading text-4xl leading-tight md:text-5xl">{business.name}</h1>
              <p className="mt-2 text-muted-foreground">
                {business.subcategory} · {business.district}, {business.city}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <Stars rating={business.reviewCount ? business.rating : 0} />
                <span className="font-medium">{formatRating(business)}</span>
                <span className="text-muted-foreground">
                  {business.reviewCount ? `${business.reviewCount} yorum` : "henüz yorum yok"}
                </span>
                <span className="text-muted-foreground">
                  {priceMarks(business.priceLevel)} {priceLabel(business.priceLevel)}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {business.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                <BadgeCheck className="size-3.5" /> Doğrulandı
              </span>
            ) : (
              <span className="rounded-full bg-secondary px-3 py-1 text-xs">Doğrulama bekliyor</span>
            )}
            {business.premium ? (
              <span className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">Öne çıkan</span>
            ) : null}
            <span className={business.openNow ? "rounded-full bg-emerald-700/10 px-3 py-1 text-xs text-emerald-800" : "rounded-full bg-secondary px-3 py-1 text-xs"}>
              {business.openNow ? "Şu an açık" : "Şu an kapalı"}
            </span>
            {business.source === "senin" ? (
              <span className="rounded-full bg-secondary px-3 py-1 text-xs">Senin kaydın</span>
            ) : null}
            {business.source === "google" ? (
              <span className="rounded-full bg-secondary px-3 py-1 text-xs">Google Haritalar kaydı</span>
            ) : null}
          </div>
          {business.source === "google" ? (
            <div className="mt-4 max-w-sm">
              <ClaimPrompt business={business} />
            </div>
          ) : null}

          <ShortRead
            business={business}
            profile={profile}
            body={shortBody}
            onBook={() => allow(() => { setNote(""); setOpen(true) })}
          />
          <AboutBlock profile={profile} body={about} />
          <SummaryGrid business={business} profile={profile} extra={facts} />
          <ServiceList
            profile={profile}
            onPick={(name) => allow(() => { setNote(name); setOpen(true) })}
          />
          <GalleryStrip profile={profile} />

          <section className="mt-8">
            <h2 className="font-heading text-2xl">Yorumlar</h2>
            {business.reviews.length ? (
              <ul className="mt-3 grid gap-3">
                {business.reviews.map((review) => (
                  <li key={review.id} className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{review.author}</p>
                      <span className="text-xs text-muted-foreground">{review.date}</span>
                    </div>
                    <Stars rating={review.rating} className="mt-2" />
                    <p className="mt-2 text-sm leading-6">{review.text}</p>
                    <button
                      type="button"
                      className="mt-3 text-xs text-muted-foreground"
                      onClick={() =>
                        allow(() =>
                          setHelpful((current) => ({
                            ...current,
                            [review.id]: (current[review.id] ?? review.helpful) + 1,
                          })),
                        )
                      }
                    >
                      Faydalı ({helpful[review.id] ?? review.helpful})
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Bu kayıt için yorum birikmedi.</p>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10 lg:sticky lg:top-24">
            {business.responseMinutes > 0 ? (
              <p className="flex items-center gap-2 text-sm">
                <Clock className="size-4 text-primary" />
                Ortalama dönüş {formatResponse(business.responseMinutes)}
              </p>
            ) : null}
            <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              {business.address}
              <span className="sr-only">.</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Seçili şehir merkezine {formatDistance(km)}
            </p>
            <div className="mt-4 grid gap-2">
              <Button
                type="button"
                className="h-11 rounded-xl"
                onClick={() => allow(() => { setNote(""); setOpen(true) })}
              >
                {bookingLabel(business.booking)}
              </Button>
              <MessageButton business={business} />
              <ContactLines business={business} />
              {member ? (
                <Button variant="outline" className="h-11 rounded-xl" nativeButton={false} render={<a href={maps} target="_blank" rel="noreferrer" />}>
                  <Navigation className="size-4" />
                  Yol tarifi
                </Button>
              ) : (
                <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => allow(() => undefined)}>
                  <Navigation className="size-4" />
                  Yol tarifi
                </Button>
              )}
              <ShareButton business={business} compact={false} />
              {business.googleUrl ? (
                member ? (
                  <Button variant="outline" className="h-11 rounded-xl" nativeButton={false} render={<a href={business.googleUrl} target="_blank" rel="noreferrer" />}>
                    Google Haritalar’da aç
                  </Button>
                ) : (
                  <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => allow(() => undefined)}>
                    Google Haritalar’da aç
                  </Button>
                )
              ) : null}
            </div>
            <h2 className="mt-5 font-heading text-lg">Saatler</h2>
            <ul className="mt-2 grid gap-1 text-sm">
              {business.hours.map((day) => (
                <li key={day.day} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{day.day}</span>
                  <span>{day.hours}</span>
                </li>
              ))}
            </ul>
            <SocialLinks business={business} />
          </div>
          <MiniMap label={business.district} points={[business]} className="hidden lg:block" />
        </aside>
      </div>

      <AiPicks business={business} list={visibleBusinesses} />

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-foreground/10 bg-card/95 p-3 backdrop-blur md:hidden">
        <Button type="button" className="h-11 w-full rounded-xl" onClick={() => allow(() => { setNote(""); setOpen(true) })}>
          {bookingLabel(business.booking)}
        </Button>
      </div>

      <QuoteDialog business={business} open={open} onOpenChange={setOpen} initialNote={note} />
    </div>
  )
}
