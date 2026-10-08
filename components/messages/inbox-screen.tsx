"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Bell, Building2, MessageCircle, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { categoryById } from "@/lib/catalog"
import { useAuth } from "@/lib/auth-context"
import { useDirectory } from "@/lib/directory-context"
import { fold } from "@/lib/format"
import { useMessages } from "@/lib/message-context"
import { ownsListing } from "@/lib/message-store"
import { canNotify, requestNotifyPermission } from "@/lib/notify"
import type { Business, ChatThread } from "@/lib/types"
import { cn } from "cn"

function formatChatTime(iso: string) {
  if (!iso) return ""
  const date = new Date(iso)
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
  return date.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

function peerLabel(thread: ChatThread, accountId: string) {
  if (thread.lastFromId && thread.lastFromId !== accountId && thread.lastText) {
    return thread.listingName
  }
  return thread.listingName
}

function BusinessPicker({
  query,
  onQuery,
  businesses,
  onPick,
  autoFocus = false,
}: {
  query: string
  onQuery: (value: string) => void
  businesses: Business[]
  onPick: (business: Business) => void
  autoFocus?: boolean
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-foreground/10 px-4 py-3">
        <p className="font-medium">İşletme seç ve yaz</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Rehberdeki işletmeyi ara, seç, doğrudan mesajını yaz. Profil sayfasına gitmen gerekmez.
        </p>
        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="İşletme, sektör veya ilçe ara"
            className="h-11 rounded-xl pl-9"
            autoFocus={autoFocus}
          />
        </label>
      </div>
      <div className="flex-1 overflow-y-auto">
        {businesses.length ? (
          <ul>
            {businesses.map((business) => {
              const category = categoryById(business.category)
              const place = [business.district, business.city].filter(Boolean).join(", ")
              return (
                <li key={business.id}>
                  <button
                    type="button"
                    onClick={() => onPick(business)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-secondary/70"
                  >
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-secondary">
                      <Building2 className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{business.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {category.label} · {place}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="px-4 py-10 text-sm leading-6 text-muted-foreground">
            {query.trim()
              ? "Bu aramaya uyan işletme yok. Adı, semti veya sektörü değiştir."
              : "Gösterilecek işletme kalmadı. Rehberde kayıt görünür olduğunda burada listelenir."}
          </p>
        )}
      </div>
    </div>
  )
}

export function InboxScreen() {
  const params = useSearchParams()
  const router = useRouter()
  const { account } = useAuth()
  const { visibleBusinesses } = useDirectory()
  const { threads, unread, messagesFor, unreadIn, send, markRead, openWithBusiness } = useMessages()
  const [draft, setDraft] = useState("")
  const [query, setQuery] = useState("")
  const [picking, setPicking] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    canNotify() ? Notification.permission : "unsupported",
  )
  const endRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const pendingFocus = useRef(false)
  const wanted = params.get("konusma")

  const active = picking ? null : (threads.find((item) => item.id === wanted) ?? null)
  const messages = active ? messagesFor(active.id) : []

  const candidates = useMemo(() => {
    if (!account) return []
    const needle = fold(query)
    return visibleBusinesses
      .filter((item) => !ownsListing(account, item))
      .filter((item) => {
        if (!needle) return true
        const hay = fold(
          [item.name, item.city, item.district, item.address, item.subcategory, categoryById(item.category).label].join(" "),
        )
        return hay.includes(needle)
      })
      .slice(0, 40)
  }, [account, query, visibleBusinesses])

  useEffect(() => {
    if (active) markRead(active.id)
  }, [active, messages.length, markRead])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [messages.length, active?.id])

  useEffect(() => {
    if (!active || !pendingFocus.current) return
    pendingFocus.current = false
    composerRef.current?.focus()
  }, [active])

  const list = useMemo(() => threads, [threads])

  async function enableNotify() {
    const next = await requestNotifyPermission()
    setPermission(next)
  }

  function startNew() {
    setDraft("")
    setQuery("")
    setPicking(true)
    router.replace("/mesajlar")
  }

  function pickBusiness(business: Business) {
    const thread = openWithBusiness(business)
    if (!thread) return
    pendingFocus.current = true
    setPicking(false)
    setQuery("")
    router.replace(`/mesajlar?konusma=${encodeURIComponent(thread.id)}`)
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!active) return
    const business = visibleBusinesses.find((item) => item.id === active.listingId)
    const sent = send(active.id, draft, business)
    if (sent) setDraft("")
  }

  if (!account) return null

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">Mesajlar</p>
          <h1 className="mt-1 font-heading text-4xl">Sohbet</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            İşletmeyi buradan seç, doğrudan yaz. Müşteri işletmeyle, işletme de başka işletmeyle konuşur.
            Gelen mesajda tarayıcı bildirimi ve ekran uyarısı çıkar.
          </p>
        </div>
        {permission === "default" ? (
          <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={enableNotify}>
            <Bell className="size-4" />
            Bildirimleri aç
          </Button>
        ) : permission === "granted" ? (
          <p className="text-sm text-muted-foreground">Tarayıcı bildirimleri açık.</p>
        ) : null}
      </div>
      <div className="mt-6 grid h-[min(42rem,72vh)] overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className={cn("min-h-0 overflow-y-auto border-b border-foreground/10 lg:border-r lg:border-b-0", active || picking ? "hidden lg:block" : "block")}>
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Konuşmalar</p>
              {unread ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{unread}</span> : null}
            </div>
            <Button type="button" size="sm" className="h-8 rounded-lg" onClick={startNew}>
              <Plus className="size-3.5" />
              Yeni
            </Button>
          </div>
          {list.length ? (
            <ul>
              {list.map((thread) => {
                const count = unreadIn(thread.id)
                const selected = active?.id === thread.id
                return (
                  <li key={thread.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPicking(false)
                        router.replace(`/mesajlar?konusma=${encodeURIComponent(thread.id)}`)
                      }}
                      className={cn(
                        "w-full px-4 py-3 text-left",
                        selected ? "bg-primary/10" : "hover:bg-secondary/70",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">{peerLabel(thread, account.id)}</p>
                        <span className="text-[11px] text-muted-foreground">{formatChatTime(thread.updatedAt)}</span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {thread.kind === "isletme-isletme" ? "İşletme · " : "Müşteri · "}
                        {thread.lastText || "Henüz mesaj yok"}
                      </p>
                      {count ? (
                        <span className="mt-1 inline-flex rounded-full bg-primary px-2 py-0.5 text-[11px] text-primary-foreground">
                          {count} yeni
                        </span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="px-4 py-10 text-sm leading-6 text-muted-foreground">
              <MessageCircle className="mb-2 size-5" />
              Henüz konuşma yok. Sağdan veya Yeni ile işletme seçip hemen yaz.
            </div>
          )}
        </aside>

        <section className={cn("flex min-h-0 flex-col", active || picking ? "flex" : "hidden lg:flex")}>
          {active ? (
            <>
              <div className="flex items-center gap-2 border-b border-foreground/10 px-4 py-3">
                <button
                  type="button"
                  className="grid size-9 place-items-center rounded-full hover:bg-secondary lg:hidden"
                  onClick={() => router.replace("/mesajlar")}
                  aria-label="Konuşmalara dön"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{active.listingName}</p>
                  <p className="text-xs text-muted-foreground">
                    {active.kind === "isletme-isletme" ? "İşletme–işletme sohbeti" : "Müşteri–işletme sohbeti"}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="hidden h-8 rounded-lg lg:inline-flex" onClick={startNew}>
                  <Plus className="size-3.5" />
                  Başka işletme
                </Button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.length ? (
                  messages.map((item) => {
                    const mine = item.fromId === account.id
                    return (
                      <div key={item.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6",
                            mine ? "bg-primary text-primary-foreground" : "bg-secondary",
                          )}
                        >
                          {!mine ? <p className="text-[11px] opacity-80">{item.fromName}</p> : null}
                          <p>{item.text}</p>
                          <p className={cn("mt-1 text-[11px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                            {formatChatTime(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">İlk mesajı yaz. Karşı taraf giriş yaptığında bildirilir.</p>
                )}
                <div ref={endRef} />
              </div>
              <form onSubmit={submit} className="border-t border-foreground/10 p-3">
                <Textarea
                  ref={composerRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={`${active.listingName} için mesajını yaz`}
                  className="min-h-20"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault()
                      submit(event)
                    }
                  }}
                />
                <Button type="submit" className="mt-2 h-10 rounded-xl" disabled={!draft.trim()}>
                  Gönder
                </Button>
              </form>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center gap-2 border-b border-foreground/10 px-4 py-3 lg:hidden">
                <button
                  type="button"
                  className="grid size-9 place-items-center rounded-full hover:bg-secondary"
                  onClick={() => setPicking(false)}
                  aria-label="Konuşmalara dön"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <p className="font-medium">Yeni mesaj</p>
              </div>
              <BusinessPicker
                query={query}
                onQuery={setQuery}
                businesses={candidates}
                onPick={pickBusiness}
                autoFocus={picking}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
