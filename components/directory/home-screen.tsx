"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { useMemo, useState, useSyncExternalStore } from "react"
import { BusinessCard } from "@/components/directory/business-card"
import { fieldClass } from "@/components/directory/bits"
import { MiniMap } from "@/components/directory/mini-map"
import { SearchForm } from "@/components/directory/search-form"
import { SectorForm } from "@/components/directory/sector-form"
import { SectorStrip } from "@/components/directory/sector-strip"
import { Button } from "@/components/ui/button"
import { suggestions } from "@/lib/catalog"
import { useDirectory } from "@/lib/directory-context"
import { fold } from "@/lib/format"
import { distanceFromPlace, placeLabel, applyPlace } from "@/lib/place"
import { getSectorClicks, getServerSectorClicks, rankSectors, subscribeSectorClicks } from "@/lib/sector-clicks"

export function HomeScreen() {
  const { place, sectors, visibleBusinesses, removeSector } = useDirectory()
  const [sectorQuery, setSectorQuery] = useState("")
  const [sectorOpen, setSectorOpen] = useState(false)
  const sectorClicks = useSyncExternalStore(subscribeSectorClicks, getSectorClicks, getServerSectorClicks)
  const catalog = visibleBusinesses
  const catalogCount = catalog.length
  const visibleSectors = useMemo(() => {
    const needle = fold(sectorQuery)
    const matched = needle
      ? sectors.filter((item) => fold(`${item.label} ${item.blurb} ${item.phrases.join(" ")}`).includes(needle))
      : sectors
    return rankSectors(matched, sectorClicks)
  }, [sectors, sectorQuery, sectorClicks])
  const ranked = catalog.map((business) => ({ business, distanceKm: distanceFromPlace(place, business) }))
  const scoped = applyPlace(ranked, place)
  const local = scoped.items
    .map((item) => ({ business: item.business, km: item.distanceKm }))
    .sort((a, b) => a.km - b.km)
  const nearby = local.filter((item) => item.business.openNow).slice(0, 6)
  const sponsored = local.filter((item) => item.business.premium)
  const featured = (sponsored.length ? sponsored : local).slice(0, 3)

  return (
    <div>
      <section className="atlas border-b border-foreground/10">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 md:py-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">
              Ticari rehber · {catalogCount} kayıt · {sectors.length} sektör
            </p>
            <h1 className="mt-3 max-w-full font-heading text-4xl leading-[1.05] text-balance md:max-w-xl md:text-6xl">
              Doğru işletme, tek cümle.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
              Yorum, fiyat, mesafe ve randevuyu aynı kartta topladık. Ne aradığını yaz; pinwego
              yakındaki kaydı gerekçesiyle sıralasın.
            </p>
            <div className="mt-6">
              <SearchForm large />
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {suggestions.map((item) => (
                <Link
                  key={item}
                  href={`/ara?q=${encodeURIComponent(item)}`}
                  className="shrink-0 rounded-full bg-card px-3 py-1.5 text-sm ring-1 ring-foreground/10"
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>
          <MiniMap
            label={place.nearMe ? "Yakınımdakiler" : `${placeLabel(place)} kayıtları`}
            points={local.map((item) => item.business)}
            focus={place}
            className="min-h-80"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-3xl">Şu an açık</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {scoped.widened
                ? "40 km içinde açık kayıt yok. En yakın örnekler duruyor."
                : `${placeLabel(place)} çevresindeki açık kayıtlar`}
            </p>
          </div>
          <Link href="/ara?acik=1" className="text-sm text-primary">
            Tümü
          </Link>
        </div>
        {nearby.length ? (
          <div className="-mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-2">
            {nearby.map((item) => (
              <div key={item.business.id} className="w-72 shrink-0">
                <BusinessCard business={item.business} distanceKm={item.km} />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">Bu konumda açık örnek kayıt yok.</p>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-3xl">Sektörler</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {sectors.length} sektör, en çok tıklanan önde. 20’şer sağdan sola kayar.
            </p>
          </div>
          <input
            value={sectorQuery}
            onChange={(event) => setSectorQuery(event.target.value)}
            placeholder="Sektör ara"
            aria-label="Sektör ara"
            className={`${fieldClass} sm:max-w-56`}
          />
        </div>
        {visibleSectors.length ? (
          <SectorStrip
            sectors={visibleSectors}
            businesses={catalog}
            onRemove={removeSector}
            onAdd={() => setSectorOpen(true)}
          />
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Bu aramada sektör yok. Yeni sektör ekleyebilirsin.</p>
        )}
        <SectorForm open={sectorOpen} onOpenChange={setSectorOpen} />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-3xl">Öne çıkanlar</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {sponsored.length
                ? "Ücretsiz kaydın yanında, sponsoru belli premium görünürlük."
                : "Bu konumda sponsorlu reklam alanı yok. Yerel kayıtlar bu alana yüklendi."}
            </p>
          </div>
          <Link href={sponsored.length ? "/ara?one=1" : "/ara"} className="text-sm text-primary">
            Liste
          </Link>
        </div>
        {featured.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {featured.map((item) => (
              <BusinessCard key={item.business.id} business={item.business} distanceKm={item.km} />
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">Bu konumda gösterilecek reklam alanı yok.</p>
        )}
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-6 md:grid-cols-3">
        {[
          ["1", "Anlat", "Semt, bütçe, saat ya da işi düz cümleyle yaz. Süzgeçler arkada durur."],
          ["2", "Karşılaştır", "Puan, yorum, fiyat aralığı, açıklık ve dönüş süresi aynı kartta."],
          ["3", "İlerle", "Randevu, rezervasyon ya da teklif talebi işletmenin kendi kaydından gider."],
        ].map(([step, title, copy]) => (
          <article key={step} className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
            <p className="font-heading text-3xl text-primary">{step}</p>
            <h3 className="mt-2 font-heading text-2xl">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-primary px-6 py-8 text-primary-foreground md:flex-row md:items-center">
          <div>
            <h2 className="font-heading text-3xl">İşi anlat, üç kayıt gelsin.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-primary-foreground/80">
              Boya, temizlik, tesisat ya da ofis tedariki. Talep, fiyat aralığı yazılı işletmelerle eşleşir.
            </p>
          </div>
          <Button
            variant="secondary"
            className="h-11 rounded-full px-5"
            nativeButton={false}
            render={<Link href="/talep" />}
          >
            Talep oluştur
            <ArrowUpRight className="size-4" />
          </Button>
        </div>
      </section>
    </div>
  )
}
