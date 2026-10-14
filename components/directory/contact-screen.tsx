"use client"

import Link from "next/link"
import { useState } from "react"
import { TurnstileField } from "@/components/auth/turnstile-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { publicSettings } from "@/lib/inbox"

type Settings = ReturnType<typeof publicSettings>

export function ContactScreen({ initial, siteKey }: { initial: Settings; siteKey: string }) {
  const [settings] = useState(initial)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [topicId, setTopicId] = useState(initial.topics[0]?.id ?? "")
  const [reference, setReference] = useState("")
  const [body, setBody] = useState("")
  const [website, setWebsite] = useState("")
  const [token, setToken] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState("")
  const topic = settings.topics.find((item) => item.id === topicId)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError("")
    try {
      const response = await fetch("/api/iletisim", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "send", name, email, phone, topicId, reference, body, website, turnstile: token }),
      })
      const data = (await response.json().catch(() => null)) as { ok?: boolean; id?: string; reason?: string } | null
      if (!response.ok || !data?.ok) {
        setError(data?.reason === "limited" ? "Çok fazla deneme. Bir süre sonra tekrar yazın." : data?.reason === "kapali" ? "Form geçici olarak kapalı." : data?.reason === "challenge" ? "Doğrulama tamamlanmadı." : "Mesaj kabul edilmedi. Ad, e-posta, konu ve en az on karakterlik metin gerekir.")
        return
      }
      setDone(data.id ? `Mesajınız kayda geçti. Kayıt numarası ${data.id}.` : "Mesajınız alındı.")
    } catch {
      setError("Bağlantı kurulamadı. Mesaj gitmediyse yeniden deneyin.")
    } finally {
      setPending(false)
    }
  }

  return (
    <article className="mx-auto grid max-w-3xl gap-8 px-4 py-8 md:py-12">
      <div>
        <p className="text-sm font-medium text-primary">İletişim</p>
        <h1 className="mt-2 font-heading text-4xl leading-tight text-balance">{settings.title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{settings.summary}</p>
      </div>
      <div className="grid gap-2 text-sm leading-6">
        <p>E-posta: <a className="text-primary" href={`mailto:${settings.email}`}>{settings.email}</a></p>
        {settings.phone ? <p>Telefon: {settings.phone}</p> : null}
        <p className="text-muted-foreground">
          Mesaj destek kaydı için saklanır. <Link className="text-primary" href="/kvkk-aydinlatma-metni">KVKK aydınlatma metni</Link> amacı ve hakları anlatır. Pazarlama izni bu formda istenmez.
        </p>
      </div>
      {!settings.published ? <p className="rounded-3xl bg-card p-4 text-sm ring-1 ring-foreground/10">İletişim formu geçici olarak kapalı. Yazmak için e-posta adresini kullanın.</p> : null}
      {settings.published && done ? <p className="rounded-3xl bg-card p-4 text-sm ring-1 ring-foreground/10">{done} Bildirim e-postası ayrıca gider; kayıt e-postaya bağlı değildir.</p> : null}
      {settings.published && !done ? (
        <form onSubmit={submit} className="grid gap-4 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="grid gap-1.5">
            <Label htmlFor="contact-name">Ad soyad</Label>
            <Input id="contact-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="h-11" placeholder="Adınızı ve soyadınızı yazın" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="contact-email">E-posta</Label>
            <Input id="contact-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="h-11" placeholder="ornek@eposta.com" />
          </div>
          {settings.phoneEnabled ? (
            <div className="grid gap-1.5">
              <Label htmlFor="contact-phone">Telefon, isteğe bağlı</Label>
              <Input id="contact-phone" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" className="h-11" placeholder="05XX XXX XX XX" />
            </div>
          ) : null}
          <div className="grid gap-1.5">
            <Label htmlFor="contact-topic">Konu</Label>
            <select id="contact-topic" value={topicId} onChange={(event) => setTopicId(event.target.value)} className="h-11 rounded-xl bg-background px-3 ring-1 ring-foreground/10">
              {settings.topics.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>
          {topic?.reference ? (
            <div className="grid gap-1.5">
              <Label htmlFor="contact-ref">İlgili kayıt veya sayfa</Label>
              <Input id="contact-ref" value={reference} onChange={(event) => setReference(event.target.value)} className="h-11" placeholder="İşletme adı veya sayfa bağlantısı" />
            </div>
          ) : null}
          <div className="grid gap-1.5">
            <Label htmlFor="contact-body">Mesaj</Label>
            <Textarea id="contact-body" value={body} onChange={(event) => setBody(event.target.value)} className="min-h-36" placeholder="Mesajınızı buraya yazın" maxLength={settings.messageMax} />
          </div>
          <input value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          <TurnstileField siteKey={siteKey} onToken={setToken} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="h-11 rounded-xl" disabled={pending || (Boolean(siteKey) && !token)}>
            {pending ? "Gönderiliyor" : "Mesajı gönder"}
          </Button>
        </form>
      ) : null}
    </article>
  )
}
