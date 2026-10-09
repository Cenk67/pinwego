"use client"

import Link from "next/link"
import { PlaceButton } from "@/components/directory/place-picker"
import { useAuth } from "@/lib/auth-context"
import { useDirectory } from "@/lib/directory-context"
import { useMessages } from "@/lib/message-context"

export function Header() {
  const { saved } = useDirectory()
  const { account } = useAuth()
  const { unread } = useMessages()
  return (
    <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
              <circle cx="12" cy="9" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 12.5 V19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <span className="font-heading text-xl tracking-tight">pinwego</span>
        </Link>
        <nav className="ml-4 hidden items-center gap-5 text-sm md:flex">
          <Link href="/ara" className="hover:text-primary">
            Keşfet
          </Link>
          <Link href="/talep" className="hover:text-primary">
            Talep oluştur
          </Link>
          <Link href="/listele" className="hover:text-primary">
            İşletme ekle
          </Link>
          <Link href="/mesajlar" className="hover:text-primary">
            Mesajlar{unread ? ` (${unread})` : ""}
          </Link>
          <Link href="/kaydedilenler" className="hover:text-primary">
            Kayıtlı{saved.length ? ` (${saved.length})` : ""}
          </Link>
          {account?.role === "admin" ? (
            <Link href="/yonetim" className="hover:text-primary">
              Yönetim
            </Link>
          ) : null}
          {account ? (
            <Link href="/hesap" className="hover:text-primary">
              Hesap
            </Link>
          ) : (
            <Link href="/hesap?kayit=musteri" className="hover:text-primary">
              Müşteri kaydı
            </Link>
          )}
        </nav>
        <Link
          href={account?.role === "admin" ? "/yonetim" : account ? "/hesap" : "/hesap?kayit=musteri"}
          className="ml-auto text-sm hover:text-primary md:hidden"
        >
          {account?.role === "admin" ? "Yönetim" : account ? "Hesap" : "Misafir"}
        </Link>
        <PlaceButton compact className="md:ml-auto" />
      </div>
    </header>
  )
}
