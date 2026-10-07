import Link from "next/link";
import { Sparkles, MapPin, PlusCircle, Search } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0d0b24]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 text-xl font-black text-white shadow-lg shadow-fuchsia-500/30">
            R
          </span>
          <span className="leading-tight">
            <span className="block text-[17px] font-extrabold tracking-tight text-white">
              Rehber<span className="bg-gradient-to-r from-fuchsia-400 to-amber-300 bg-clip-text text-transparent">IQ</span>
            </span>
            <span className="hidden items-center gap-1 text-[11px] font-medium text-white/60 sm:flex">
              <Sparkles className="h-3 w-3" /> Yapay zekâlı firma rehberi
            </span>
          </span>
        </Link>
        <nav className="ml-4 hidden items-center gap-1 text-sm font-medium text-white/75 md:flex">
          <Link href="/kesfet" className="rounded-full px-3.5 py-2 hover:bg-white/10 hover:text-white">Keşfet</Link>
          <Link href="/teklif-al" className="rounded-full px-3.5 py-2 hover:bg-white/10 hover:text-white">Teklif Al</Link>
          <Link href="/isletme-ekle" className="rounded-full px-3.5 py-2 hover:bg-white/10 hover:text-white">İşletmeni Ekle</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/70 lg:flex">
            <MapPin className="h-3.5 w-3.5 text-emerald-300" /> İstanbul • Yakınımda
          </span>
          <Link href="/kesfet" className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-sm font-semibold text-white hover:bg-white/15 sm:flex">
            <Search className="h-4 w-4" /> Ara
          </Link>
          <Link href="/isletme-ekle" className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/30 hover:opacity-90">
            <PlusCircle className="h-4 w-4" /> <span className="hidden sm:inline">Ücretsiz Listele</span><span className="sm:hidden">Ekle</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const items = [
    { href: "/", label: "Ana Sayfa", icon: "🏠" },
    { href: "/kesfet", label: "Keşfet", icon: "🔍" },
    { href: "/teklif-al", label: "Teklif", icon: "📝" },
    { href: "/isletme-ekle", label: "Ekle", icon: "➕" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0d0b24]/95 backdrop-blur-xl md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="grid grid-cols-4">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold text-white/70 active:text-white">
            <span className="text-lg leading-none">{i.icon}</span>
            {i.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
