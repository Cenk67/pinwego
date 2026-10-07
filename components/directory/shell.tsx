"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bookmark, Compass, Plus, Search, Sparkles } from "lucide-react"
import { Suspense, type ReactNode } from "react"
import { Assistant } from "@/components/directory/assistant"
import { Footer } from "@/components/directory/footer"
import { Header } from "@/components/directory/header"
import { useDirectory } from "@/lib/directory-context"
import { cn } from "cn"

function BottomNav() {
  const pathname = usePathname()
  const { saved, assistantOpen, setAssistantOpen } = useDirectory()
  const items = [
    { href: "/", label: "Keşfet", icon: Compass },
    { href: "/ara", label: "Ara", icon: Search },
    { href: "/talep", label: "Talep", icon: Plus },
    { href: "/kaydedilenler", label: "Kayıtlı", icon: Bookmark, count: saved.length },
  ]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/10 bg-background/95 backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.href
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
        <li>
          <button
            type="button"
            onClick={() => setAssistantOpen(!assistantOpen)}
            className={cn(
              "flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px]",
              assistantOpen ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Sparkles className="size-4" />
            Asistan
          </button>
        </li>
      </ul>
    </nav>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <Footer />
      <Suspense fallback={<div className="h-16 md:hidden" />}>
        <BottomNav />
      </Suspense>
      <Assistant />
    </>
  )
}
