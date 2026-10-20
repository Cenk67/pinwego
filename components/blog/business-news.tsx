"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { fieldClass } from "@/components/directory/bits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { articlePath, publicArticles, type BlogAuditEntry, type BlogPost, type BlogStatus } from "@/lib/blog"
import { postsForBusiness, statusLabel, type DeskBusiness } from "@/lib/blog-desk"
import { useBlog } from "@/components/blog/blog-context"
import { scaleImageFile } from "@/lib/image-scale"

type DeskPayload = {
  ok?: boolean
  error?: string
  posts?: BlogPost[]
  audit?: BlogAuditEntry[]
  stats?: Partial<Record<BlogStatus, number>>
  businesses?: DeskBusiness[]
  post?: BlogPost
}

const emptyDraft = {
  id: "",
  businessId: "",
  title: "",
  description: "",
  body: "",
  image: "",
  imageAlt: "",
  tags: "",
}

export function BusinessNewsDesk() {
  const [data, setData] = useState<DeskPayload | null>(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let alive = true
    void fetch("/api/blog/yazi", { credentials: "include" })
      .then((response) => response.json())
      .then((body: DeskPayload) => {
        if (alive) setData(body)
      })
      .catch(() => {
        if (alive) setData({ ok: false, error: "Liste açılamadı." })
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
      const payload = (await response.json()) as DeskPayload
      setNotice(payload.ok ? "Kaydedildi." : payload.error || "Kaydedilemedi.")
      if (payload.ok) {
        setData(payload)
        setEditing(false)
      }
    } catch {
      setNotice("Kaydedilemedi.")
    } finally {
      setBusy(false)
    }
  }

  if (!data) return <p className="mt-8 text-sm text-muted-foreground">İşletme haberleri yükleniyor.</p>
  if (!data.ok) return <p className="mt-8 text-sm text-muted-foreground">{data.error || "İşletme haberleri açılamadı."}</p>

  const businesses = data.businesses ?? []
  const posts = data.posts ?? []
  const stats = data.stats ?? {}

  return (
    <section className="mt-10">
      <p className="text-sm font-medium text-primary">İşletme haberleri</p>
      <h2 className="mt-2 font-heading text-3xl">Kendi haberini yaz, pinwego onayından sonra yayınlansın.</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Taslak yalnızca sende durur. Onaya gönderilen yazı, yönetici onaylamadan pinwego blogunda ve işletme sayfanda görünmez.
        Yayındaki bir yazıyı değiştirirsen eski metin yayında kalır; yeni metin yeniden incelemeye girer.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {(["draft", "pending_review", "revision_requested", "published", "rejected"] as const).map((status) => (
          <span key={status} className="rounded-full bg-secondary px-3 py-1">
            {statusLabel[status]} · {stats[status] ?? 0}
          </span>
        ))}
      </div>
      {notice ? <p className="mt-4 text-sm text-primary">{notice}</p> : null}
      {editing ? (
        <form
          className="mt-5 grid gap-4 rounded-3xl bg-card p-5 ring-1 ring-foreground/10"
          onSubmit={(event) => {
            event.preventDefault()
            void send({ op: "save", post: draft })
          }}
        >
          <label className="grid gap-1 text-sm">
            İşletme
            <select className={fieldClass} value={draft.businessId} onChange={(event) => setDraft({ ...draft, businessId: event.target.value })}>
              {businesses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.hidden ? " (gizli)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Başlık
            <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="h-11" required />
          </label>
          <label className="grid gap-1 text-sm">
            Kısa açıklama
            <Textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="min-h-20" />
          </label>
          <label className="grid gap-1 text-sm">
            Yazı
            <Textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} className="min-h-48" />
          </label>
          <label className="grid gap-1 text-sm">
            Etiketler
            <Input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="yeni şube, menü" className="h-11" />
          </label>
          <div className="grid gap-4 md:grid-cols-[180px_1fr]">
            {draft.image ? (
              <img src={draft.image} alt={draft.imageAlt || ""} className="aspect-[16/10] w-full rounded-2xl object-cover" />
            ) : (
              <div className="grid aspect-[16/10] place-items-center rounded-2xl bg-secondary text-sm text-muted-foreground">Görsel yok</div>
            )}
            <div className="grid content-start gap-3">
              <label className="grid gap-1 text-sm">
                Kapak görseli
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="text-sm"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ""
                    if (!file) return
                    void scaleImageFile(file)
                      .then((scaled) => setDraft((current) => ({ ...current, image: scaled.dataUrl })))
                      .catch((reason: unknown) => setNotice(reason instanceof Error ? reason.message : "Görsel alınamadı."))
                  }}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Görsel alt metni
                <Input value={draft.imageAlt} onChange={(event) => setDraft({ ...draft, imageAlt: event.target.value })} className="h-11" />
              </label>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="h-11 rounded-xl" disabled={busy || !businesses.length}>
              Taslak kaydet
            </Button>
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setEditing(false)}>
              Vazgeç
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          className="mt-5 h-11 rounded-xl"
          disabled={!businesses.length}
          onClick={() => {
            setDraft({ ...emptyDraft, businessId: businesses[0]?.id ?? "" })
            setEditing(true)
            setNotice("")
          }}
        >
          Yazı oluştur
        </Button>
      )}
      {!businesses.length ? <p className="mt-3 text-sm text-muted-foreground">Haber yazmak için sana bağlı bir işletme kaydı gerekir.</p> : null}
      <div className="mt-5 grid gap-3">
        {posts.map((post) => (
          <article key={post.id} className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
            <p className="text-xs text-primary">
              {post.businessName} · {statusLabel[post.status ?? "draft"]}
              {post.live ? " · yayındaki sürüm duruyor" : ""}
            </p>
            <h3 className="mt-1 font-heading text-xl">{post.title || "Başlıksız taslak"}</h3>
            {post.reviewNote ? <p className="mt-2 text-sm leading-6 text-muted-foreground">Not: {post.reviewNote}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl"
                onClick={() => {
                  setDraft({
                    id: post.id,
                    businessId: post.businessId ?? "",
                    title: post.title,
                    description: post.description,
                    body: post.body,
                    image: post.image,
                    imageAlt: post.imageAlt,
                    tags: (post.tags ?? []).join(", "),
                  })
                  setEditing(true)
                }}
              >
                Düzenle
              </Button>
              {post.status === "draft" || post.status === "revision_requested" || post.status === "rejected" ? (
                <Button type="button" className="h-9 rounded-xl" disabled={busy} onClick={() => void send({ op: "submit", id: post.id })}>
                  Onaya gönder
                </Button>
              ) : null}
              {post.status === "pending_review" ? (
                <Button type="button" variant="outline" className="h-9 rounded-xl" disabled={busy} onClick={() => void send({ op: "withdraw", id: post.id })}>
                  Geri çek
                </Button>
              ) : null}
              {post.status === "published" || post.status === "approved" ? (
                <Button type="button" variant="outline" className="h-9 rounded-xl" disabled={busy} onClick={() => void send({ op: "archive", id: post.id })}>
                  Yayından kaldır
                </Button>
              ) : null}
              {post.status === "draft" || post.status === "rejected" || post.status === "archived" || post.status === "revision_requested" ? (
                <Button type="button" variant="outline" className="h-9 rounded-xl" disabled={busy} onClick={() => void send({ op: "remove", id: post.id })}>
                  Sil
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {data.audit?.length ? (
        <div className="mt-6">
          <h3 className="font-heading text-xl">İşlem geçmişi</h3>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
            {data.audit.slice(0, 8).map((entry) => (
              <li key={entry.id}>
                {entry.action} · {entry.note}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

export function BusinessNewsStrip({ businessId, businessSlug }: { businessId: string; businessSlug: string }) {
  const { document } = useBlog()
  const articles = postsForBusiness(publicArticles(document), { id: businessId, slug: businessSlug })
  if (!articles.length) return null
  return (
    <section className="mt-10">
      <h2 className="font-heading text-3xl">İşletmeden haberler</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {articles.slice(0, 6).map((article) => (
          <Link key={article.id} href={articlePath(article)} className="overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10">
            {article.image ? <img src={article.image} alt="" className="aspect-[16/10] w-full object-cover" /> : null}
            <div className="p-4">
              <h3 className="font-heading text-xl leading-tight">{article.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{article.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
