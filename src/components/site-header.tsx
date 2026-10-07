"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, Sparkles } from "lucide-react"
import { useState } from "react"
import { LuminaMark } from "@/components/logo"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/ara", label: "Keşfet" },
  { href: "/dizin", label: "Dizin" },
  { href: "/teklif", label: "Teklif al" },
  { href: "/asistan", label: "AI asistan" },
  { href: "/#features-synthesis", label: "20 Global Rehber" },
]

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [q, setQ] = useState("")
  const [open, setOpen] = useState(false)

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    const query = q.trim()
    router.push(query ? `/ara?q=${encodeURIComponent(query)}` : "/ara")
    setOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <LuminaMark className="size-8" />
          <span className="font-heading text-xl tracking-tight">Lumina</span>
        </Link>

        <form onSubmit={onSearch} className="hidden min-w-0 flex-1 md:block">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kadıköy’de teraslı restoran, acil tesisatçı, ihracat firması…"
            className="h-10 bg-card"
            aria-label="İşletme ara"
          />
        </form>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm",
                pathname === item.href
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/kayit"
          className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}
        >
          İşletmeni ekle
        </Link>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                aria-label="Menü"
              />
            }
          >
            <Menu />
          </SheetTrigger>
          <SheetContent side="right" className="w-[88vw] max-w-sm">
            <SheetHeader>
              <SheetTitle className="font-heading">Lumina</SheetTitle>
            </SheetHeader>
            <form onSubmit={onSearch} className="mt-4">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ne arıyorsun?"
                className="h-11"
              />
            </form>
            <div className="mt-6 flex flex-col gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-base hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/kayit"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-base hover:bg-muted"
              >
                Ücretsiz işletme kaydı
              </Link>
              <Link
                href="/asistan"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-primary-foreground"
              >
                <Sparkles className="size-4" />
                AI ile sor
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
