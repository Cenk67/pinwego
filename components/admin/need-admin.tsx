"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { fieldClass } from "@/components/directory/bits"
import { allSectors } from "@/lib/sectors"
import type { NeedReport } from "@/lib/need-analytics"
import { shiftDay } from "@/lib/stats"

type RangeId = "bugun" | "yedi" | "otuz" | "ay" | "ozel"

const ranges: { id: RangeId; label: string }[] = [
  { id: "bugun", label: "Bugün" },
  { id: "yedi", label: "Son 7 gün" },
  { id: "otuz", label: "Son 30 gün" },
  { id: "ay", label: "Bu ay" },
  { id: "ozel", label: "Özel aralık" },
]

type Payload = { ok?: boolean; reason?: string; today?: string; report?: NeedReport }

function bounds(id: RangeId, today: string, from: string, to: string) {
  if (id === "bugun") return [today, today]
  if (id === "yedi") return [shiftDay(today, -6), today]
  if (id === "otuz") return [shiftDay(today, -29), today]
  if (id === "ay") return [`${today.slice(0, 8)}01`, today]
  return [from || today, to || today]
}

function percent(value: number | null) {
  return value === null ? "henüz yok" : `%${value}`
}

function categoryLabel(id: string) {
  if (!id) return "kategori yok"
  return allSectors().find((sector) => sector.id === id)?.label ?? id
}

function Bars({ rows, empty }: { rows: { label: string; value: number; hint?: string }[]; empty: string }) {
  if (!rows.length) return <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
  const max = Math.max(1, ...rows.map((row) => row.value))
  return (
    <div className="mt-3 grid gap-2">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-2 text-sm">
          <span className="truncate text-muted-foreground" title={row.label}>
            {row.label}
            {row.hint ? <span className="block truncate text-xs">{row.hint}</span> : null}
          </span>
          <span className="h-2 rounded-full bg-secondary">
            <span className="block h-2 rounded-full bg-primary" style={{ width: `${Math.round((row.value / max) * 100)}%` }} />
          </span>
          <span className="text-right">{row.value}</span>
        </div>
      ))}
    </div>
  )
}

export function NeedAdmin() {
  const [range, setRange] = useState<RangeId>("yedi")
  const [today, setToday] = useState("")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [report, setReport] = useState<NeedReport | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    const query = today ? bounds(range, today, customFrom, customTo) : ["", ""]
    const path = query[0] && query[1] ? `/api/ihtiyac?from=${query[0]}&to=${query[1]}` : "/api/ihtiyac"
    void fetch(path, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as Payload
        if (!response.ok || !data.ok || !data.report || !data.today) {
          setError(data.reason === "yetki" ? "Yönetici oturumu gerekli. Kodla yeniden gir." : "Rapor açılamadı.")
          return
        }
        setToday(data.today)
        setReport(data.report)
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
        ["Arama", String(report.totals.searches), "ihtiyaç cümlesi (sesli: " + report.totals.voice + ")"],
        ["Eşleşme oranı", percent(report.rates.match), "en az bir Pinwego kaydı bulan arama"],
        ["Sıfır sonuç", percent(report.rates.zero), `${report.totals.zero} arama boş döndü`],
        ["Dış kaynağa geçiş", percent(report.rates.external), "Google, YouTube, harita veya keşif tıklaması"],
        ["İletişim dönüşümü", percent(report.rates.contact), `${report.totals.contacts} arama telefon, WhatsApp, mesaj veya randevuya vardı`],
        ["Memnuniyet", percent(report.rates.satisfaction), `${report.totals.up} evet · ${report.totals.down} hayır`],
      ]
    : []

  return (
    <div className="mt-8 grid gap-4">
      <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="font-heading text-2xl">İhtiyaç araması</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Arama ekranındaki ihtiyaç cümlelerinin sonucu burada toplanır: kaç arama Pinwego kaydı buldu, kaçı boş döndü, kaçı dış kaynağa
          geçti, kaçı işletmeyle iletişime vardı. Cümleler küçük harfe indirilir; telefon numarası ve e-posta kaydedilmeden atılır.
          Çerez ya da kişi kimliği tutulmaz. Yönetici oturumundaki aramalar sayılmaz.
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Sıfır sonuç listesi en değerli satırdır: oradaki cümleler ya eksik bir işletme kaydını ya da{" "}
          <code className="rounded bg-secondary px-1">lib/need.ts</code> sözlüğüne eklenecek yeni bir ipucunu gösterir.
        </p>
      </section>
      <div className="flex flex-wrap gap-2">
        {ranges.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setRange(item.id)}
            className={range === item.id ? "rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground" : "rounded-full bg-secondary px-3 py-1.5 text-sm"}
          >
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
      {error ? (
        <p className="rounded-2xl bg-destructive/10 px-3 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {!report && !error ? <p className="text-sm text-muted-foreground">Rapor yükleniyor.</p> : null}
      {report ? (
        <>
          <p className="text-sm text-muted-foreground">
            {report.from} – {report.to} · {report.days} gün · {report.totals.corrected} aramada yazım düzeltildi · {report.totals.nearby} aramada yakın
            kayıtlar gösterildi · {report.totals.info} bilgi niyetli arama · {report.totals.guides} rehber açılışı · {report.totals.alternatives} yakın
            kategori tıklaması · {report.totals.register} işletme kayıt tıklaması.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map(([label, value, hint]) => (
              <article key={label} className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 font-heading text-3xl">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
              </article>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
              <h3 className="font-heading text-xl">Sıfır sonuç dönen ihtiyaçlar</h3>
              <Bars
                rows={report.zeroQueries.map((row) => ({ label: row.q, value: row.zero, hint: [categoryLabel(row.category), row.city].filter(Boolean).join(" · ") }))}
                empty="Bu aralıkta boş dönen arama yok."
              />
              {report.zeroQueries.length ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {report.zeroQueries.slice(0, 6).map((row) => (
                    <li key={row.q}>
                      <Link href={`/ara?q=${encodeURIComponent(row.q)}`} className="rounded-full bg-secondary px-3 py-1 text-xs">
                        “{row.q}” aramasını aç
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
            <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
              <h3 className="font-heading text-xl">En sık ihtiyaçlar</h3>
              <Bars
                rows={report.topQueries.map((row) => ({
                  label: row.q,
                  value: row.count,
                  hint: `${categoryLabel(row.category)} · ${row.contacts} iletişim · ${row.external} dış tıklama`,
                }))}
                empty="Bu aralıkta arama yok. Sıfır, örnek veri değil."
              />
            </section>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
              <h3 className="font-heading text-xl">Kategoriye göre</h3>
              <Bars
                rows={report.topCategories.map((row) => ({
                  label: categoryLabel(row.id),
                  value: row.searches,
                  hint: `${row.zero} boş · ${row.contacts} iletişim`,
                }))}
                empty="Kategoriye bağlanan arama yok."
              />
            </section>
            <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
              <h3 className="font-heading text-xl">Dış kaynak tıklamaları</h3>
              <Bars
                rows={[
                  { label: "Google", value: report.external.web },
                  { label: "YouTube", value: report.external.video },
                  { label: "Google Haritalar", value: report.external.maps },
                  { label: "Keşif sayfası", value: report.external.places },
                ]}
                empty=""
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Dış sayfalar hazır arama bağlantısıyla yeni sekmede açılır; içerik Pinwego’ya çekilmez. Tıklama sayısı sayfanın açılıp açılmadığını
                değil, bağlantıya basıldığını gösterir.
              </p>
            </section>
          </div>
          <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
            <h3 className="font-heading text-xl">Günlük seyir</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Gün</th>
                    <th className="py-1 pr-3 font-medium">Arama</th>
                    <th className="py-1 pr-3 font-medium">Boş</th>
                    <th className="py-1 pr-3 font-medium">Dış tıklama</th>
                    <th className="py-1 pr-3 font-medium">İletişim</th>
                  </tr>
                </thead>
                <tbody>
                  {report.series.slice(-14).map((row) => (
                    <tr key={row.day} className="border-t border-foreground/10">
                      <td className="py-1 pr-3">{row.label}</td>
                      <td className="py-1 pr-3">{row.searches}</td>
                      <td className="py-1 pr-3">{row.zero}</td>
                      <td className="py-1 pr-3">{row.external}</td>
                      <td className="py-1 pr-3">{row.contacts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
