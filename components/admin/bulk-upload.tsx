"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { listingSheetSample, parseListingSheet, type SheetFault, type SheetFaultReason } from "@/lib/listings-import"
import type { Business } from "@/lib/types"

const faultText: Record<SheetFaultReason, string> = {
  baslik: "İlk satırda ad, kategori, sehir, semt, telefon ve ozet başlıkları olmalı.",
  fazla: "Bir dosyada en fazla 200 işletme satırı olur.",
  eksik: "Ad, şehir veya semt eksik.",
  kategori: "Kategori tanınmadı. Örnek: yeme, konaklama, guzellik.",
  telefon: "Telefon 10 ile 15 rakam olmalı.",
  ozet: "Özet en az 12 karakter olmalı.",
  konum: "Konum yok. Şehir listede değilse enlem ve boylam yaz.",
  dolu: "Kayıt sınırı doldu.",
  gecersiz: "Satır kayda uygun değil.",
}

const reasonText: Record<string, string> = {
  yetki: "Bu işlem yalnızca yönetici oturumunda yapılır.",
  oturum: "Yönetici oturumu kapandı. Yeniden gir.",
  limited: "Çok fazla deneme. Bir süre sonra tekrar dene.",
  invalid: "Dosya okunamadı.",
  bozuk: "Kayıt defteri bozuk. Yükleme durdu.",
  unavailable: "Kayıt sunucusu şu an kapalı.",
}

function downloadSample() {
  const blob = new Blob([listingSheetSample], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "pinwego-isletmeler.csv"
  link.click()
  URL.revokeObjectURL(url)
}

export function BulkUpload({ onImported }: { onImported: (listings: Business[]) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [text, setText] = useState("")
  const [rows, setRows] = useState<ReturnType<typeof parseListingSheet>["rows"]>([])
  const [faults, setFaults] = useState<SheetFault[]>([])
  const [note, setNote] = useState("")
  const [pending, setPending] = useState(false)

  function reset() {
    setName("")
    setText("")
    setRows([])
    setFaults([])
    setNote("")
  }

  async function takeFile(file: File | undefined) {
    if (!file) return
    setNote("")
    setName(file.name)
    if (file.size > 160_000) {
      setText("")
      setRows([])
      setFaults([])
      setNote("Dosya 160 KB sınırını aşıyor. Listeyi böl.")
      return
    }
    const next = await file.text()
    const parsed = parseListingSheet(next)
    setText(next)
    setRows(parsed.rows)
    setFaults(parsed.faults)
  }

  async function upload() {
    setPending(true)
    setNote("")
    try {
      const response = await fetch("/api/ilan", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "toplu", text }),
      })
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean
        reason?: string
        added?: number
        updated?: number
        faults?: SheetFault[]
        listings?: Business[]
      } | null
      if (!response.ok || !data?.ok) {
        if (data?.faults?.length) setFaults(data.faults)
        setNote(reasonText[data?.reason ?? ""] ?? "Kayıt yazılamadı.")
        return
      }
      onImported(data.listings ?? [])
      setRows([])
      setText("")
      setFaults(data.faults ?? [])
      setNote(`${data.added ?? 0} işletme eklendi, ${data.updated ?? 0} işletme güncellendi.`)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => { reset(); setOpen(true) }}>
        Dosyadan yükle
      </Button>
      <Dialog open={open} onOpenChange={(next) => { if (!next) setOpen(false) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">Dosyadan toplu yükleme</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-6 text-muted-foreground">
            Yalnızca yönetici oturumu yazar. CSV noktalı virgül, virgül veya sekme ayırır. Aynı addaki yönetici kaydı
            yeniden yüklemede güncellenir. Yeni kayıt doğrulanmış açılır. Şehir İstanbul, Ankara, İzmir, Antalya, Bursa
            veya Zonguldak ise enlem boş kalabilir; diğer şehirlerde enlem ve boylam gerekir.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={downloadSample}>
              Örnek dosya
            </Button>
            <label className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-secondary px-3 text-sm">
              Dosya seç
              <input
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                className="sr-only"
                onChange={(event) => {
                  void takeFile(event.target.files?.[0])
                  event.target.value = ""
                }}
              />
            </label>
          </div>
          {name ? <p className="text-sm text-muted-foreground">{name}</p> : null}
          <Textarea
            value={text}
            onChange={(event) => {
              const next = event.target.value
              const parsed = parseListingSheet(next)
              setText(next)
              setName((current) => current || "yapıştırılan liste")
              setRows(parsed.rows)
              setFaults(parsed.faults)
              setNote("")
            }}
            placeholder="Dosya seçmeden CSV metnini de yapıştırabilirsin"
            className="min-h-28 font-mono text-xs"
          />
          {text && (rows.length || faults.length) ? (
            <p className="text-sm">
              {rows.length} satır uygun{faults.length ? `, ${faults.length} satır atlanacak` : ""}.
            </p>
          ) : null}
          {rows.length ? (
            <div className="overflow-x-auto rounded-2xl ring-1 ring-foreground/10">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Satır</th>
                    <th className="px-3 py-2">Ad</th>
                    <th className="px-3 py-2">Şehir</th>
                    <th className="px-3 py-2">Semt</th>
                    <th className="px-3 py-2">Telefon</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map((row) => (
                    <tr key={row.line} className="border-t border-foreground/10">
                      <td className="px-3 py-2">{row.line}</td>
                      <td className="px-3 py-2">{String(row.body.name)}</td>
                      <td className="px-3 py-2">{String(row.body.city)}</td>
                      <td className="px-3 py-2">{String(row.body.district)}</td>
                      <td className="px-3 py-2">{String(row.body.phone)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {faults.length ? (
            <ul className="grid gap-1 text-sm text-muted-foreground">
              {faults.slice(0, 8).map((fault) => (
                <li key={`${fault.line}-${fault.reason}`}>
                  Satır {fault.line}: {faultText[fault.reason] ?? fault.reason}
                </li>
              ))}
              {faults.length > 8 ? <li>ve {faults.length - 8} satır daha</li> : null}
            </ul>
          ) : null}
          {note ? <p className="text-sm">{note}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="h-11 rounded-xl" disabled={pending || !rows.length || !text} onClick={() => void upload()}>
              {pending ? "Yazılıyor" : "Kayıtları yaz"}
            </Button>
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setOpen(false)}>
              Kapat
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
