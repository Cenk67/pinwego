"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { InboxMessage, InboxSettings, InboxStatus } from "@/lib/inbox"

type Book = { settings: InboxSettings; messages: InboxMessage[]; counts: { yeni: number; bekleyen: number } }

const statusLabel: Record<InboxStatus, string> = {
  yeni: "Yeni",
  inceleniyor: "İnceleniyor",
  yanitlandi: "Yanıtlandı",
  kapatildi: "Kapatıldı",
  spam: "Spam",
}

async function loadBook(): Promise<Book | null> {
  const response = await fetch("/api/iletisim", { credentials: "include" })
  if (!response.ok) return null
  const data = (await response.json()) as Partial<Book>
  if (!data.settings || !Array.isArray(data.messages)) return null
  return { settings: data.settings, messages: data.messages, counts: data.counts ?? { yeni: 0, bekleyen: 0 } }
}

export function InboxPanel() {
  const [book, setBook] = useState<Book | null>(null)
  const [id, setId] = useState("")
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<InboxStatus | "">("")
  const [note, setNote] = useState("")
  const [reply, setReply] = useState("")
  const [message, setMessage] = useState("")
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const picked = new URLSearchParams(window.location.search).get("m") ?? ""
    void loadBook().then((next) => {
      if (!next) {
        setFailed(true)
        return
      }
      setBook(next)
      if (picked && next.messages.some((item) => item.id === picked)) setId(picked)
    })
  }, [])

  const current = book?.messages.find((item) => item.id === id) ?? null
  const visible = (book?.messages ?? []).filter((item) => {
    if (status && item.status !== status) return false
    const haystack = `${item.name} ${item.email} ${item.topicLabel} ${item.body}`.toLocaleLowerCase("tr")
    return haystack.includes(query.trim().toLocaleLowerCase("tr"))
  })

  async function post(body: unknown) {
    const response = await fetch("/api/iletisim", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = (await response.json().catch(() => null)) as { ok?: boolean; message?: InboxMessage; settings?: InboxSettings } | null
    if (!response.ok || !data?.ok) {
      setMessage("İşlem yazılamadı.")
      return null
    }
    return data
  }

  async function open(item: InboxMessage) {
    setId(item.id)
    setNote("")
    setReply("")
    if (item.seenAt) return
    const data = await post({ op: "seen", id: item.id })
    if (data?.message) setBook((prev) => prev ? { ...prev, messages: prev.messages.map((row) => row.id === data.message?.id ? data.message : row) } : prev)
  }

  async function saveStatus(next: InboxStatus) {
    if (!current) return
    const data = await post({ op: "status", id: current.id, status: next, assignee: current.assignee })
    if (!data?.message) return
    setBook((prev) => prev ? { ...prev, messages: prev.messages.map((row) => row.id === data.message?.id ? data.message : row) } : prev)
    setMessage(`Durum ${statusLabel[data.message.status]} oldu. Görüntülemek durumu değiştirmez.`)
  }

  async function saveNote() {
    if (!current) return
    const data = await post({ op: "note", id: current.id, text: note })
    if (!data?.message) return
    setBook((prev) => prev ? { ...prev, messages: prev.messages.map((row) => row.id === data.message?.id ? data.message : row) } : prev)
    setNote("")
    setMessage("İç not kayda geçti. Ziyaretçiye ve yanıta yazılmaz.")
  }

  async function sendReply() {
    if (!current) return
    const data = await post({ op: "reply", id: current.id, text: reply })
    if (!data?.message) return
    setBook((prev) => prev ? { ...prev, messages: prev.messages.map((row) => row.id === data.message?.id ? data.message : row) } : prev)
    setReply("")
    setMessage(data.message.reply === "gitti" ? "Yanıt gönderildi." : "Yanıt kayda geçmedi. Mesaj duruyor.")
  }

  async function redact() {
    if (!current) return
    const data = await post({ op: "redact", id: current.id })
    if (!data?.message) return
    setBook((prev) => prev ? { ...prev, messages: prev.messages.map((row) => row.id === data.message?.id ? data.message : row) } : prev)
    setMessage("Kişisel alanlar silindi. Kayıt numarası durur.")
  }

  async function saveSettings() {
    if (!book) return
    const data = await post({ op: "settings", settings: book.settings })
    if (!data?.settings) return
    setBook((prev) => prev ? { ...prev, settings: data.settings as InboxSettings } : prev)
    setMessage("İletişim ayarları kaydedildi.")
  }

  function patch(partial: Partial<InboxSettings>) {
    setBook((prev) => prev ? { ...prev, settings: { ...prev.settings, ...partial } } : prev)
  }

  if (failed) return <p className="mt-8 text-sm text-muted-foreground">İletişim kayıtları yönetici oturumu ister.</p>
  if (!book) return <p className="mt-8 text-sm text-muted-foreground">İletişim kayıtları yükleniyor.</p>
  return (
    <div className="mt-8 grid gap-6">
      <p className="text-sm text-muted-foreground">{book.counts.yeni} yeni · {book.counts.bekleyen} yanıt bekliyor. İç notlar yalnızca bu ekranda durur.</p>
      <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
        <select className="h-11 rounded-xl bg-card px-3 ring-1 ring-foreground/10" value={status} onChange={(event) => setStatus(event.target.value as InboxStatus | "")}>
          <option value="">Tüm durumlar</option>
          {Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ad, e-posta veya konu" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="grid content-start gap-2">
          {visible.map((item) => (
            <button key={item.id} type="button" onClick={() => void open(item)} className={item.id === id ? "rounded-2xl bg-primary px-3 py-2 text-left text-sm text-primary-foreground" : "rounded-2xl bg-card px-3 py-2 text-left text-sm ring-1 ring-foreground/10"}>
              <span className="block font-medium">{item.redacted ? "Silinmiş kayıt" : item.name}</span>
              <span className="mt-1 block text-xs opacity-70">{item.topicLabel} · {statusLabel[item.status]}{item.seenAt ? "" : " · okunmadı"}</span>
            </button>
          ))}
        </div>
        {current ? (
          <div className="grid content-start gap-3 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
            <p className="text-sm text-muted-foreground">{current.id} · {current.source} · {current.createdAt.slice(0, 16).replace("T", " ")}</p>
            {current.redacted ? <p>Kişisel alanlar silindi.</p> : (
              <>
                <p>{current.name}</p>
                <p>{current.email}{current.phone ? ` · ${current.phone}` : ""}</p>
                <p className="font-medium">{current.topicLabel}</p>
                {current.reference ? <p className="text-sm">İlgili kayıt: {current.reference}</p> : null}
                <p className="whitespace-pre-wrap text-sm leading-6">{current.body}</p>
              </>
            )}
            <label className="grid gap-1.5 text-sm">
              Durum
              <select className="h-11 rounded-xl bg-background px-3 ring-1 ring-foreground/10" value={current.status} onChange={(event) => void saveStatus(event.target.value as InboxStatus)}>
                {Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <Label htmlFor="inbox-note">İç not</Label>
            <Textarea id="inbox-note" value={note} onChange={(event) => setNote(event.target.value)} />
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => void saveNote()}>Notu kaydet</Button>
            <Label htmlFor="inbox-reply">Yanıt</Label>
            <Textarea id="inbox-reply" value={reply} onChange={(event) => setReply(event.target.value)} />
            <Button type="button" className="h-11 rounded-xl" onClick={() => void sendReply()}>Yanıtı gönder</Button>
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => void redact()}>Kişisel veriyi sil</Button>
            <ul className="grid gap-1 text-xs text-muted-foreground">
              {current.events.map((item, index) => <li key={`${item.at}-${index}`}>{item.kind} · {item.text || item.at.slice(0, 16)}</li>)}
            </ul>
          </div>
        ) : <p className="text-sm text-muted-foreground">Bir mesaj seçin. Açmak durumu değiştirmez.</p>}
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <div className="grid gap-3 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="font-medium">Sayfa ve sosyal bağlantılar</p>
        <Label htmlFor="inbox-title">Başlık</Label>
        <Input id="inbox-title" value={book.settings.title} onChange={(event) => patch({ title: event.target.value })} />
        <Label htmlFor="inbox-summary">Açıklama</Label>
        <Textarea id="inbox-summary" value={book.settings.summary} onChange={(event) => patch({ summary: event.target.value })} />
        <Label htmlFor="inbox-seo">SEO başlığı</Label>
        <Input id="inbox-seo" value={book.settings.seoTitle} onChange={(event) => patch({ seoTitle: event.target.value })} />
        <Label htmlFor="inbox-meta">Meta açıklaması</Label>
        <Textarea id="inbox-meta" value={book.settings.seoDescription} onChange={(event) => patch({ seoDescription: event.target.value })} />
        <Label htmlFor="inbox-mail">Görünen e-posta</Label>
        <Input id="inbox-mail" value={book.settings.email} onChange={(event) => patch({ email: event.target.value })} />
        <Label htmlFor="inbox-phone">Görünen telefon</Label>
        <Input id="inbox-phone" value={book.settings.phone} onChange={(event) => patch({ phone: event.target.value })} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={book.settings.published} onChange={(event) => patch({ published: event.target.checked })} /> Form yayında</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={book.settings.phoneEnabled} onChange={(event) => patch({ phoneEnabled: event.target.checked })} /> Telefon alanı açık</label>
        <div className="grid gap-2">
          {book.settings.topics.map((item) => (
            <label key={item.id} className="grid gap-2 rounded-2xl bg-background p-3 text-sm sm:grid-cols-[1fr_90px_auto]">
              <Input value={item.label} onChange={(event) => patch({ topics: book.settings.topics.map((row) => row.id === item.id ? { ...row, label: event.target.value } : row) })} />
              <Input type="number" value={item.order} onChange={(event) => patch({ topics: book.settings.topics.map((row) => row.id === item.id ? { ...row, order: Number(event.target.value) } : row) })} />
              <span className="flex items-center gap-2"><input type="checkbox" checked={item.active} onChange={(event) => patch({ topics: book.settings.topics.map((row) => row.id === item.id ? { ...row, active: event.target.checked } : row) })} /> Açık</span>
            </label>
          ))}
        </div>
        <div className="grid gap-2">
          {book.settings.socials.map((item) => (
            <label key={item.id} className="grid gap-2 text-sm sm:grid-cols-[90px_minmax(0,1fr)_auto]">
              <span className="self-center">{item.label}</span>
              <Input value={item.url} placeholder="https://" onChange={(event) => patch({ socials: book.settings.socials.map((row) => row.id === item.id ? { ...row, url: event.target.value } : row) })} />
              <span className="flex items-center gap-2"><input type="checkbox" checked={item.active} onChange={(event) => patch({ socials: book.settings.socials.map((row) => row.id === item.id ? { ...row, active: event.target.checked } : row) })} /> Açık</span>
            </label>
          ))}
        </div>
        <Button type="button" className="h-11 rounded-xl" onClick={() => void saveSettings()}>Ayarları kaydet</Button>
      </div>
    </div>
  )
}
