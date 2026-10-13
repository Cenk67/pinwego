"use client"

import { useEffect, useState } from "react"
import { fieldClass } from "@/components/directory/bits"
import type { NotifyAudit } from "@/lib/admin-notify"
import { shiftDay, type StatsReport } from "@/lib/stats"

type RangeId = "bugun" | "yedi" | "otuz" | "ay" | "yil" | "ozel"

const ranges: { id: RangeId; label: string }[] = [
  { id: "bugun", label: "Bugün" },
  { id: "yedi", label: "Son 7 gün" },
  { id: "otuz", label: "Son 30 gün" },
  { id: "ay", label: "Bu ay" },
  { id: "yil", label: "Bu yıl" },
  { id: "ozel", label: "Özel aralık" },
]

type Payload = {
  ok?: boolean
  reason?: string
  today?: string
  report?: StatsReport
  audits?: NotifyAudit[]
}

function bounds(id: RangeId, today: string, from: string, to: string) {
  if (id === "bugun") return [today, today]
  if (id === "yedi") return [shiftDay(today, -6), today]
  if (id === "otuz") return [shiftDay(today, -29), today]
  if (id === "ay") return [`${today.slice(0, 8)}01`, today]
  if (id === "yil") return [`${today.slice(0, 4)}-01-01`, today]
  return [from || today, to || today]
}

function changeText(value: number | null) {
  if (value === null) return "önceki dönem 0"
  return `${value > 0 ? "+" : ""}${value}%`
}

function stamp(value: string) {
  if (!value) return "henüz yok"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "henüz yok"
  return new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" }).format(date)
}

function LineChart({ points }: { points: number[] }) {
  const width = 320
  const height = 96
  const max = Math.max(1, ...points)
  const path = points.map((value, index) => {
    const x = points.length === 1 ? 0 : (index / (points.length - 1)) * width
    const y = height - (value / max) * (height - 8) - 4
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(" ")
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-28 w-full" role="img" aria-label="Ziyaret zaman serisi">
      <path d={path || "M0,92"} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
    </svg>
  )
}

function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value))
  return (
    <div className="mt-3 grid gap-2">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-2 text-sm">
          <span className="truncate text-muted-foreground">{row.label}</span>
          <span className="h-2 rounded-full bg-secondary">
            <span className="block h-2 rounded-full bg-primary" style={{ width: `${Math.round((row.value / max) * 100)}%` }} />
          </span>
          <span className="text-right">{row.value}</span>
        </div>
      ))}
    </div>
  )
}

export function AnalyticsPanel() {
  const [range, setRange] = useState<RangeId>("yedi")
  const [today, setToday] = useState("")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [report, setReport] = useState<StatsReport | null>(null)
  const [audits, setAudits] = useState<NotifyAudit[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    const query = today ? bounds(range, today, customFrom, customTo) : ["", ""]
    const path = query[0] && query[1] ? `/api/analitik?from=${query[0]}&to=${query[1]}` : "/api/analitik"
    void fetch(path, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as Payload
        if (!response.ok || !data.ok || !data.report || !data.today) {
          setError(data.reason === "yetki" ? "Yönetici oturumu gerekli. Kodla yeniden gir." : "Rapor açılamadı.")
          return
        }
        setToday(data.today)
        setReport(data.report)
        setAudits(data.audits ?? [])
        setError("")
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return
        setError("Rapor açılamadı.")
      })
    return () => controller.abort()
  }, [range, today, customFrom, customTo])

  const cards = report
    ? [
        ["Ziyaret", report.totals.views, report.change.views, "sayfa görüntüleme"],
        ["Oturum", report.totals.sessions, report.change.sessions, "gün içi tekil çerez"],
        ["Yeni müşteri", report.totals.newCustomers, report.change.newCustomers, "sunucu kaydı"],
        ["Yeni işletme", report.totals.newBusinesses, report.change.newBusinesses, "sunucu kaydı"],
        ["Müşteri girişi", report.totals.customerLogins, report.change.customerLogins, "başarılı oturum"],
        ["İşletme girişi", report.totals.businessLogins, report.change.businessLogins, "başarılı oturum"],
      ]
    : []

  return (
    <div className="mt-8 grid gap-4">
      <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="font-heading text-2xl">Analitik ve raporlar</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Sayaçlar bu merkez açıldıktan sonraki sunucu olaylarıdır. Katalogdaki eski ilanlar ve tarayıcıdaki hesaplar buraya yazılmaz. Ziyaretçi için rastgele bir çerez tutulur; parmak izi, reklam kimliği ve cihaz ayrıntısı alınmaz. Saat dilimi Europe/Istanbul, kayıtlar UTC.
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Giriş yapan müşteri ile misafir, sunucuda ayrı bir oturum çerezi olmadığı için ziyaret satırında ayrılmaz. Müşteri ve işletme sayıları hesap kayıtlarından gelir. Yönetici oturumu ziyaret sayılmaz.
        </p>
      </section>
      <div className="flex flex-wrap gap-2">
        {ranges.map((item) => (
          <button key={item.id} type="button" onClick={() => setRange(item.id)} className={range === item.id ? "rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground" : "rounded-full bg-secondary px-3 py-1.5 text-sm"}>
            {item.label}
          </button>
        ))}
      </div>
      {range === "ozel" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span>Başlangıç</span>
            <input className={fieldClass} type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Bitiş</span>
            <input className={fieldClass} type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
          </label>
        </div>
      ) : null}
      {error ? <p className="rounded-2xl bg-destructive/10 px-3 py-3 text-sm text-destructive" role="alert">{error}</p> : null}
      {!report && !error ? <p className="text-sm text-muted-foreground">Rapor yükleniyor.</p> : null}
      {report ? (
        <>
          <p className="text-sm text-muted-foreground">{report.from} – {report.to} · {report.days} gün · günlük ortalama {report.averages.views} ziyaret, {report.averages.sessions} oturum. Yüzde, hemen önceki eşit uzunluktaki döneme göredir.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map(([label, value, delta, hint]) => (
              <article key={String(label)} className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 font-heading text-3xl">{value}</p>
                <p className="mt-1 text-sm">{changeText(delta as number | null)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
              </article>
            ))}
          </div>
          <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
            <h3 className="font-heading text-xl">Ziyaret</h3>
            {report.chart.every((item) => item.views === 0) ? <p className="mt-3 text-sm text-muted-foreground">Bu aralıkta ziyaret yok. Sıfır, örnek veri değil.</p> : <LineChart points={report.chart.map((item) => item.views)} />}
            <p className="mt-2 text-xs text-muted-foreground">Tekil ziyaretçi tahmini bu aralıkta {report.totals.uniques}. Birden uzun aralıkta aynı çerez gün gün yeniden sayılır.</p>
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
              <h3 className="font-heading text-xl">Yeni kayıtlar</h3>
              <Bars rows={report.chart.slice(-12).map((item) => ({ label: item.label, value: item.newCustomers + item.newBusinesses }))} />
            </section>
            <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
              <h3 className="font-heading text-xl">Hesap ve ziyaret dağılımı</h3>
              <Bars rows={[
                { label: "Müşteri", value: report.lifetime.customers },
                { label: "İşletme", value: report.lifetime.businesses },
                { label: "Misafir oturumu", value: report.totals.sessions },
              ]} />
              <p className="mt-3 text-xs text-muted-foreground">Müşteri ve işletme toplam kayıttır. Misafir oturumu seçilen aralığa aittir.</p>
            </section>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
              <h3 className="font-heading text-xl">Hesaplar</h3>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between gap-3"><dt>Kayıtlı müşteri</dt><dd>{report.lifetime.customers}</dd></div>
                <div className="flex justify-between gap-3"><dt>Doğrulama oranı</dt><dd>{report.lifetime.customerVerify === null ? "henüz yok" : `%${report.lifetime.customerVerify}`}</dd></div>
                <div className="flex justify-between gap-3"><dt>Aktif müşteri</dt><dd>{report.totals.customerActive}{report.activePartial ? " (kısmi)" : ""}</dd></div>
                <div className="flex justify-between gap-3"><dt>Son müşteri girişi</dt><dd>{stamp(report.lifetime.lastCustomerLogin)}</dd></div>
                <div className="flex justify-between gap-3"><dt>Kayıtlı işletme</dt><dd>{report.lifetime.businesses}</dd></div>
                <div className="flex justify-between gap-3"><dt>İşletme doğrulama</dt><dd>{report.lifetime.businessVerify === null ? "henüz yok" : `%${report.lifetime.businessVerify}`}</dd></div>
                <div className="flex justify-between gap-3"><dt>Aktif işletme</dt><dd>{report.totals.businessActive}{report.activePartial ? " (kısmi)" : ""}</dd></div>
                <div className="flex justify-between gap-3"><dt>Son işletme girişi</dt><dd>{stamp(report.lifetime.lastBusinessLogin)}</dd></div>
              </dl>
            </section>
            <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
              <h3 className="font-heading text-xl">Kaynak ve onay</h3>
              {report.sources.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Kaynak yok.</p> : <Bars rows={report.sources.map((item) => ({ label: item.host, value: item.count }))} />}
              <Bars rows={[
                { label: "Bekleyen", value: report.approvals.pending },
                { label: "Onaylanan", value: report.approvals.approved },
                { label: "Reddedilen", value: report.approvals.rejected },
                { label: "Geciken", value: report.approvals.late },
              ]} />
              <p className="mt-3 text-xs text-muted-foreground">Onay sayıları sıfır çünkü sunucuda onay kuyruğu yok. Bu sabit örnek veri değildir.</p>
            </section>
          </div>
          <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
            <h3 className="font-heading text-xl">Yönetici işlemleri</h3>
            {audits.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Henüz denetim kaydı yok.</p> : null}
            <ul className="mt-3 grid gap-2 text-sm">
              {audits.map((item) => (
                <li key={`${item.at}-${item.action}`} className="rounded-2xl bg-secondary/50 px-3 py-2">{stamp(item.at)} · {item.action}</li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  )
}
