"use client"

import { useState } from "react"
import { fieldClass } from "@/components/directory/bits"
import { Button } from "@/components/ui/button"
import { WEEKDAYS, istanbulParts } from "@/lib/hours"
import type { ManualAction } from "@/lib/hours"
import type { DayPlan, HourBook, TimeRange } from "@/lib/types"
import { useMinute } from "@/components/directory/hours-view"

const emptyRange = (): TimeRange => ({ start: "09:00", end: "18:00" })

export function HoursEditor({
  book,
  onBook,
  onManual,
}: {
  book: HourBook
  onBook: (book: HourBook) => void
  onManual: (action: ManualAction) => void
}) {
  const now = useMinute()
  const today = now ? istanbulParts(now).weekday : -1
  const [span, setSpan] = useState<ManualAction["span"]>("2h")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("20:00")
  const manual = now && book.manual && Date.parse(book.manual.until) > now ? book.manual : null

  function day(index: number, next: DayPlan) {
    onBook({ ...book, week: book.week.map((item, itemIndex) => (itemIndex === index ? next : item)) })
  }

  function send(mode: ManualAction["mode"]) {
    onManual({ mode, span, until: span === "until" ? `${date}T${time}` : undefined })
  }

  return (
    <fieldset className="grid gap-4">
      <legend className="font-heading text-xl">Çalışma saatleri</legend>
      <p className="text-sm leading-6 text-muted-foreground">
        Açık ve kapalı durumu Türkiye saatiyle hesaplanır. Elle işaretleme sürelidir; süre bitince program kendiliğinden geri gelir.
      </p>
      <div className="grid gap-3 rounded-2xl bg-secondary/60 p-3">
        <p className="text-sm">
          {manual
            ? `${manual.mode === "open" ? "Elle açık" : "Elle kapalı"} işareti duruyor.`
            : "Şu an otomatik programa bağlı."}
        </p>
        <label className="grid gap-1 text-sm">
          Süre
          <select className={fieldClass} value={span} onChange={(event) => setSpan(event.target.value as ManualAction["span"])}>
            <option value="2h">2 saat boyunca</option>
            <option value="today">Bugün sonuna kadar</option>
            <option value="until">Belirlediğim saate kadar</option>
          </select>
        </label>
        {span === "until" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              Tarih
              <input className={fieldClass} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              Saat, Türkiye
              <input className={fieldClass} type="time" lang="tr" value={time} onChange={(event) => setTime(event.target.value)} />
            </label>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="h-10 rounded-xl" onClick={() => send("open")}>Açık olarak işaretle</Button>
          <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => send("closed")}>Kapalı olarak işaretle</Button>
          <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => send("auto")}>Otomatik duruma dön</Button>
        </div>
      </div>
      <div className="grid gap-2">
        {book.week.map((item, index) => (
          <div key={WEEKDAYS[index]} className={index === today ? "grid gap-2 rounded-2xl bg-primary/15 p-3" : "grid gap-2 rounded-2xl p-3 ring-1 ring-foreground/10"}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                {WEEKDAYS[index]}
                {index === today ? <span className="ml-2 text-xs text-primary">Bugün</span> : null}
              </p>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.closed}
                  onChange={(event) => day(index, event.target.checked ? { closed: true, ranges: [] } : { closed: false, ranges: [emptyRange()] })}
                />
                Kapalı
              </label>
            </div>
            {item.closed ? null : item.ranges.map((range, rangeIndex) => (
              <div key={`${WEEKDAYS[index]}-${rangeIndex}`} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <label className="grid gap-1 text-xs">
                  Açılış
                  <input
                    className={fieldClass}
                    type="time"
                    lang="tr"
                    value={range.start}
                    onChange={(event) => day(index, { ...item, ranges: item.ranges.map((entry, entryIndex) => entryIndex === rangeIndex ? { ...entry, start: event.target.value } : entry) })}
                  />
                </label>
                <label className="grid gap-1 text-xs">
                  Kapanış
                  <input
                    className={fieldClass}
                    type="time"
                    lang="tr"
                    value={range.end}
                    onChange={(event) => day(index, { ...item, ranges: item.ranges.map((entry, entryIndex) => entryIndex === rangeIndex ? { ...entry, end: event.target.value } : entry) })}
                  />
                </label>
                {item.ranges.length > 1 ? (
                  <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => day(index, { ...item, ranges: item.ranges.filter((_, entryIndex) => entryIndex !== rangeIndex) })}>Sil</Button>
                ) : <span />}
              </div>
            ))}
            {!item.closed && item.ranges.length < 3 ? (
              <Button type="button" variant="outline" className="h-9 w-fit rounded-xl" onClick={() => day(index, { ...item, ranges: [...item.ranges, { start: "13:00", end: "18:00" }] })}>
                Aralık ekle
              </Button>
            ) : null}
          </div>
        ))}
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium">Özel gün ve tatil</p>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl"
            onClick={() => onBook({ ...book, specials: [...book.specials, { date: "", closed: true, ranges: [], note: "" }].slice(0, 16) })}
          >
            Gün ekle
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Tatil günü elle açmaya kapalıdır. O gün işletme açık görünmez.</p>
        {book.specials.map((special, index) => (
          <div key={`${special.date}-${index}`} className="grid gap-2 rounded-2xl p-3 ring-1 ring-foreground/10">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-xs">
                Tarih
                <input
                  className={fieldClass}
                  type="date"
                  value={special.date}
                  onChange={(event) => onBook({ ...book, specials: book.specials.map((item, itemIndex) => itemIndex === index ? { ...item, date: event.target.value } : item) })}
                />
              </label>
              <label className="grid gap-1 text-xs">
                Not
                <input
                  className={fieldClass}
                  value={special.note}
                  maxLength={80}
                  onChange={(event) => onBook({ ...book, specials: book.specials.map((item, itemIndex) => itemIndex === index ? { ...item, note: event.target.value } : item) })}
                />
              </label>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={special.closed}
                onChange={(event) => onBook({
                  ...book,
                  specials: book.specials.map((item, itemIndex) => itemIndex === index ? { ...item, closed: event.target.checked, ranges: event.target.checked ? [] : [emptyRange()] } : item),
                })}
              />
              Tamamen kapalı
            </label>
            {special.closed ? null : (special.ranges[0] ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-xs">
                  Açılış
                  <input className={fieldClass} type="time" lang="tr" value={special.ranges[0].start} onChange={(event) => onBook({ ...book, specials: book.specials.map((item, itemIndex) => itemIndex === index ? { ...item, ranges: [{ ...item.ranges[0], start: event.target.value }] } : item) })} />
                </label>
                <label className="grid gap-1 text-xs">
                  Kapanış
                  <input className={fieldClass} type="time" lang="tr" value={special.ranges[0].end} onChange={(event) => onBook({ ...book, specials: book.specials.map((item, itemIndex) => itemIndex === index ? { ...item, ranges: [{ ...item.ranges[0], end: event.target.value }] } : item) })} />
                </label>
              </div>
            ) : null)}
            <Button type="button" variant="outline" className="h-9 w-fit rounded-xl" onClick={() => onBook({ ...book, specials: book.specials.filter((_, itemIndex) => itemIndex !== index) })}>
              Günü sil
            </Button>
          </div>
        ))}
      </div>
    </fieldset>
  )
}
