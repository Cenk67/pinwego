"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bookmark, Compass, MessageCircle, Plus, Search } from "lucide-react"
import { Suspense, type ReactNode } from "react"
import { GuestGateProvider } from "@/components/auth/guest-gate"
import { Assistant } from "@/components/directory/assistant"
import { Footer } from "@/components/directory/footer"
import { Header } from "@/components/directory/header"
import { MessageToast } from "@/components/messages/message-toast"
import { useAuth } from "@/lib/auth-context"
import { useDirectory } from "@/lib/directory-context"
import { useMessages } from "@/lib/message-context"
import { cn } from "cn"

function BottomNav() {
  const pathname = usePathname()
  const { saved } = useDirectory()
  const { unread } = useMessages()
  const items = [
    { href: "/", label: "Keşfet", icon: Compass },
    { href: "/ara", label: "Ara", icon: Search },
    { href: "/talep", label: "Talep", icon: Plus },
    { href: "/mesajlar", label: "Mesaj", icon: MessageCircle, count: unread },
    { href: "/kaydedilenler", label: "Kayıtlı", icon: Bookmark, count: saved.length },
  ]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/10 bg-background/95 backdrop-blur md:hidden">
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

function GuestBar() {
  const { account } = useAuth()
  if (account) return null
  return (
    <div className="border-b border-foreground/10 bg-primary/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6">
          <span className="font-medium">Misafir.</span> Rehberi izleyebilirsin. İletişim bilgileri ve özellikler kapalı.
        </p>
        <Link
          href="/hesap?kayit=musteri"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Müşteri kaydı oluşturun
        </Link>
      </div>
    </div>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  const { ready } = useAuth()
  if (!ready) {
    return <div className="grid min-h-svh place-items-center px-4 text-sm text-muted-foreground">pinwego açılıyor</div>
  }
  return (
    <GuestGateProvider>
      <Header />
      <GuestBar />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <Footer />
      <Suspense fallback={<div className="h-16 md:hidden" />}>
        <BottomNav />
      </Suspense>
      <Assistant />
      <MessageToast />
    </GuestGateProvider>
  )
}
