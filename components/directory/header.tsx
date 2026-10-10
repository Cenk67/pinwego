"use client"

import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import { PlaceButton } from "@/components/directory/place-picker"
import { useAuth } from "@/lib/auth-context"
import { useDirectory } from "@/lib/directory-context"
import { useMessages } from "@/lib/message-context"

export function Header() {
  const { saved } = useDirectory()
  const { account } = useAuth()
  const { unread } = useMessages()
  return (
    <header className="sticky top-0 z-40 border-b border-foreground/10 bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" aria-label="pinwego" className="flex shrink-0 items-center">
          <Logo />
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
          {account?.role === "isletme" || account?.role === "admin" ? (
            <Link href="/panel" className="hover:text-primary">
              İşletme paneli
            </Link>
          ) : null}
          {account ? (
            <Link href="/hesap" className="hover:text-primary">
              Hesap
            </Link>
          ) : (
            <Link href="/hesap" className="rounded-full bg-primary px-3 py-1.5 text-primary-foreground">
              Giriş
            </Link>
          )}
        </nav>
        <Link
          href={account?.role === "admin" ? "/yonetim" : "/hesap"}
          className="ml-auto text-sm hover:text-primary md:hidden"
        >
          {account?.role === "admin" ? "Yönetim" : account ? "Hesap" : "Giriş"}
        </Link>
        <PlaceButton compact className="md:ml-auto" />
      </div>
    </header>
  )
}
