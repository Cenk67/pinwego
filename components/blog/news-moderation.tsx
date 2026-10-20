"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { type BlogAuditEntry, type BlogPost, type BlogStatus } from "@/lib/blog"
import { statusLabel } from "@/lib/blog-desk"

type Payload = {
  ok?: boolean
  error?: string
  posts?: BlogPost[]
  audit?: BlogAuditEntry[]
  stats?: Partial<Record<BlogStatus, number>>
}

const filters: Array<BlogStatus | "all"> = ["all", "pending_review", "revision_requested", "published", "approved", "rejected", "draft", "archived"]

export function NewsModeration() {
  const [data, setData] = useState<Payload | null>(null)
  const [filter, setFilter] = useState<BlogStatus | "all">("pending_review")
  const [query, setQuery] = useState("")
  const [note, setNote] = useState("")
  const [when, setWhen] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [openId, setOpenId] = useState("")

  async function load() {
    const response = await fetch("/api/blog/yazi", { credentials: "include" })
    setData((await response.json()) as Payload)
  }

  useEffect(() => {
    let alive = true
    void fetch("/api/blog/yazi", { credentials: "include" })
      .then((response) => response.json())
      .then((body: Payload) => {
        if (alive) setData(body)
      })
      .catch(() => {
        if (alive) setData({ ok: false, error: "Kuyruk açılamadı." })
      })
    return () => {
      alive = false
    }
  }, [])

  async function send(body: unknown) {
    setBusy(true)
    setNotice("")
    try {
      const response = await fetch("/api/blog/yazi", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload = (await response.json()) as Payload
      setNotice(payload.ok ? "İşlem kaydedildi." : payload.error || "İşlem yapılamadı.")
      if (payload.ok) {
        setData(payload)
        setNote("")
        setWhen("")
      }
    } catch {
      setNotice("İşlem yapılamadı.")
    } finally {
      setBusy(false)
    }
  }

  const posts = useMemo(() => {
    const needle = query.toLocaleLowerCase("tr-TR")
    return (data?.posts ?? []).filter((post) => {
      if (filter !== "all" && (post.status ?? "draft") !== filter) return false
      if (!needle) return true
      return `${post.title} ${post.businessName ?? ""}`.toLocaleLowerCase("tr-TR").includes(needle)
    })
  }, [data?.posts, filter, query])

  if (!data) return <p className="mt-6 text-sm text-muted-foreground">Moderasyon kuyruğu yükleniyor.</p>
  if (!data.ok) return <p className="mt-6 text-sm text-muted-foreground">{data.error || "Kuyruk açılamadı."}</p>

  const pending = data.stats?.pending_review ?? 0

  return (
    <div className="mt-6">
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
        İşletme yazısı onaylanmadan pinwego blogunda görünmez. Onay, yazım düzeltmesi kadar içerik kalitesi içindir: kopya,
        anahtar kelime yığını ve ilgisiz metin reddedilir. Yayındaki yazının yeni hali, sen onaylamadan eskisinin yerine geçmez.
      </p>
      <p className="mt-3 text-sm text-primary">{pending} yazı onay bekliyor.</p>
      {notice ? <p className="mt-3 text-sm text-primary">{notice}</p> : null}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Başlık veya işletme" className="h-11 sm:max-w-72" />
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={filter === item ? "rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground" : "rounded-full bg-secondary px-3 py-1.5 text-sm"}
            >
              {item === "all" ? "Tümü" : statusLabel[item]}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Yayın günü
          <Input type="date" value={when} onChange={(event) => setWhen(event.target.value)} className="h-11" />
          <span className="text-xs text-muted-foreground">Boşsa onay anında yayınlanır. İleri bir gün, o gün panel açılınca yayına girer; o saate kadar sitede görünmez.</span>
        </label>
        <label className="grid gap-1 text-sm">
          Düzeltme veya ret notu
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-24" placeholder="İşletmenin göreceği gerekçe" />
        </label>
      </div>
      <div className="mt-4 grid gap-3">
        {posts.map((post) => (
          <article key={post.id} className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
            <p className="text-xs text-primary">
              {post.businessName} · {statusLabel[post.status ?? "draft"]}
              {post.submittedAt ? ` · gönderildi ${post.submittedAt}` : ""}
            </p>
            <h3 className="mt-1 font-heading text-2xl">{post.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{post.description}</p>
            {post.live ? (
              <p className="mt-2 text-sm text-primary">Yayındaki başlık duruyor: {post.live.title}. Aşağıdaki metin yeni sürüm.</p>
            ) : null}
            {post.reviewNote ? <p className="mt-2 text-sm">Son not: {post.reviewNote}</p> : null}
            {openId === post.id ? (
              <div className="mt-4 grid gap-3">
                {post.image ? <img src={post.image} alt={post.imageAlt} className="max-h-64 w-full rounded-2xl object-cover" /> : null}
                <p className="whitespace-pre-wrap text-sm leading-6">{post.body}</p>
                {post.live ? (
                  <div className="rounded-2xl bg-secondary p-3 text-sm leading-6">
                    <p className="font-medium">Yayındaki metin</p>
                    <p className="mt-2 whitespace-pre-wrap">{post.live.body}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => setOpenId(openId === post.id ? "" : post.id)}>
                {openId === post.id ? "Metni gizle" : "Metni aç"}
              </Button>
              {post.status === "pending_review" ? (
                <>
                  <Button type="button" className="h-9 rounded-xl" disabled={busy} onClick={() => void send({ op: "approve", id: post.id, scheduledAt: when })}>
                    Onayla
                  </Button>
                  <Button type="button" variant="outline" className="h-9 rounded-xl" disabled={busy} onClick={() => void send({ op: "revise", id: post.id, note })}>
                    Düzeltme iste
                  </Button>
                  <Button type="button" variant="outline" className="h-9 rounded-xl" disabled={busy} onClick={() => void send({ op: "reject", id: post.id, note })}>
                    Reddet
                  </Button>
                </>
              ) : null}
              {post.status === "published" || post.status === "approved" ? (
                <Button type="button" variant="outline" className="h-9 rounded-xl" disabled={busy} onClick={() => void send({ op: "unpublish", id: post.id, note })}>
                  Yayından kaldır
                </Button>
              ) : null}
              <Button type="button" variant="outline" className="h-9 rounded-xl" disabled={busy} onClick={() => void send({ op: "remove", id: post.id })}>
                Sil
              </Button>
            </div>
          </article>
        ))}
        {!posts.length ? <p className="text-sm text-muted-foreground">Bu süzgeçte yazı yok.</p> : null}
      </div>
      {data.audit?.length ? (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-heading text-xl">Denetim kaydı</h3>
            <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => void load()}>
              Yenile
            </Button>
          </div>
          <ul className="mt-3 grid gap-2 text-sm">
            {data.audit.slice(0, 20).map((entry) => (
              <li key={entry.id} className="rounded-2xl bg-secondary px-3 py-2">
                <span className="text-foreground">{entry.action}</span>
                <span className="text-muted-foreground"> · {entry.actorRole === "admin" ? "yönetici" : "işletme"} · {entry.note}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
