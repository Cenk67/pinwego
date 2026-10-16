"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { shiftDay } from "@/lib/stats"

type SourceId = "dogrudan" | "qr" | "kampanya" | "paylas" | "arama" | "dis"
type RangeId = "bugun" | "yedi" | "otuz"

type Report = {
  slug: string
  name: string
  from: string
  to: string
  today: string
  total: number
  shares: number
  rangeViews: number
  todayViews: number
  last7: number
  last30: number
  change: number | null
  firstAt: string
  lastAt: string
  uniques: number | null
  series: { day: string; views: number }[]
  weeks: { label: string; views: number }[]
  months: { label: string; views: number }[]
  sources: { id: SourceId; count: number }[]
}

type BoardRow = {
  slug: string
  name: string
  total: number
  shares: number
  lastAt: string
  rangeViews: number
  series: number[]
}

const ranges: { id: RangeId; label: string }[] = [
  { id: "bugun", label: "Bugün" },
  { id: "yedi", label: "Son 7 gün" },
  { id: "otuz", label: "Son 30 gün" },
]

const sourceLabel: Record<SourceId, string> = {
  dogrudan: "Doğrudan",
  qr: "QR",
  kampanya: "Kampanya",
  paylas: "Paylaşılan bağlantı",
  arama: "Arama",
  dis: "Dış bağlantı",
}

function bounds(id: RangeId, today: string) {
  if (id === "bugun") return [today, today]
  if (id === "yedi") return [shiftDay(today, -6), today]
  return [shiftDay(today, -29), today]
}

function stamp(value: string) {
  if (!value) return "henüz yok"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "henüz yok"
  return new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "medium", timeStyle: "short" }).format(date)
}

function changeText(value: number | null) {
  if (value === null) return "önceki 30 gün 0"
  return `${value > 0 ? "+" : ""}${value}%`
}

function Bars({ series }: { series: { day: string; views: number }[] }) {
  const max = Math.max(1, ...series.map((item) => item.views))
  return (
    <div className="mt-3 flex h-28 items-end gap-px" role="img" aria-label="Güne göre görüntülenme">
      {series.map((item) => (
        <div
          key={item.day}
          title={`${item.day}: ${item.views}`}
          className="min-w-0 flex-1 rounded-t bg-primary"
          style={{ height: `${Math.max(item.views ? 8 : 2, Math.round((item.views / max) * 100))}%` }}
        />
      ))}
    </div>
  )
}

export function ViewReport({ slug }: { slug: string }) {
  const [range, setRange] = useState<RangeId>("otuz")
  const [today, setToday] = useState("")
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    const query = today ? bounds(range, today) : ["", ""]
    const path = query[0]
      ? `/api/gorunum?slug=${encodeURIComponent(slug)}&rapor=1&from=${query[0]}&to=${query[1]}`
      : `/api/gorunum?slug=${encodeURIComponent(slug)}&rapor=1`
    void fetch(path, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as { ok?: boolean; reason?: string; report?: Report }
        if (!response.ok || !data.ok || !data.report) {
          setReport(null)
          setError(data.reason === "oturum" ? "Bu rapor için işletme girişi gerekir." : data.reason === "yetki" ? "Bu işletmenin raporu sana açık değil." : "Rapor açılamadı.")
          return
        }
        setError("")
        setReport(data.report)
        setToday(data.report.today)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Rapor açılamadı.")
      })
    return () => controller.abort()
  }, [range, slug, today])

  return (
    <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">Görüntülenme</p>
          <h2 className="mt-1 font-heading text-2xl">Sayfanı kimler açtı</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {ranges.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRange(item.id)}
              className={item.id === range ? "rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground" : "rounded-full bg-secondary px-3 py-1.5 text-sm"}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-muted-foreground">{error}</p> : null}
      {report ? (
        <>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Toplam", report.total],
              ["Bu aralık", report.rangeViews],
              ["Bugün", report.todayViews],
              ["Paylaşım", report.shares],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl bg-secondary px-3 py-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-heading text-2xl">{value}</dd>
              </div>
            ))}
          </dl>
          {report.uniques !== null ? (
            <p className="mt-3 text-sm">Bu aralıkta tekil ziyaretçi: {report.uniques}</p>
          ) : null}
          <p className="mt-2 text-sm text-muted-foreground">Son 30 gün {report.last30}. Önceki 30 güne göre {changeText(report.change)}.</p>
          <Bars series={report.series} />
          <p className="mt-1 text-xs text-muted-foreground">{report.from} – {report.to}</p>
          {report.weeks.length > 1 ? (
            <ul className="mt-3 grid gap-1 text-sm">
              <li className="text-xs font-medium text-muted-foreground">Haftalar</li>
              {report.weeks.map((week) => (
                <li key={week.label} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{week.label}</span>
                  <span>{week.views}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {report.months.length > 1 ? (
            <ul className="mt-3 grid gap-1 text-sm">
              <li className="text-xs font-medium text-muted-foreground">Aylar</li>
              {report.months.map((month) => (
                <li key={month.label} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{month.label}</span>
                  <span>{month.views}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {report.sources.length ? (
            <ul className="mt-4 grid gap-1 text-sm">
              <li className="text-xs font-medium text-muted-foreground">Kaynak</li>
              {report.sources.map((source) => (
                <li key={source.id} className="flex justify-between gap-3">
                  <span>{sourceLabel[source.id]}</span>
                  <span>{source.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Bu aralıkta kaynak kırılımı yok.</p>
          )}
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            İlk görüntülenme {stamp(report.firstAt)}. Son görüntülenme {stamp(report.lastAt)}. Paylaşım, görüntülenmeden ayrıdır.
            Aynı tarayıcı otuz dakikada bir kez sayılır. Türkiye saati kullanılır.
          </p>
          <Link href={`/isletme/${report.slug}`} className="mt-3 inline-block text-sm text-primary">
            Sayfayı aç
          </Link>
        </>
      ) : null}
    </section>
  )
}

export function ViewAdmin() {
  const [range, setRange] = useState<RangeId>("otuz")
  const [today, setToday] = useState("")
  const [rows, setRows] = useState<BoardRow[]>([])
  const [slug, setSlug] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    const query = today ? bounds(range, today) : ["", ""]
    const path = query[0] ? `/api/gorunum?liste=1&from=${query[0]}&to=${query[1]}` : "/api/gorunum?liste=1"
    void fetch(path, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as { ok?: boolean; reason?: string; today?: string; rows?: BoardRow[] }
        if (!response.ok || !data.ok || !data.rows || !data.today) {
          setError(data.reason === "yetki" || data.reason === "oturum" ? "Yönetici oturumu gerekli." : "Liste açılamadı.")
          return
        }
        setError("")
        setToday(data.today)
        setRows(data.rows)
        setSlug((current) => current || data.rows?.[0]?.slug || "")
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Liste açılamadı.")
      })
    return () => controller.abort()
  }, [range, today])

  const top = rows[0]

  return (
    <div className="mt-8 grid gap-4">
      <div className="flex flex-wrap gap-2">
        {ranges.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setRange(item.id)}
            className={item.id === range ? "rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground" : "rounded-full bg-secondary px-3 py-1.5 text-sm"}
          >
            {item.label}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="font-heading text-2xl">En çok görüntülenen</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {top ? `${top.name} bu aralıkta ${top.rangeViews} görüntülenme aldı.` : "Henüz sayılan görüntülenme yok."}
          </p>
          <ul className="mt-3 grid gap-2">
            {rows.map((row) => (
              <li key={row.slug}>
                <button
                  type="button"
                  onClick={() => setSlug(row.slug)}
                  className={row.slug === slug ? "w-full rounded-2xl bg-primary/10 px-3 py-2 text-left" : "w-full rounded-2xl px-3 py-2 text-left hover:bg-secondary"}
                >
                  <span className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{row.name}</span>
                    <span>{row.rangeViews}</span>
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">Toplam {row.total} · paylaşım {row.shares}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {slug ? <ViewReport slug={slug} /> : null}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Sayılar sunucuda birikir. Örnek katalog rakamı yoktur. Site geneli ziyaret grafiği Analitik sekmesinde durur.
      </p>
    </div>
  )
}
