"use client"

import Link from "next/link"
import { useState } from "react"
import { BusinessCard } from "@/components/directory/business-card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cityCenter } from "@/lib/catalog"
import { useDirectory } from "@/lib/directory-context"
import {
  bookingLabel,
  distanceKm,
  formatDistance,
  formatRating,
  formatResponse,
  priceLabel,
} from "@/lib/format"

export function SavedScreen() {
  const { saved, requests, city, visibleBusinesses } = useDirectory()
  const [picked, setPicked] = useState<string[]>([])
  const [notice, setNotice] = useState("")
  const list = visibleBusinesses.filter((business) => saved.includes(business.id))
  const origin = cityCenter(city)
  const compared = list.filter((business) => picked.includes(business.id))

  function toggle(id: string) {
    setNotice("")
    setPicked((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id)
      if (current.length >= 3) {
        setNotice("Karşılaştırma en fazla üç kayıt alır.")
        return current
      }
      return [...current, id]
    })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <h1 className="font-heading text-4xl md:text-5xl">Kayıtlılar</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        Karttaki yer imi bu tarayıcıda durur. İki ya da üç kaydı seçip puan, fiyat ve dönüşü yan yana bak.
      </p>

      {list.length === 0 ? (
        <div className="mt-8 rounded-3xl bg-card px-5 py-10 ring-1 ring-foreground/10">
          <h2 className="font-heading text-2xl">Henüz kayıt yok</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Bir işletme kartındaki yer imine bas. Liste burada toplanır.
          </p>
          <Button className="mt-4 h-11 rounded-full px-5" nativeButton={false} render={<Link href="/ara" />}>
            İşletme ara
          </Button>
        </div>
      ) : (
        <>
          {notice ? <p className="mt-4 text-sm text-primary">{notice}</p> : null}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {list.map((business) => (
              <div key={business.id}>
                <LabelRow
                  checked={picked.includes(business.id)}
                  onChange={() => toggle(business.id)}
                  label="Karşılaştırmaya al"
                />
                <BusinessCard business={business} distanceKm={distanceKm(origin, business)} />
              </div>
            ))}
          </div>
          {compared.length >= 2 ? (
            <div className="mt-8 overflow-x-auto rounded-3xl bg-card ring-1 ring-foreground/10">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-foreground/10">
                    <th className="px-4 py-3 font-medium">Ölçü</th>
                    {compared.map((business) => (
                      <th key={business.id} className="px-4 py-3 font-heading text-base font-medium">
                        <Link href={`/isletme/${business.slug}`}>{business.name}</Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Semt", (business: (typeof compared)[number]) => `${business.district}, ${business.city}`],
                    ["Puan", (business: (typeof compared)[number]) => formatRating(business)],
                    ["Yorum", (business: (typeof compared)[number]) => String(business.reviewCount)],
                    ["Segment", (business: (typeof compared)[number]) => priceLabel(business.priceLevel)],
                    ["Dönüş", (business: (typeof compared)[number]) => formatResponse(business.responseMinutes)],
                    ["Mesafe", (business: (typeof compared)[number]) => formatDistance(distanceKm(origin, business))],
                    ["Durum", (business: (typeof compared)[number]) => (business.openNow ? "Açık" : "Kapalı")],
                    ["Adım", (business: (typeof compared)[number]) => bookingLabel(business.booking)],
                  ].map(([label, read]) => (
                    <tr key={String(label)} className="border-b border-foreground/5">
                      <th className="px-4 py-3 font-medium text-muted-foreground">{label as string}</th>
                      {compared.map((business) => (
                        <td key={business.id} className="px-4 py-3">
                          {(read as (item: (typeof compared)[number]) => string)(business)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}

      <section className="mt-12">
        <h2 className="font-heading text-2xl">Talepler</h2>
        {requests.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Randevu ya da teklif gönderdiğinde burada görünür.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {requests.map((request) => (
              <li key={request.id} className="rounded-2xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10">
                <p className="font-medium">{request.businessName}</p>
                <p className="text-muted-foreground">
                  {request.when} · {request.name} · {request.phone}
                  {request.note ? ` · ${request.note}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function LabelRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <label className="mb-2 flex items-center gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  )
}
