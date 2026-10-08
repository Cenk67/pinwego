"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Bell, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { useDirectory } from "@/lib/directory-context"
import { useMessages } from "@/lib/message-context"
import { canNotify, requestNotifyPermission } from "@/lib/notify"
import type { ChatThread } from "@/lib/types"
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

export function InboxScreen() {
  const params = useSearchParams()
  const router = useRouter()
  const { account } = useAuth()
  const { visibleBusinesses } = useDirectory()
  const { threads, unread, messagesFor, unreadIn, send, markRead } = useMessages()
  const [draft, setDraft] = useState("")
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    canNotify() ? Notification.permission : "unsupported",
  )
  const endRef = useRef<HTMLDivElement>(null)
  const wanted = params.get("konusma")

  const active = threads.find((item) => item.id === wanted) ?? null
  const messages = active ? messagesFor(active.id) : []

  useEffect(() => {
    if (active) markRead(active.id)
  }, [active, messages.length, markRead])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [messages.length, active?.id])

  const list = useMemo(() => threads, [threads])

  async function enableNotify() {
    const next = await requestNotifyPermission()
    setPermission(next)
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
            Müşteri işletmeyle, işletme de başka işletmeyle yazar. Gelen mesajda tarayıcı bildirimi ve ekran
            uyarısı çıkar. İki hesap için iki sekme açıp ayrı giriş yapabilirsin.
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
      <div className="mt-6 grid overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className={cn("border-b border-foreground/10 lg:border-r lg:border-b-0", active ? "hidden lg:block" : "block")}>
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-medium">Konuşmalar</p>
            {unread ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{unread}</span> : null}
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
                      onClick={() => router.replace(`/mesajlar?konusma=${encodeURIComponent(thread.id)}`)}
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
              Henüz konuşma yok. Bir işletme kaydından Mesaj gönder dersen sohbet burada açılır.
            </div>
          )}
        </aside>

        <section className={cn("flex min-h-[28rem] flex-col", active ? "flex" : "hidden lg:flex")}>
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
                <div>
                  <p className="font-medium">{active.listingName}</p>
                  <p className="text-xs text-muted-foreground">
                    {active.kind === "isletme-isletme" ? "İşletme–işletme sohbeti" : "Müşteri–işletme sohbeti"}
                  </p>
                </div>
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
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Mesajını yaz"
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
            <div className="grid flex-1 place-items-center px-6 text-center text-sm text-muted-foreground">
              Soldan bir konuşma seç ya da bir işletme profilinden mesaj başlat.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
