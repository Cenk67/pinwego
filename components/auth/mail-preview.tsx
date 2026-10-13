"use client"

import { useEffect, useState } from "react"

type Mail = { to: string; subject: string; html: string; text: string; purpose: string }

export function MailPreview() {
  const [messages, setMessages] = useState<Mail[] | null>(null)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    void fetch("/api/onizleme/posta")
      .then((response) => {
        if (response.status === 404) {
          setClosed(true)
          return null
        }
        return response.json() as Promise<{ messages: Mail[] }>
      })
      .then((data) => {
        if (data) setMessages(data.messages)
      })
      .catch(() => setClosed(true))
  }, [])

  if (closed) return <p className="mx-auto max-w-lg px-4 py-16 text-sm text-muted-foreground">Bu kutu yalnızca geliştirme ortamında durur.</p>
  if (!messages) return <p className="mx-auto max-w-lg px-4 py-16 text-sm text-muted-foreground">Posta kutusu açılıyor</p>
  if (!messages.length) return <p className="mx-auto max-w-lg px-4 py-16 text-sm text-muted-foreground">Henüz mektup yok. Kayıt veya şifre sıfırlama bir mektup bırakır.</p>

  return (
    <div className="mx-auto grid max-w-3xl gap-6 px-4 py-8">
      <h1 className="font-heading text-4xl">Giden posta</h1>
      {messages.map((mail, index) => (
        <article key={`${mail.purpose}-${index}`} className="grid gap-3 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-sm text-muted-foreground">{mail.purpose} · {mail.to}</p>
          <h2 className="font-heading text-2xl">{mail.subject}</h2>
          <iframe title={mail.subject} sandbox="" srcDoc={mail.html} className="h-96 w-full rounded-2xl bg-white" />
        </article>
      ))}
    </div>
  )
}
