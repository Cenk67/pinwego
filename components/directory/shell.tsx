"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bookmark, Compass, MessageCircle, Plus, Search } from "lucide-react"
import { Suspense, useEffect, useState, type ReactNode } from "react"
import { VisitBeacon } from "@/components/admin/visit-beacon"
import { GuestGateProvider } from "@/components/auth/guest-gate"
import { Assistant } from "@/components/directory/assistant"
import { Footer } from "@/components/directory/footer"
import { Header } from "@/components/directory/header"
import { MessageToast } from "@/components/messages/message-toast"
import { useAuth } from "@/lib/auth-context"
import { customerLoginPath } from "@/lib/auth-path"
import { withReturn } from "@/lib/auth-session"
import { useDirectory } from "@/lib/directory-context"
import { useMessages } from "@/lib/message-context"
import { useLocale } from "@/lib/use-locale"
import { cn } from "cn"

function BottomNav() {
  const pathname = usePathname()
  const { saved } = useDirectory()
  const { unread } = useMessages()
  const { t } = useLocale()
  const items = [
    { href: "/", label: t("nav.explore"), icon: Compass },
    { href: "/ara", label: t("nav.search"), icon: Search },
    { href: "/talep", label: t("nav.request"), icon: Plus },
    { href: "/mesajlar", label: t("nav.messages"), icon: MessageCircle, count: unread },
    { href: "/kaydedilenler", label: t("nav.saved"), icon: Bookmark, count: saved.length },
  ]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/10 bg-card/95 backdrop-blur print:hidden md:hidden">
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
                {item.count ? ` ${item.count}` : ""}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function EntryLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  const pathname = usePathname()
  const [target, setTarget] = useState(href)
  useEffect(() => {
    setTarget(withReturn(href, `${pathname}${window.location.search}`))
  }, [href, pathname])
  return (
    <Link href={target} className={className}>
      {children}
    </Link>
  )
}

function GuestBar() {
  const { account } = useAuth()
  const { t } = useLocale()
  if (account) return null
  return (
    <div className="border-b border-foreground/10 bg-primary/10 print:hidden">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6">
          <span className="font-medium">{t("guest.kicker")}.</span> {t("guest.bar")}
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <EntryLink
            href={customerLoginPath}
            className="inline-flex h-10 items-center justify-center rounded-full bg-card px-4 text-sm font-medium ring-1 ring-foreground/15"
          >
            {t("nav.login")}
          </EntryLink>
          <EntryLink
            href="/hesap?kayit=musteri"
            className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            {t("guest.register")}
          </EntryLink>
        </div>
      </div>
    </div>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { ready } = useAuth()
  const { t } = useLocale()
  useEffect(() => {
    if (window.location.hostname !== "www.pinwego.com") return
    const next = `https://pinwego.com${window.location.pathname}${window.location.search}${window.location.hash}`
    window.location.replace(next)
  }, [])
  const indexable = pathname === "/blog" || pathname.startsWith("/blog/") || pathname.startsWith("/isletme/") || pathname.startsWith("/q/") || pathname.startsWith("/kesif") || pathname.startsWith("/dogrula") || pathname.startsWith("/sifre") || pathname.startsWith("/onizleme")
  const card = pathname.startsWith("/q/")
  if (!ready && !indexable) {
    return (
      <div className="grid min-h-svh place-items-center px-4 text-sm text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <img src="/brand/mark.png" alt="" className="h-10 w-auto" />
          {t("shell.opening")}
        </div>
      </div>
    )
  }
  return (
    <GuestGateProvider>
      <Header />
      <GuestBar />
      <main className={card ? "flex-1" : "flex-1 pb-20 md:pb-0"}>{children}</main>
      <Footer />
      {card ? null : (
        <Suspense fallback={<div className="h-16 md:hidden" />}>
          <BottomNav />
        </Suspense>
      )}
      {card ? null : <Assistant />}
      <VisitBeacon />
      <MessageToast />
    </GuestGateProvider>
  )
}
