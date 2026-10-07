"use client"

import Link from "next/link"
import { cities } from "@/lib/catalog"
import { useDirectory } from "@/lib/directory-context"

export function Header() {
  const { city, setCity, saved } = useDirectory()
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
          <span className="font-heading text-xl tracking-tight">Pinora</span>
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
          <Link href="/kaydedilenler" className="hover:text-primary">
            Kayıtlı{saved.length ? ` (${saved.length})` : ""}
          </Link>
        </nav>
        <label className="ml-auto">
          <span className="sr-only">Şehir</span>
          <select
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="h-9 rounded-full bg-card px-3 text-sm ring-1 ring-foreground/10 outline-none"
          >
            {cities.map((item) => (
              <option key={item.name}>{item.name}</option>
            ))}
          </select>
        </label>
      </div>
    </header>
  )
}
