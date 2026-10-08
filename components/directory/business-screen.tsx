"use client"

import Link from "next/link"
import { BadgeCheck, Clock, MapPin, Navigation, Phone } from "lucide-react"
import { useMemo, useState } from "react"
import { BusinessCard } from "@/components/directory/business-card"
import { ClaimPrompt } from "@/components/directory/claim-button"
import { Cover, SaveButton, Stars } from "@/components/directory/bits"
import { ShareButton } from "@/components/directory/share-button"
import { MessageButton } from "@/components/messages/message-button"
import { MiniMap } from "@/components/directory/mini-map"
import { QuoteDialog } from "@/components/directory/quote-dialog"
import { Button } from "@/components/ui/button"
import { categoryById, cityCenter } from "@/lib/catalog"
import { useDirectory } from "@/lib/directory-context"
import {
  bookingLabel,
  distanceKm,
  formatDistance,
  formatRating,
  formatResponse,
  formatTry,
  priceLabel,
  priceMarks,
} from "@/lib/format"
import { aiBrief } from "@/lib/match"

export function BusinessScreen({ slug }: { slug: string }) {
  const { ready, place, visibleBusinesses } = useDirectory()
  const business = visibleBusinesses.find((item) => item.slug === slug)
  const [note, setNote] = useState("")
  const [open, setOpen] = useState(false)
  const [helpful, setHelpful] = useState<Record<string, number>>({})

  const similar = useMemo(() => {
    if (!business) return []
    const origin = cityCenter(business.city)
    return visibleBusinesses
      .filter((item) => item.category === business.category && item.id !== business.id)
      .map((item) => ({ business: item, km: distanceKm(origin, item) }))
      .sort((a, b) => Number(b.business.city === business.city) - Number(a.business.city === business.city) || a.km - b.km)
      .slice(0, 3)
  }, [business, visibleBusinesses])

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

  const category = categoryById(business.category)
  const km = distanceKm(place, business)
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lng}`

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-28 md:py-10 md:pb-10">
      <p className="text-sm text-muted-foreground">
        <Link href={`/ara?kategori=${business.category}&sehir=${encodeURIComponent(business.city)}`} className="hover:text-primary">
          {category.label}
        </Link>
        {" · "}
        {business.city}
      </p>
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

          <section className="mt-6 rounded-3xl bg-primary/10 p-5">
            <p className="text-xs font-medium tracking-wide text-primary uppercase">Kısa okuma</p>
            <p className="mt-2 text-sm leading-7">{aiBrief(business)}</p>
          </section>

          <section className="mt-8">
            <h2 className="font-heading text-2xl">Hakkında</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{business.about}</p>
            {business.founded > 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Kuruluş {business.founded}</p>
            ) : null}
          </section>

          <section className="mt-8">
            <h2 className="font-heading text-2xl">Hizmet ve fiyat</h2>
            <ul className="mt-3 divide-y divide-foreground/10 rounded-3xl bg-card ring-1 ring-foreground/10">
              {business.services.length ? (
                business.services.map((service) => (
                  <li key={service.name} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-xs text-muted-foreground">{service.unit}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm">{service.price > 0 ? formatTry(service.price) : "Sorunuz"}</span>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 rounded-full"
                        onClick={() => {
                          setNote(service.name)
                          setOpen(true)
                        }}
                      >
                        Seç
                      </Button>
                    </div>
                  </li>
                ))
              ) : (
                <li className="px-4 py-4 text-sm text-muted-foreground">
                  Hizmet listesi henüz yok. Talebi notla iletebilirsin.
                </li>
              )}
            </ul>
          </section>

          {business.facts.length ? (
            <section className="mt-8">
              <h2 className="font-heading text-2xl">Firma özeti</h2>
              <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                {business.facts.map((fact) => (
                  <div key={fact.label} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
                    <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                    <dd className="mt-1 text-sm font-medium">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section className="mt-8">
            <h2 className="font-heading text-2xl">İmkanlar</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {business.amenities.map((item) => (
                <li key={item} className="rounded-full bg-secondary px-3 py-1 text-sm">
                  {item}
                </li>
              ))}
            </ul>
          </section>

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
                        setHelpful((current) => ({
                          ...current,
                          [review.id]: (current[review.id] ?? review.helpful) + 1,
                        }))
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
              <Button type="button" className="h-11 rounded-xl" onClick={() => { setNote(""); setOpen(true) }}>
                {bookingLabel(business.booking)}
              </Button>
              <MessageButton business={business} />
              {business.phone ? (
                <Button variant="outline" className="h-11 rounded-xl" nativeButton={false} render={<a href={`tel:${business.phone.replace(/\s/g, "")}`} />}>
                  <Phone className="size-4" />
                  {business.phone}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Telefon kaydı yok.</p>
              )}
              <Button variant="outline" className="h-11 rounded-xl" nativeButton={false} render={<a href={maps} target="_blank" rel="noreferrer" />}>
                <Navigation className="size-4" />
                Yol tarifi
              </Button>
              <ShareButton business={business} compact={false} />
              {business.googleUrl ? (
                <Button variant="outline" className="h-11 rounded-xl" nativeButton={false} render={<a href={business.googleUrl} target="_blank" rel="noreferrer" />}>
                  Google Haritalar’da aç
                </Button>
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
          </div>
          <MiniMap label={business.district} points={[business]} className="hidden lg:block" />
        </aside>
      </div>

      {similar.length ? (
        <section className="mt-12">
          <h2 className="font-heading text-3xl">Benzer kayıtlar</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {similar.map((item) => (
              <BusinessCard key={item.business.id} business={item.business} distanceKm={item.km} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-foreground/10 bg-background/95 p-3 backdrop-blur md:hidden">
        <Button type="button" className="h-11 w-full rounded-xl" onClick={() => { setNote(""); setOpen(true) }}>
          {bookingLabel(business.booking)}
        </Button>
      </div>

      <QuoteDialog business={business} open={open} onOpenChange={setOpen} initialNote={note} />
    </div>
  )
}
