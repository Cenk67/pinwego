"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { downloadQrPng, downloadQrSvg, QrMark, useQrColors } from "@/components/qr/qr-mark"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { seedCampaigns } from "@/lib/campaigns"
import { useDirectory } from "@/lib/directory-context"
import { fold } from "@/lib/format"
import { businessCode, campaignCode, posterPath, qrUrl, summarizeQr, topQrBusinesses, vcardPath } from "@/lib/qr"
import { useQrEvents } from "@/lib/qr-store"
import type { Business } from "@/lib/types"

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-heading text-2xl">{value}</p>
    </article>
  )
}

function QrActions({ code, slug, title, photo }: { code: string; slug: string; title: string; photo?: string }) {
  const [note, setNote] = useState("")
  const colors = useQrColors(photo)
  const url = qrUrl(code)
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setNote("Bağlantı kopyalandı.")
    } catch {
      setNote(url)
    }
  }
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        setNote("Paylaşım açıldı.")
        return
      } catch {
        return
      }
    }
    await copy()
  }
  return (
    <div>
      <div className="flex justify-center">
        <QrMark text={url} label={title} colors={colors} />
      </div>
      <p className="mt-2 break-all text-center text-xs text-muted-foreground">{url}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Button type="button" className="h-11 rounded-full" onClick={() => downloadQrPng(url, `pinwego-${slug}.png`, colors)}>
          PNG
        </Button>
        <Button type="button" variant="outline" className="h-11 rounded-full" onClick={() => downloadQrSvg(url, `pinwego-${slug}.svg`, colors)}>
          SVG
        </Button>
        <Button variant="outline" className="h-11 rounded-full" nativeButton={false} render={<Link href={posterPath(code)} />}>
          Baskı
        </Button>
        <Button type="button" variant="outline" className="h-11 rounded-full" onClick={() => void copy()}>
          Bağlantı
        </Button>
        <Button type="button" variant="outline" className="h-11 rounded-full" onClick={() => void share()}>
          Paylaş
        </Button>
        <Button variant="outline" className="h-11 rounded-full" nativeButton={false} render={<a href={vcardPath(code)} />}>
          vCard
        </Button>
      </div>
      {note ? <p className="mt-2 text-center text-sm text-muted-foreground">{note}</p> : null}
    </div>
  )
}

function QrDesk({ business }: { business: Business }) {
  const events = useQrEvents().filter((event) => event.businessId === business.id)
  const summary = summarizeQr(events)
  const profile = businessCode(business.id, "business")
  const card = businessCode(business.id, "vcard")
  const campaigns = seedCampaigns.filter((item) => item.businessId === business.id)
  return (
    <article className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
      <h3 className="font-heading text-2xl">{business.name}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Camdaki kod işletme sayfasının tamamına gitmez. Kısa kartı açar. İkinci kod aynı kartın vCard türüdür.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Okutma" value={String(summary.scan)} />
        <Stat label="Son 7 gün" value={String(summary.week)} />
        <Stat label="Son 30 gün" value={String(summary.month)} />
        <Stat label="vCard" value={String(summary.vcard)} />
        <Stat label="Profil" value={String(summary.profile)} />
        <Stat label="Kayıt dönüşümü" value={`%${summary.registerRate}`} />
        <Stat label="Kampanya görüntüleme" value={String(summary.campaignView)} />
        <Stat label="Kampanya kullanımı" value={String(summary.campaignUse)} />
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-center text-sm font-medium">Profil kartı</p>
          <QrActions code={profile} slug={business.slug} title={business.name} photo={business.photo} />
        </div>
        <div>
          <p className="text-center text-sm font-medium">vCard kartı</p>
          <QrActions code={card} slug={`${business.slug}-vcard`} title={`${business.name} vCard`} photo={business.photo} />
        </div>
      </div>
      {campaigns.length ? (
        <div className="mt-6 grid gap-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id}>
              <p className="text-center text-sm font-medium">{campaign.title}</p>
              <QrActions code={campaignCode(campaign.id)} slug={campaign.slug} title={campaign.title} photo={campaign.image} />
            </div>
          ))}
        </div>
      ) : null}
    </article>
  )
}

export function QrOwner() {
  const { account } = useAuth()
  const { managedBusinesses } = useDirectory()
  if (!account || account.role === "musteri") return null
  const owned = managedBusinesses.filter((item) => item.ownerAccountId === account.id)
  return (
    <section className="mt-10">
      <h2 className="font-heading text-3xl">QR Kod Merkezi</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        PNG, SVG ve baskı şablonu bu tarayıcıda üretilir. Okutma sayacı da bu tarayıcıdadır; başka telefonun okutması
        buraya düşmez. Örnek sayılar paketlenmiş kayıttır.
      </p>
      {account.role === "admin" ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Bütün kartlar ve sıralama{" "}
          <Link href="/yonetim" className="text-primary">
            yönetimdeki QR kartlar
          </Link>{" "}
          sekmesindedir.
        </p>
      ) : null}
      {owned.length ? (
        <div className="mt-4 grid gap-4">
          {owned.map((business) => (
            <QrDesk key={business.id} business={business} />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">Bu hesaba bağlı işletme yok.</p>
      )}
    </section>
  )
}

export function QrAdmin() {
  const { account } = useAuth()
  const { managedBusinesses } = useDirectory()
  const events = useQrEvents()
  const [query, setQuery] = useState("Yokuştepe")
  const [selected, setSelected] = useState("yokustepe-kahvalti-waffle")
  const catalog = managedBusinesses
  const matches = useMemo(() => {
    const needle = fold(query.trim())
    if (!needle) return catalog.slice(0, 8)
    return catalog.filter((item) => fold(item.name).includes(needle) || fold(item.city).includes(needle)).slice(0, 8)
  }, [catalog, query])
  if (!account || account.role !== "admin") return null
  const summary = summarizeQr(events)
  const current = catalog.find((item) => item.id === selected) ?? catalog[0]
  const names = new Map(catalog.map((item) => [item.id, item.name]))
  const top = topQrBusinesses(events)
  return (
    <div className="mt-8 grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Tüm okutmalar" value={String(summary.scan)} />
        <Stat label="Son 7 gün" value={String(summary.week)} />
        <Stat label="Son 30 gün" value={String(summary.month)} />
        <Stat label="Kayıt dönüşümü" value={`%${summary.registerRate}`} />
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        Sayaçlar IP ve tarayıcı kimliği tutmaz. Örnek okutmalar paketin içindedir. Bu tarayıcıda açılan kartlar üzerine
        eklenir. Başka cihazın okutması bu panele yazılmaz.
      </p>
      <article className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="font-heading text-2xl">En çok okutulanlar</h2>
        <ul className="mt-3 grid gap-2 text-sm">
          {top.map(([id, count]) => (
            <li key={id} className="flex items-center justify-between gap-3">
              <span>{names.get(id) ?? id}</span>
              <span className="text-muted-foreground">{count}</span>
            </li>
          ))}
        </ul>
      </article>
      <div>
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="İşletme veya şehir" aria-label="QR işletme ara" />
        <div className="mt-3 flex flex-wrap gap-2">
          {matches.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item.id)}
              className={item.id === current?.id ? "rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground" : "rounded-full bg-secondary px-3 py-1.5 text-sm"}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
      {current ? <QrDesk business={current} /> : null}
    </div>
  )
}
