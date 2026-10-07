"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  BadgeCheck,
  Bookmark,
  Building2,
  CalendarClock,
  Clock,
  Globe,
  Heart,
  MapPin,
  Phone,
  Share2,
} from "lucide-react"
import { BusinessCard } from "@/components/business-card"
import { DirectionsLink, OsmEmbed } from "@/components/map-panel"
import { OpenNow } from "@/components/open-now"
import { RatingStars } from "@/components/rating-stars"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BUSINESSES } from "@/lib/businesses"
import { WEEKDAY_LABELS, WEEKDAYS } from "@/lib/categories"
import { mergeCatalog } from "@/lib/catalog"
import { formatRating, priceLabel } from "@/lib/search"
import { listSaved, listUserBusinesses, toggleSaved } from "@/lib/storage"
import type { Business } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useBrowserValue } from "@/lib/use-browser"

export function BusinessProfile({ slug }: { slug: string }) {
  const extra = useBrowserValue(listUserBusinesses, [] as Business[])
  const savedSlugs = useBrowserValue(listSaved, [] as string[])
  const [savedOverride, setSavedOverride] = useState<boolean | null>(null)
  const [photo, setPhoto] = useState(0)
  const savedNow = savedOverride ?? savedSlugs.includes(slug)

  const business = useMemo(
    () => mergeCatalog(extra).find((b) => b.slug === slug),
    [extra, slug]
  )

  const similar = useMemo(() => {
    if (!business) return []
    return BUSINESSES.filter(
      (b) =>
        b.slug !== business.slug &&
        (b.category === business.category || b.district === business.district)
    ).slice(0, 3)
  }, [business])

  if (!business) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-3xl">İşletme bulunamadı</h1>
        <p className="mt-2 text-muted-foreground">
          Bu kayıt silinmiş olabilir veya henüz yayınlanmadı.
        </p>
        <Link href="/ara" className={cn(buttonVariants(), "mt-6 inline-flex")}>
          Aramaya dön
        </Link>
      </div>
    )
  }

  const photos = business.photos.length ? business.photos : [business.cover]

  return (
    <div>
      <div className="bg-card">
        <div className="mx-auto grid max-w-6xl gap-2 px-4 py-4 md:grid-cols-4 md:grid-rows-2 md:h-[420px]">
          <button
            type="button"
            className="relative overflow-hidden rounded-2xl md:col-span-2 md:row-span-2"
            onClick={() => setPhoto(0)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[photo] ?? photos[0]} alt="" className="size-full object-cover" />
          </button>
          {photos.slice(1, 5).map((src, i) => (
            <button
              key={src + i}
              type="button"
              className="relative hidden overflow-hidden rounded-2xl md:block"
              onClick={() => setPhoto(i + 1)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                {business.subcategory} · {business.district}, {business.city}
              </p>
              <h1 className="mt-1 text-3xl md:text-5xl">{business.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <RatingStars rating={business.rating} size="md" />
                <span className="font-semibold">{formatRating(business.rating)}</span>
                <span className="text-muted-foreground">
                  {business.reviewCount.toLocaleString("tr-TR")} yorum
                </span>
                <span>· {priceLabel(business.priceLevel)}</span>
                <OpenNow hours={business.hours} />
                {business.verified && (
                  <Badge variant="secondary" className="gap-1">
                    <BadgeCheck className="size-3" />
                    Doğrulandı
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Kaydet"
                onClick={() => setSavedOverride(toggleSaved(slug).includes(slug))}
              >
                {savedNow ? (
                  <Heart className="fill-primary text-primary" />
                ) : (
                  <Bookmark />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Paylaş"
                onClick={() => {
                  const url = window.location.href
                  if (navigator.share) navigator.share({ title: business.name, url })
                  else navigator.clipboard.writeText(url)
                }}
              >
                <Share2 />
              </Button>
            </div>
          </div>

          <p className="mt-5 max-w-2xl leading-relaxed text-muted-foreground">
            {business.description}
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {business.amenities.map((a) => (
              <Badge key={a} variant="outline">
                {a}
              </Badge>
            ))}
          </div>

          <Tabs defaultValue="yorum" className="mt-8">
            <TabsList variant="line" className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="yorum">Yorumlar</TabsTrigger>
              {business.services?.length ? (
                <TabsTrigger value="hizmet">Hizmetler</TabsTrigger>
              ) : null}
              {business.intel ? <TabsTrigger value="b2b">Ticari veri</TabsTrigger> : null}
              <TabsTrigger value="saat">Saatler</TabsTrigger>
            </TabsList>

            <TabsContent value="yorum" className="mt-4 space-y-4">
              {business.reviews.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Henüz yorum yok. İlk deneyimini yaz.
                </p>
              )}
              {business.reviews.map((r) => (
                <article
                  key={r.id}
                  className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{r.author}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.date}
                        {r.visitType ? ` · ${r.visitType}` : ""}
                      </p>
                    </div>
                    <RatingStars rating={r.rating} />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed">{r.text}</p>
                  {r.photos?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.photos[0]}
                      alt=""
                      className="mt-3 h-32 w-44 rounded-xl object-cover"
                    />
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {r.helpful} kişi faydalı buldu
                  </p>
                </article>
              ))}
            </TabsContent>

            {business.services && (
              <TabsContent value="hizmet" className="mt-4 space-y-2">
                {business.services.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
                  >
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {s.durationMin} dk
                        {s.description ? ` · ${s.description}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {s.price === 0 ? "Ücretsiz" : `₺${s.price.toLocaleString("tr-TR")}`}
                      </p>
                      <Link
                        href={`/randevu/${business.slug}?hizmet=${s.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        Seç
                      </Link>
                    </div>
                  </div>
                ))}
              </TabsContent>
            )}

            {business.intel && (
              <TabsContent value="b2b" className="mt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Intel label="Kuruluş" value={String(business.intel.founded)} />
                  <Intel label="Çalışan" value={business.intel.employees} />
                  <Intel label="Sektör" value={business.intel.industry} />
                  {business.intel.revenue && (
                    <Intel label="Ciro bandı" value={business.intel.revenue} />
                  )}
                  {business.intel.taxId && (
                    <Intel label="VKN (örnek)" value={business.intel.taxId} />
                  )}
                  {business.intel.exportMarkets && (
                    <Intel
                      label="İhracat pazarları"
                      value={business.intel.exportMarkets.join(", ")}
                    />
                  )}
                </div>
                <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                  <Building2 className="mt-0.5 size-3.5 shrink-0" />
                  Ticari istihbarat kartı D&amp;B / Kompass tarzı özet içindir; resmi
                  sicil kaydı değildir.
                </p>
              </TabsContent>
            )}

            <TabsContent value="saat" className="mt-4">
              <ul className="divide-y divide-border rounded-2xl bg-card ring-1 ring-foreground/10">
                {WEEKDAYS.map((d) => {
                  const h = business.hours[d]
                  return (
                    <li key={d} className="flex justify-between px-4 py-2.5 text-sm">
                      <span>{WEEKDAY_LABELS[d]}</span>
                      <span className="text-muted-foreground">
                        {!h || h.closed ? "Kapalı" : `${h.open}–${h.close}`}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </TabsContent>
          </Tabs>

          {similar.length > 0 && (
            <div className="mt-10">
              <h2 className="text-2xl">Benzer işletmeler</h2>
              <div className="mt-4 space-y-3">
                {similar.map((b) => (
                  <BusinessCard key={b.slug} business={b} compact />
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 h-fit">
          <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex flex-col gap-2">
              {business.services?.length ? (
                <Link
                  href={`/randevu/${business.slug}`}
                  className={cn(buttonVariants({ size: "lg" }), "h-11")}
                >
                  <CalendarClock className="size-4" />
                  Randevu al
                </Link>
              ) : null}
              {business.quoteEnabled ? (
                <Link
                  href={`/teklif?hedef=${business.slug}`}
                  className={cn(
                    buttonVariants({
                      size: "lg",
                      variant: business.services?.length ? "outline" : "default",
                    }),
                    "h-11"
                  )}
                >
                  Teklif iste
                </Link>
              ) : null}
              <a
                href={`tel:${business.phone.replace(/\s/g, "")}`}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11")}
              >
                <Phone className="size-4" />
                {business.phone}
              </a>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <dt className="sr-only">Adres</dt>
                  <dd>
                    {business.address}
                    <div className="mt-1">
                      <DirectionsLink
                        lat={business.lat}
                        lng={business.lng}
                        name={business.name}
                      />
                    </div>
                  </dd>
                </div>
              </div>
              <div className="flex gap-2">
                <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
                <dd>Saatler sekmesinde haftalık program</dd>
              </div>
              {business.website && (
                <div className="flex gap-2">
                  <Globe className="mt-0.5 size-4 shrink-0 text-primary" />
                  <a href={business.website} className="hover:underline">
                    Web sitesi
                  </a>
                </div>
              )}
            </dl>
          </div>
          <OsmEmbed lat={business.lat} lng={business.lng} />
        </aside>
      </div>
    </div>
  )
}

function Intel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}
