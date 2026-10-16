"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Consent, FaqItem, PageStatus, PageVersion, SitePage } from "@/lib/site-pages"

type Book = { pages: SitePage[]; faqs: FaqItem[]; versions: PageVersion[]; consents: Consent[] }

async function loadBook(): Promise<Book | null> {
  const response = await fetch("/api/sayfa", { credentials: "include" })
  if (!response.ok) return null
  const data = (await response.json()) as Partial<Book>
  if (!Array.isArray(data.pages)) return null
  return { pages: data.pages, faqs: data.faqs ?? [], versions: data.versions ?? [], consents: data.consents ?? [] }
}

export function PagesPanel() {
  const [book, setBook] = useState<Book | null>(null)
  const [id, setId] = useState("hakkimizda")
  const [message, setMessage] = useState("")
  const [faqQuestion, setFaqQuestion] = useState("")
  const [faqAnswer, setFaqAnswer] = useState("")
  const page = book?.pages.find((item) => item.id === id) ?? null

  useEffect(() => {
    void loadBook().then((next) => {
      if (next) setBook(next)
    })
  }, [])

  async function save(current: SitePage) {
    const response = await fetch("/api/sayfa", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        op: "save",
        id: current.id,
        title: current.title,
        summary: current.summary,
        source: current.source,
        seoTitle: current.seoTitle,
        seoDescription: current.seoDescription,
        status: current.status,
        effectiveAt: current.effectiveAt,
        footer: current.footer,
        order: current.order,
        index: current.index,
      }),
    })
    const data = (await response.json().catch(() => null)) as { ok?: boolean; page?: SitePage } | null
    if (!response.ok || !data?.page) {
      setMessage("Kayıt yazılamadı. Metinde HTML, geçersiz bağlantı veya boş başlık olmasın.")
      return
    }
    setBook((prev) => prev ? { ...prev, pages: prev.pages.map((item) => item.id === data.page?.id ? data.page : item) } : prev)
    setMessage(`Sürüm ${data.page.version} kaydedildi. Eski kabul kayıtları durur.`)
  }

  async function restore(version: string) {
    const response = await fetch("/api/sayfa", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "restore", id, version }),
    })
    const data = (await response.json().catch(() => null)) as { page?: SitePage } | null
    if (!data?.page) {
      setMessage("Eski sürüm açılmadı.")
      return
    }
    setBook((prev) => prev ? { ...prev, pages: prev.pages.map((item) => item.id === data.page?.id ? data.page : item) } : prev)
    setMessage(`Sürüm ${data.page.version} yayına alındı. Önceki metin arşivde durur.`)
  }

  function patch(partial: Partial<SitePage>) {
    setBook((prev) => prev ? { ...prev, pages: prev.pages.map((item) => item.id === id ? { ...item, ...partial } : item) } : prev)
  }

  async function saveFaq() {
    const response = await fetch("/api/sayfa", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "faq", question: faqQuestion, answer: faqAnswer, category: "Genel", status: "yayinda", order: 200 }),
    })
    const data = (await response.json().catch(() => null)) as { faq?: FaqItem } | null
    if (!data?.faq) {
      setMessage("Soru kaydedilemedi.")
      return
    }
    setBook((prev) => prev ? { ...prev, faqs: [data.faq as FaqItem, ...prev.faqs.filter((item) => item.id !== data.faq?.id)] } : prev)
    setFaqQuestion("")
    setFaqAnswer("")
    setMessage("Soru yayın listesine eklendi.")
  }

  if (!book || !page) return <p className="mt-8 text-sm text-muted-foreground">İçerik yükleniyor.</p>
  const history = book.versions.filter((item) => item.pageId === page.id).slice(-8).reverse()
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="grid content-start gap-2">
        {book.pages.map((item) => (
          <button key={item.id} type="button" onClick={() => { setId(item.id); setMessage("") }} className={item.id === id ? "rounded-xl bg-primary px-3 py-2 text-left text-sm text-primary-foreground" : "rounded-xl bg-card px-3 py-2 text-left text-sm ring-1 ring-foreground/10"}>
            {item.title}
            <span className="mt-1 block text-xs opacity-70">{item.status} · {item.version}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Başlık için ## kullanın. Liste satırı tire ile başlar. Bağlantı [metin](/yol) biçimindedir. Ham HTML yazılmaz. Hukuki metin taslaktır; hukuk incelemesi olmadan kesin sayılmaz.
        </p>
        <Label htmlFor="page-title">Sayfa adı</Label>
        <Input id="page-title" value={page.title} onChange={(event) => patch({ title: event.target.value })} />
        <p className="text-xs text-muted-foreground">Adres /{page.slug} sabit kalır.</p>
        <Label htmlFor="page-summary">Kısa açıklama</Label>
        <Input id="page-summary" value={page.summary} onChange={(event) => patch({ summary: event.target.value })} />
        <Label htmlFor="page-seo">SEO başlığı</Label>
        <Input id="page-seo" value={page.seoTitle} onChange={(event) => patch({ seoTitle: event.target.value })} />
        <Label htmlFor="page-meta">Meta açıklaması</Label>
        <Textarea id="page-meta" value={page.seoDescription} onChange={(event) => patch({ seoDescription: event.target.value })} />
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1.5 text-sm">
            Durum
            <select className="h-11 rounded-xl bg-card px-3 ring-1 ring-foreground/10" value={page.status} onChange={(event) => patch({ status: event.target.value as PageStatus })}>
              <option value="taslak">Taslak</option>
              <option value="incelemede">İncelemede</option>
              <option value="yayinda">Yayında</option>
              <option value="arsiv">Arşiv</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            Yürürlük tarihi
            <Input type="date" value={page.effectiveAt} onChange={(event) => patch({ effectiveAt: event.target.value })} />
          </label>
          <label className="grid gap-1.5 text-sm">
            Sıra
            <Input type="number" value={page.order} onChange={(event) => patch({ order: Number(event.target.value) })} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={page.footer} onChange={(event) => patch({ footer: event.target.checked })} />
          Alt bilgide göster
        </label>
        <Label htmlFor="page-source">İçerik</Label>
        <Textarea id="page-source" value={page.source} onChange={(event) => patch({ source: event.target.value })} className="min-h-80 font-mono text-sm" />
        <Button type="button" className="h-11 rounded-xl" onClick={() => void save(page)}>Yayın durumunu kaydet</Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        {history.length ? (
          <div className="grid gap-2">
            <p className="font-medium">Eski sürümler</p>
            {history.map((item) => (
              <div key={`${item.version}-${item.at}`} className="flex items-center justify-between gap-3 rounded-2xl bg-card px-3 py-2 text-sm ring-1 ring-foreground/10">
                <span>{item.version} · {item.at} · {item.by}</span>
                <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => void restore(item.version)}>Bu sürüme dön</Button>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">İlk kayıtta önceki sürüm arşive düşer.</p>}
        <div className="mt-4 grid gap-2 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="font-medium">Yeni soru</p>
          <Input value={faqQuestion} onChange={(event) => setFaqQuestion(event.target.value)} placeholder="Soru" />
          <Textarea value={faqAnswer} onChange={(event) => setFaqAnswer(event.target.value)} placeholder="Cevap" />
          <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => void saveFaq()}>Soruyu yayınla</Button>
          <p className="text-xs text-muted-foreground">{book.faqs.filter((item) => item.status === "yayinda").length} soru yayında.</p>
        </div>
        <div>
          <p className="font-medium">Son kabul kayıtları</p>
          <ul className="mt-2 grid gap-1 text-xs text-muted-foreground">
            {book.consents.slice(0, 12).map((item) => (
              <li key={item.id}>{item.kind} · {item.pageId} · sürüm {item.version} · {item.accepted ? "kabul" : "ret"}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
