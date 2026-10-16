"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  importFields,
  listingSheetSample,
  sheetByteCap,
  type ImportNote,
  type ImportPreview,
  type PublishState,
  type RowKind,
} from "@/lib/listings-import"
import { readCsvGrid } from "@/lib/sheet-file"
import type { Business } from "@/lib/types"

const kindText: Record<RowKind, string> = {
  yeni: "Yeni",
  zaten: "Kayıtlı",
  guncelle: "Güncelleme",
  olasi: "İnceleme",
  hata: "Hatalı",
}

const reasonText: Record<string, string> = {
  yetki: "Bu işlem yalnızca yönetici oturumunda yapılır.",
  oturum: "Yönetici oturumu kapandı. Yeniden gir.",
  limited: "Çok fazla deneme. Bir süre sonra tekrar dene.",
  invalid: "Dosya okunamadı.",
  bozuk: "Dosya bozuk. XLSX veya CSV olarak yeniden kaydet.",
  onay: "Kayıt, önizleme onayından sonra yazılır.",
  unavailable: "Kayıt sunucusu şu an kapalı.",
}

type Blank = { name: string; category: string; city: string; district: string; phone: string; summary: string; address: string }
type Result = ImportNote & { report: string }

const emptyRow = (): Blank => ({ name: "", category: "", city: "", district: "", phone: "", summary: "", address: "" })

function downloadText(name: string, text: string, type: string) {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

function toBase64(bytes: Uint8Array) {
  let text = ""
  for (let index = 0; index < bytes.length; index += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return btoa(text)
}

function tableText(rows: Blank[]) {
  const lines = ["ad;kategori;il;ilce;adres;telefon;ozet"]
  for (const row of rows) {
    if (!row.name && !row.phone && !row.summary) continue
    lines.push([row.name, row.category, row.city, row.district, row.address, row.phone, row.summary].join(";"))
  }
  return lines.join("\n")
}

export function BulkUpload({ onImported }: { onImported: (listings: Business[]) => void }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"tablo" | "dosya">("dosya")
  const [fileName, setFileName] = useState("")
  const [text, setText] = useState("")
  const [xlsx, setXlsx] = useState("")
  const [rows, setRows] = useState<Blank[]>([emptyRow(), emptyRow(), emptyRow()])
  const [paste, setPaste] = useState("")
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [map, setMap] = useState<string[]>([])
  const [publish, setPublish] = useState<PublishState>("onay")
  const [updates, setUpdates] = useState<number[]>([])
  const [force, setForce] = useState<number[]>([])
  const [note, setNote] = useState("")
  const [result, setResult] = useState<Result | null>(null)
  const [history, setHistory] = useState<ImportNote[]>([])
  const [pending, setPending] = useState(false)

  function resetPreview() {
    setPreview(null)
    setResult(null)
    setUpdates([])
    setForce([])
    setNote("")
  }

  async function loadHistory() {
    const response = await fetch("/api/ilan", { credentials: "include" })
    const data = (await response.json().catch(() => null)) as { imports?: ImportNote[] } | null
    setHistory(Array.isArray(data?.imports) ? data.imports : [])
  }

  async function previewFile(next?: { text?: string; xlsx?: string; map?: string[] }) {
    setPending(true)
    setNote("")
    setResult(null)
    try {
      const response = await fetch("/api/ilan", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "onizle", text: next?.text ?? text, xlsx: next?.xlsx ?? xlsx, map: next?.map ?? (map.length ? map : undefined) }),
      })
      const data = (await response.json().catch(() => null)) as (ImportPreview & { ok?: boolean; reason?: string }) | null
      if (!response.ok || !data?.ok) {
        setPreview(null)
        setNote(reasonText[data?.reason ?? ""] ?? "Önizleme yapılamadı.")
        return
      }
      setPreview(data)
      setHeaders(data.headers)
      setMap(data.map)
      setUpdates([])
      setForce([])
    } finally {
      setPending(false)
    }
  }

  async function takeFile(file: File | undefined) {
    if (!file) return
    resetPreview()
    setFileName(file.name)
    const lower = file.name.toLowerCase()
    if (!lower.endsWith(".csv") && !lower.endsWith(".txt") && !lower.endsWith(".xlsx")) {
      setNote("CSV, TXT veya XLSX seç.")
      return
    }
    if (file.size > sheetByteCap) {
      setNote("Dosya 1,2 MB sınırını aşıyor. Listeyi böl.")
      return
    }
    if (lower.endsWith(".xlsx")) {
      const encoded = toBase64(new Uint8Array(await file.arrayBuffer()))
      setText("")
      setXlsx(encoded)
      await previewFile({ text: "", xlsx: encoded, map: [] })
      return
    }
    const next = await file.text()
    setXlsx("")
    setText(next)
    await previewFile({ text: next, xlsx: "", map: [] })
  }

  function applyPaste() {
    const grid = readCsvGrid(paste)
    if ("error" in grid) {
      setNote("Yapıştırılan metinde satır yok.")
      return
    }
    const header = grid.headers.map((item) => item.toLocaleLowerCase("tr-TR"))
    const index = (names: string[]) => header.findIndex((item) => names.includes(item))
    const columns = {
      name: index(["ad", "işletme", "isletme"]),
      category: index(["kategori"]),
      city: index(["il", "şehir", "sehir"]),
      district: index(["ilçe", "ilce", "semt"]),
      phone: index(["telefon", "tel"]),
      summary: index(["özet", "ozet", "açıklama", "aciklama"]),
      address: index(["adres"]),
    }
    const source = header.some((item) => item === "ad" || item === "telefon") ? grid.rows : [{ line: 1, cells: grid.headers }, ...grid.rows]
    const next = source.map((row) => ({
      name: row.cells[columns.name] ?? row.cells[0] ?? "",
      category: row.cells[columns.category] ?? "",
      city: row.cells[columns.city] ?? "",
      district: row.cells[columns.district] ?? "",
      phone: row.cells[columns.phone] ?? "",
      summary: row.cells[columns.summary] ?? "",
      address: row.cells[columns.address] ?? "",
    }))
    setRows(next.length ? next : [emptyRow()])
    resetPreview()
  }

  async function upload() {
    if (!preview) return
    setPending(true)
    setNote("")
    try {
      const payload = {
        op: "toplu",
        confirm: true,
        text: mode === "tablo" ? tableText(rows) : text,
        xlsx: mode === "dosya" ? xlsx : "",
        map: mode === "dosya" ? map : undefined,
        publish,
        updates,
        force,
      }
      const response = await fetch("/api/ilan", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await response.json().catch(() => null)) as (Result & { ok?: boolean; reason?: string; listings?: Business[] }) | null
      if (!response.ok || !data?.ok) {
        setNote(reasonText[data?.reason ?? ""] ?? "Kayıt yazılamadı.")
        return
      }
      onImported(data.listings ?? [])
      setResult(data)
      setHistory((items) => [data, ...items.filter((item) => item.id !== data.id)].slice(0, 12))
      setPreview(null)
    } finally {
      setPending(false)
    }
  }

  const writable = (preview?.counts.yeni ?? 0) + updates.length + force.length

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-11 rounded-xl"
        onClick={() => {
          setOpen(true)
          void loadHistory()
        }}
      >
        Toplu yükleme
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">Toplu işletme yükleme</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-6 text-muted-foreground">
            Yalnızca yönetici yazar. Aynı il ve ilçedeki kayıt, aynı telefonlu aynı ad veya katalogdaki aynı şube
            sessizce birleştirilmez. Güncelleme ve şüpheli satır ancak işaretlenirse işlenir. Yeni kayıtlar varsayılan
            olarak onay bekler. E-posta ve kaynak açıklamasının ayrı alanı yok. Mahalle, adresin başına eklenir. Çalışma
            saatleri bu dosyadan değişmez.
          </p>
          <div className="flex flex-wrap gap-2">
            {(["dosya", "tablo"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => { setMode(item); resetPreview() }}
                className={item === mode ? "rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground" : "rounded-full bg-secondary px-3 py-1.5 text-sm"}
              >
                {item === "dosya" ? "Excel / CSV" : "Manuel tablo"}
              </button>
            ))}
          </div>
          {mode === "dosya" ? (
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => downloadText("pinwego-isletmeler.csv", listingSheetSample, "text/csv;charset=utf-8")}>
                  Örnek şablon
                </Button>
                <label className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-secondary px-3 text-sm">
                  Dosya seç
                  <input
                    type="file"
                    accept=".csv,.txt,.xlsx,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="sr-only"
                    onChange={(event) => {
                      void takeFile(event.target.files?.[0])
                      event.target.value = ""
                    }}
                  />
                </label>
              </div>
              {fileName ? <p className="text-sm text-muted-foreground">{fileName}</p> : null}
              {headers.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {headers.map((header, index) => (
                    <label key={`${header}-${index}`} className="grid gap-1 text-xs text-muted-foreground">
                      {header || `Kolon ${index + 1}`}
                      <select
                        value={map[index] ?? ""}
                        onChange={(event) => {
                          const next = [...map]
                          next[index] = event.target.value
                          setMap(next)
                          setPreview(null)
                          setResult(null)
                        }}
                        className="h-10 rounded-xl bg-card px-2 text-sm text-foreground ring-1 ring-foreground/10"
                      >
                        <option value="">Yazılmayacak</option>
                        {importFields.map(([id, label]) => (
                          <option key={id} value={id}>{label}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-3">
              <Textarea value={paste} onChange={(event) => setPaste(event.target.value)} placeholder="Excel'den kopyalanan satırları buraya yapıştır" className="min-h-20 font-mono text-xs" />
              <Button type="button" variant="outline" className="h-10 w-fit rounded-xl" onClick={applyPaste}>Tabloya aktar</Button>
              <div className="grid gap-2">
                {rows.map((row, index) => (
                  <div key={index} className="grid gap-2 rounded-2xl bg-card p-3 ring-1 ring-foreground/10 md:grid-cols-6">
                    {([
                      ["name", "Ad"],
                      ["category", "Kategori"],
                      ["city", "İl"],
                      ["district", "İlçe"],
                      ["phone", "Telefon"],
                      ["summary", "Kısa açıklama"],
                    ] as const).map(([key, label]) => (
                      <Input
                        key={key}
                        value={row[key]}
                        placeholder={label}
                        onChange={(event) => {
                          const value = event.target.value
                          setRows((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item))
                          setPreview(null)
                          setResult(null)
                        }}
                      />
                    ))}
                    <Button type="button" variant="ghost" className="h-9 rounded-xl md:col-span-6" onClick={() => { setRows((items) => items.filter((_, itemIndex) => itemIndex !== index)); resetPreview() }}>
                      Satırı sil
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" className="h-10 w-fit rounded-xl" onClick={() => setRows((items) => [...items, emptyRow()])}>Satır ekle</Button>
            </div>
          )}
          <label className="grid w-fit gap-1 text-xs text-muted-foreground">
            Yeni kayıtların durumu
            <select value={publish} onChange={(event) => setPublish(event.target.value as PublishState)} className="h-10 rounded-xl bg-card px-2 text-sm text-foreground ring-1 ring-foreground/10">
              <option value="onay">Onay bekliyor</option>
              <option value="taslak">Taslak</option>
              <option value="yayinda">Yayında</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              disabled={pending || (mode === "dosya" ? !text && !xlsx : !rows.some((row) => row.name))}
              onClick={() => {
                if (mode === "tablo") {
                  const next = tableText(rows)
                  setText(next)
                  setXlsx("")
                  void previewFile({ text: next, xlsx: "", map: [] })
                  return
                }
                void previewFile()
              }}
            >
              {pending ? "Bakılıyor" : "Önizle"}
            </Button>
            {preview?.report ? (
              <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => downloadText("pinwego-aktarim-raporu.csv", preview.report, "text/csv;charset=utf-8")}>
                Raporu indir
              </Button>
            ) : null}
          </div>
          {preview ? (
            <div className="grid gap-3">
              <p className="text-sm">
                {preview.total} satır · {preview.counts.yeni} yeni · {preview.counts.guncelle} güncelleme adayı · {preview.counts.olasi} inceleme · {preview.counts.zaten} kayıtlı · {preview.counts.hata} hatalı
              </p>
              <div className="overflow-x-auto rounded-2xl ring-1 ring-foreground/10">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Satır</th>
                      <th className="px-3 py-2">Sonuç</th>
                      <th className="px-3 py-2">Ad</th>
                      <th className="px-3 py-2">İl / ilçe</th>
                      <th className="px-3 py-2">Not</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 12).map((row) => (
                      <tr key={`${row.line}-${row.kind}`} className="border-t border-foreground/10 align-top">
                        <td className="px-3 py-2">{row.line}</td>
                        <td className="px-3 py-2">{kindText[row.kind]}</td>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2">{[row.district, row.city].filter(Boolean).join(", ")}</td>
                        <td className="px-3 py-2">
                          <p>{row.note}</p>
                          {row.changes.slice(0, 3).map((change) => (
                            <p key={change.field} className="text-xs text-muted-foreground">{change.field}: {change.before} → {change.after}</p>
                          ))}
                          {row.kind === "guncelle" ? (
                            <label className="mt-1 flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={updates.includes(row.line)}
                                onChange={(event) => setUpdates((items) => event.target.checked ? [...items, row.line] : items.filter((item) => item !== row.line))}
                              />
                              Güncellemeyi uygula
                            </label>
                          ) : null}
                          {row.kind === "olasi" ? (
                            <label className="mt-1 flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={force.includes(row.line)}
                                onChange={(event) => setForce((items) => event.target.checked ? [...items, row.line] : items.filter((item) => item !== row.line))}
                              />
                              Yine de yeni kayıt aç
                            </label>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          {result ? (
            <div className="grid gap-1 text-sm">
              <p>{result.total} satır işlendi. {result.added} yeni kayıt, {result.updated} güncelleme, {result.held} incelemede kaldı, {result.same} zaten vardı, {result.faults} hatalı.</p>
              <p className="text-muted-foreground">Süre {result.ms} ms · Sorumlu {result.actor}. Kesilen yükleme kayıt yazmaz; aynı dosyayı yeniden çalıştırmak mükerrer üretmez.</p>
              <Button type="button" variant="outline" className="h-10 w-fit rounded-xl" onClick={() => downloadText("pinwego-aktarim-raporu.csv", result.report, "text/csv;charset=utf-8")}>Hata raporunu indir</Button>
            </div>
          ) : null}
          {note ? <p className="text-sm">{note}</p> : null}
          {history.length ? (
            <div className="text-xs text-muted-foreground">
              {history.slice(0, 3).map((item) => (
                <p key={item.id}>{item.at.slice(0, 16).replace("T", " ")} · {item.added} yeni · {item.updated} güncelleme · {item.actor}</p>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="h-11 rounded-xl" disabled={pending || !preview || writable < 1} onClick={() => void upload()}>
              {pending ? "Yazılıyor" : "Onayla ve yaz"}
            </Button>
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setOpen(false)}>Kapat</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
