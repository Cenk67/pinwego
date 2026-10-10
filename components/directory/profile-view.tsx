"use client"

import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { BusinessCard } from "@/components/directory/business-card"
import { Button } from "@/components/ui/button"
import { categoryById, cityCenter } from "@/lib/catalog"
import { distanceKm, formatDistance, formatTry } from "@/lib/format"
import {
  activeGallery,
  activeServices,
  businessJsonLd,
  recommendBusinesses,
  summaryRows,
  type MatchBreakdown,
} from "@/lib/profile"
import type { Business, BusinessProfile } from "@/lib/types"

export function ProfileJsonLd({ business, profile }: { business: Business; profile: BusinessProfile }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd(business, profile)) }} />
  )
}

export function ShortRead({
  business,
  profile,
  body,
  onBook,
}: {
  business: Business
  profile: BusinessProfile
  body: string
  onBook: () => void
}) {
  const category = categoryById(business.category)
  return (
    <section className="mt-6 rounded-3xl bg-primary/10 p-5">
      <p className="text-xs font-medium tracking-wide text-primary uppercase">Kısa okuma</p>
      <h2 className="mt-2 font-heading text-2xl">{profile.shortTitle}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7">{body}</p>
      <p className="mt-3 text-sm text-muted-foreground">
        {category.label} · {business.subcategory} · {business.district}, {business.city}
      </p>
      {profile.highlights.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {profile.highlights.map((item) => (
            <li key={item} className="rounded-full bg-card px-3 py-1 text-sm">
              {item}
            </li>
          ))}
        </ul>
      ) : null}
      <Button type="button" className="mt-4 h-11 rounded-xl" onClick={onBook}>
        {business.booking === "randevu" ? "Randevu al" : business.booking === "rezervasyon" ? "Rezervasyon" : "Teklif iste"}
      </Button>
    </section>
  )
}

export function AboutBlock({ profile, body }: { profile: BusinessProfile; body: string }) {
  return (
    <section className="mt-8">
      <h2 className="font-heading text-2xl">{profile.aboutTitle || "Hakkımızda"}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{body}</p>
    </section>
  )
}

export function SummaryGrid({ business, profile, extra }: { business: Business; profile: BusinessProfile; extra: { label: string; value: string }[] }) {
  const rows = summaryRows(business, profile)
  const seen = new Set(rows.map((row) => row[0]))
  const rest = extra.filter((item) => !seen.has(item.label))
  return (
    <section className="mt-8">
      <h2 className="font-heading text-2xl">İşletme özeti</h2>
      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm font-medium">{value}</dd>
          </div>
        ))}
        {rest.map((fact) => (
          <div key={fact.label} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <dt className="text-xs text-muted-foreground">{fact.label}</dt>
            <dd className="mt-1 text-sm font-medium">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function ServiceList({
  profile,
  onPick,
}: {
  profile: BusinessProfile
  onPick: (name: string) => void
}) {
  const services = activeServices(profile)
  return (
    <section className="mt-8">
      <h2 className="font-heading text-2xl">Hizmetler</h2>
      <ul className="mt-3 grid gap-3">
        {services.length ? (
          services.map((service) => (
            <li key={service.id} className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                {service.image ? (
                  <img src={service.image} alt={service.alt || service.name} loading="lazy" decoding="async" className="h-20 w-28 rounded-2xl object-cover" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{service.name}</p>
                  {service.summary ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{service.summary}</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[service.unit, service.duration, service.area].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm">{service.price > 0 ? formatTry(service.price) : "Sorunuz"}</span>
                  <Button type="button" variant="outline" className="h-8 rounded-full" onClick={() => onPick(service.name)}>
                    Seç
                  </Button>
                </div>
              </div>
              {service.detail ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{service.detail}</p> : null}
            </li>
          ))
        ) : (
          <li className="rounded-3xl bg-card px-4 py-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
            Hizmet listesi henüz yok. Talebi notla iletebilirsin.
          </li>
        )}
      </ul>
    </section>
  )
}

export function GalleryStrip({ profile }: { profile: BusinessProfile }) {
  const items = activeGallery(profile)
  const scroller = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const step = useCallback((direction: 1 | -1) => {
    const node = scroller.current
    if (!node) return
    const card = node.querySelector("figure")
    const width = card ? card.getBoundingClientRect().width + 12 : 280
    const max = node.scrollWidth - node.clientWidth
    if (direction > 0 && node.scrollLeft >= max - 8) node.scrollTo({ left: 0, behavior: "smooth" })
    else node.scrollBy({ left: width * direction, behavior: "smooth" })
  }, [])
  useEffect(() => {
    if (items.length < 2 || paused) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const timer = window.setInterval(() => step(1), 5500)
    return () => window.clearInterval(timer)
  }, [items.length, paused, step])
  if (!items.length) return null
  return (
    <section className="mt-8" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-heading text-2xl">Galeri</h2>
        {items.length > 1 ? (
          <div className="flex gap-2">
            <button type="button" aria-label="Önceki görsel" onClick={() => step(-1)} className="grid size-9 place-items-center rounded-full bg-card ring-1 ring-foreground/10">
              <ChevronLeft className="size-4" />
            </button>
            <button type="button" aria-label="Sonraki görsel" onClick={() => step(1)} className="grid size-9 place-items-center rounded-full bg-card ring-1 ring-foreground/10">
              <ChevronRight className="size-4" />
            </button>
          </div>
        ) : null}
      </div>
      <div ref={scroller} className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
        {items.map((item) => (
          <figure key={item.id} className="w-72 shrink-0 snap-start overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10">
            <img src={item.image} alt={item.alt || item.title} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
            {item.title || item.description ? (
              <figcaption className="p-3">
                {item.title ? <p className="text-sm font-medium">{item.title}</p> : null}
                {item.description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p> : null}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </section>
  )
}

export function AiPicks({ business, list }: { business: Business; list: Business[] }) {
  const picks = recommendBusinesses(list, business)
  if (!picks.length) return null
  const origin = cityCenter(business.city)
  return (
    <section className="mt-12">
      <h2 className="font-heading text-3xl">Pinwego AI önerileri</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        Aynı sektör, konum, hizmet ve arama niyetine göre sıralanır. Skor sayfada görünmez; sıralama bu skora göredir.
      </p>
      <div className={picks.length > 1 ? "mt-4 grid gap-4 md:grid-cols-3" : "mt-4 max-w-md"}>
        {picks.map((item) => (
          <div key={item.business.id}>
            <BusinessCard business={item.business} distanceKm={distanceKm(origin, item.business)} />
            <ReasonLine match={item.match} distance={formatDistance(distanceKm(origin, item.business))} />
          </div>
        ))}
      </div>
    </section>
  )
}

function ReasonLine({ match, distance }: { match: MatchBreakdown; distance: string }) {
  const notes = match.reasons.slice(0, 3)
  return (
    <p className="mt-2 text-xs leading-5 text-muted-foreground">
      {[...notes, distance].join(" · ")}
    </p>
  )
}

export function ProfileCrumbs({ business }: { business: Business }) {
  const category = categoryById(business.category)
  const city = `/ara?sehir=${encodeURIComponent(business.city)}`
  const sector = `/ara?kategori=${business.category}&sehir=${encodeURIComponent(business.city)}`
  return (
    <nav aria-label="İçerik yolu" className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
      <Link href="/" className="hover:text-primary">Ana sayfa</Link>
      <span aria-hidden>/</span>
      <Link href={city} className="hover:text-primary">{business.city}</Link>
      <span aria-hidden>/</span>
      <Link href={sector} className="hover:text-primary">{category.label}</Link>
      <span aria-hidden>/</span>
      <span className="text-foreground">{business.name}</span>
    </nav>
  )
}
