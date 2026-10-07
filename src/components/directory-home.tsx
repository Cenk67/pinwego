"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight, BadgeCheck, Building2, Car, ChevronDown, Clock3, Heart,
  Home as HomeIcon, MapPin, Menu, MessageCircle, Search, ShieldCheck,
  Sparkles, Star, Stethoscope, Utensils, WandSparkles, Wrench, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const categories = [
  { name: "Restoran", icon: Utensils, count: "12.4B" },
  { name: "Ev Hizmetleri", icon: HomeIcon, count: "8.7B" },
  { name: "Sağlık", icon: Stethoscope, count: "6.2B" },
  { name: "Otomotiv", icon: Car, count: "4.9B" },
  { name: "Profesyonel", icon: Building2, count: "9.1B" },
  { name: "Tamir & Bakım", icon: Wrench, count: "5.8B" },
];

const businesses = [
  { name: "Minoa Kitchen", category: "Restoran", rating: 4.9, reviews: 326, distance: "0,8 km", area: "Beşiktaş, İstanbul", tag: "Akdeniz mutfağı", initials: "MK", color: "bg-[#ffd45c]", open: true, ai: "Sakin atmosferi ve paylaşmalık tabaklarıyla öne çıkıyor." },
  { name: "Ardıç Mimarlık", category: "Profesyonel", rating: 4.8, reviews: 184, distance: "1,2 km", area: "Şişli, İstanbul", tag: "İç mimari & tasarım", initials: "AM", color: "bg-[#ff8364]", open: true, ai: "Son projelerde teslim tarihine uyum oranı %96." },
  { name: "Nova Dental Studio", category: "Sağlık", rating: 4.9, reviews: 512, distance: "2,1 km", area: "Kadıköy, İstanbul", tag: "Diş kliniği", initials: "ND", color: "bg-[#a8d8ff]", open: true, ai: "Şeffaf fiyatlandırması en çok beğenilen özelliği." },
  { name: "UstaYanımda", category: "Tamir & Bakım", rating: 4.7, reviews: 268, distance: "3,4 km", area: "Üsküdar, İstanbul", tag: "Tadilat & onarım", initials: "UY", color: "bg-[#b8e0c4]", open: false, ai: "Acil taleplere ortalama 18 dakikada dönüş yapıyor." },
];

export default function DirectoryHome() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("İstanbul");
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [saved, setSaved] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aiText, setAiText] = useState("");

  const filtered = useMemo(() => {
    const term = query.toLocaleLowerCase("tr");
    return businesses.filter((business) =>
      (selectedCategory === "Tümü" || business.category === selectedCategory) &&
      (business.name.toLocaleLowerCase("tr").includes(term) ||
        business.tag.toLocaleLowerCase("tr").includes(term) ||
        business.category.toLocaleLowerCase("tr").includes(term)),
    );
  }, [query, selectedCategory]);

  function runAiSearch() {
    setAiText(query.trim()
      ? `“${query}” için yorum kalitesi, mesafe ve güncelliği karşılaştırdım. En güçlü ${filtered.length || 3} eşleşme aşağıda.`
      : "Yakınındaki en yüksek puanlı ve şu anda açık işletmeleri senin için sıraladım.");
  }

  function toggleSaved(name: string) {
    setSaved((current) => current.includes(name)
      ? current.filter((item) => item !== name)
      : [...current, name]);
  }

  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#132f2b]">
      <header className="sticky top-0 z-50 border-b border-[#173f38]/10 bg-[#f7f5ef]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
          <a href="#" className="flex items-center gap-2.5" aria-label="Pusula ana sayfa">
            <span className="grid size-9 place-items-center rounded-xl bg-[#173f38] text-[#ffe06d]"><Sparkles className="size-5" /></span>
            <span className="text-xl font-extrabold tracking-[-0.04em]">pusula</span>
          </a>
          <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
            <a href="#kesfet" className="transition hover:text-[#ef604b]">Keşfet</a>
            <a href="#kategoriler" className="transition hover:text-[#ef604b]">Kategoriler</a>
            <a href="#nasil" className="transition hover:text-[#ef604b]">Nasıl çalışır?</a>
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" className="rounded-full">Giriş yap</Button>
            <Button className="rounded-full bg-[#173f38] px-5 text-white hover:bg-[#24564d]">İşletmeni ekle</Button>
          </div>
          <button className="rounded-lg p-2 md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menüyü aç">
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
        {mobileOpen && (
          <div className="border-t border-[#173f38]/10 bg-[#f7f5ef] p-5 md:hidden">
            <nav className="flex flex-col gap-4 font-semibold">
              <a href="#kesfet" onClick={() => setMobileOpen(false)}>Keşfet</a>
              <a href="#kategoriler" onClick={() => setMobileOpen(false)}>Kategoriler</a>
              <a href="#nasil" onClick={() => setMobileOpen(false)}>Nasıl çalışır?</a>
              <Button className="mt-2 bg-[#173f38]">İşletmeni ekle</Button>
            </nav>
          </div>
        )}
      </header>

      <section className="relative overflow-hidden px-5 pb-14 pt-14 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="pointer-events-none absolute -right-28 top-10 size-96 rounded-full bg-[#f7a496]/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-40 bottom-0 size-96 rounded-full bg-[#ffe06d]/35 blur-3xl" />
        <div className="relative mx-auto max-w-5xl text-center">
          <Badge className="mb-6 rounded-full border border-[#173f38]/15 bg-white/70 px-3 py-1.5 text-[#173f38] shadow-none">
            <WandSparkles className="mr-1 size-3.5 text-[#ef604b]" /> Yapay zekâ destekli yerel keşif
          </Badge>
          <h1 className="mx-auto max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-[78px]">
            Aradığın hizmeti bul.
            <span className="block font-serif font-medium italic text-[#ef604b]">Doğru seçim yap.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#45625d] sm:text-lg">
            Milyonlarca işletme, doğrulanmış yorumlar ve akıllı öneriler. İhtiyacını anlat, Pusula senin için en iyisini bulsun.
          </p>
          <div className="mx-auto mt-9 max-w-4xl rounded-[26px] border border-[#173f38]/10 bg-white p-2.5 shadow-[0_20px_70px_rgba(23,63,56,0.13)]">
            <div className="flex flex-col gap-2 md:flex-row">
              <label className="flex min-h-14 flex-1 items-center gap-3 rounded-2xl px-4 focus-within:bg-[#f7f5ef]">
                <Search className="size-5 shrink-0 text-[#ef604b]" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runAiSearch()}
                  className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-[#6f8581]" placeholder="Ne arıyorsun? Örn. iyi bir diş hekimi" />
              </label>
              <div className="hidden w-px bg-[#173f38]/10 md:block" />
              <label className="flex min-h-14 items-center gap-3 rounded-2xl px-4 md:w-48">
                <MapPin className="size-5 shrink-0 text-[#ef604b]" />
                <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-transparent text-sm font-semibold outline-none" aria-label="Konum" />
                <ChevronDown className="size-4 text-[#78908c]" />
              </label>
              <Button onClick={runAiSearch} className="min-h-14 rounded-2xl bg-[#173f38] px-7 font-bold text-white hover:bg-[#24564d]">
                <Sparkles className="size-4" /> Akıllı ara
              </Button>
            </div>
          </div>
          {aiText && <div className="mx-auto mt-4 flex max-w-3xl items-start gap-2 rounded-2xl border border-[#173f38]/10 bg-white/70 px-4 py-3 text-left text-sm text-[#45625d]">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-[#ef604b]" /><span>{aiText}</span>
          </div>}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-[#5b746f]">
            <span className="font-semibold">Popüler:</span>
            {["Kahvaltı", "Temizlik", "Diş hekimi", "Oto servis"].map((item) => (
              <button key={item} onClick={() => { setQuery(item); setSelectedCategory("Tümü"); }}
                className="rounded-full border border-[#173f38]/10 bg-white/60 px-3 py-1.5 transition hover:border-[#ef604b] hover:text-[#ef604b]">{item}</button>
            ))}
          </div>
        </div>
      </section>

      <section id="kategoriler" className="border-y border-[#173f38]/10 bg-white px-5 py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex items-end justify-between">
            <div>
              <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#ef604b]">Her ihtiyaca bir adres</p>
              <h2 className="text-3xl font-black tracking-[-0.04em]">Kategorileri keşfet</h2>
            </div>
            <button className="hidden items-center gap-1 text-sm font-bold sm:flex">Tümünü gör <ArrowRight className="size-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {categories.map(({ name, icon: Icon, count }) => (
              <button key={name} onClick={() => setSelectedCategory(selectedCategory === name ? "Tümü" : name)}
                className={`group rounded-2xl border p-4 text-left transition-all hover:-translate-y-1 hover:shadow-lg ${selectedCategory === name ? "border-[#173f38] bg-[#173f38] text-white" : "border-[#173f38]/10 bg-[#faf9f5] hover:border-[#173f38]/30"}`}>
                <span className={`mb-6 grid size-10 place-items-center rounded-xl ${selectedCategory === name ? "bg-white/15" : "bg-white"}`}><Icon className="size-5" /></span>
                <span className="block text-sm font-extrabold">{name}</span>
                <span className={`mt-1 block text-xs ${selectedCategory === name ? "text-white/60" : "text-[#6f8581]"}`}>{count} işletme</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="kesfet" className="px-5 py-14 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#ef604b]">Sana özel seçkiler</p>
              <h2 className="text-3xl font-black tracking-[-0.04em]">{selectedCategory === "Tümü" ? `${location}’da öne çıkanlar` : selectedCategory}</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {["Tümü", "En yüksek puan", "Şimdi açık", "Yakınımda"].map((item) => (
                <button key={item} onClick={() => item === "Tümü" && setSelectedCategory("Tümü")}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold ${item === "Tümü" ? "border-[#173f38] bg-[#173f38] text-white" : "border-[#173f38]/15 bg-white"}`}>{item}</button>
              ))}
            </div>
          </div>
          {filtered.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((business) => (
                <article key={business.name} className="group rounded-[26px] border border-[#173f38]/10 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(23,63,56,0.1)] sm:p-5">
                  <div className="flex gap-4">
                    <div className={`grid size-20 shrink-0 place-items-center rounded-2xl ${business.color} text-xl font-black tracking-[-0.05em] sm:size-24`}>{business.initials}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5"><h3 className="truncate text-lg font-black tracking-tight">{business.name}</h3><BadgeCheck className="size-4 shrink-0 fill-[#2f9c87] text-white" /></div>
                          <p className="mt-0.5 text-xs text-[#607873]">{business.tag}</p>
                        </div>
                        <button onClick={() => toggleSaved(business.name)} className="grid size-9 shrink-0 place-items-center rounded-full border border-[#173f38]/10 transition hover:bg-[#fff0ed]" aria-label="Favorilere ekle">
                          <Heart className={`size-4 ${saved.includes(business.name) ? "fill-[#ef604b] text-[#ef604b]" : ""}`} />
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="flex items-center gap-1 font-black"><Star className="size-3.5 fill-[#ffbf3f] text-[#ffbf3f]" />{business.rating}<span className="font-medium text-[#78908c]">({business.reviews})</span></span>
                        <span className="text-[#78908c]">•</span><span className="text-[#607873]">{business.distance}</span>
                        <span className={`font-bold ${business.open ? "text-[#23806e]" : "text-[#c25a48]"}`}>{business.open ? "Açık" : "Kapalı"}</span>
                      </div>
                      <p className="mt-2 flex items-center gap-1 text-xs text-[#607873]"><MapPin className="size-3.5" /> {business.area}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#f7f5ef] px-3 py-2.5 text-xs leading-5 text-[#506a65]">
                    <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[#ef604b]" /><span><strong className="text-[#173f38]">Pusula özeti:</strong> {business.ai}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[#607873]"><Clock3 className="size-3.5" /> Bugün uygun</span>
                    <Button size="sm" className="rounded-full bg-[#173f38] px-4 text-xs">Profili gör</Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-[#173f38]/20 bg-white px-6 py-16 text-center">
              <Search className="mx-auto mb-4 size-8 text-[#78908c]" /><h3 className="font-black">Bu aramayla eşleşen işletme bulamadık</h3>
              <p className="mt-2 text-sm text-[#607873]">Farklı bir kelime veya kategori deneyebilirsin.</p>
              <Button variant="outline" className="mt-5 rounded-full" onClick={() => { setQuery(""); setSelectedCategory("Tümü"); }}>Filtreleri temizle</Button>
            </div>
          )}
        </div>
      </section>

      <section id="nasil" className="px-5 pb-16 lg:px-8 lg:pb-24">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-[#173f38] px-6 py-10 text-white sm:px-10 lg:flex lg:items-center lg:justify-between lg:px-14 lg:py-14">
          <div className="max-w-xl">
            <Badge className="mb-5 bg-[#ffe06d] text-[#173f38]">Pusula Güvencesi</Badge>
            <h2 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">Karar vermek artık daha kolay.</h2>
            <p className="mt-4 leading-7 text-white/70">Yapay zekâ binlerce yorumu senin için okur, güven sinyallerini karşılaştırır ve ihtiyacına en uygun seçenekleri açıklar.</p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:mt-0 lg:w-[48%]">
            {[
              { icon: ShieldCheck, title: "Doğrulanmış", text: "Güncel işletme verisi" },
              { icon: MessageCircle, title: "Gerçek yorumlar", text: "Topluluk deneyimi" },
              { icon: Sparkles, title: "Akıllı eşleşme", text: "Sana özel öneriler" },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl bg-white/8 p-4">
                <Icon className="mb-7 size-5 text-[#ffe06d]" /><p className="text-sm font-black">{title}</p><p className="mt-1 text-xs leading-5 text-white/55">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#173f38]/10 px-5 py-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs text-[#607873] sm:flex-row">
          <div className="flex items-center gap-2 font-black text-[#173f38]"><span className="grid size-7 place-items-center rounded-lg bg-[#173f38] text-[#ffe06d]"><Sparkles className="size-3.5" /></span>pusula</div>
          <p>© 2026 Pusula. İyi işletmeler, doğru seçimler.</p>
          <div className="flex gap-5"><a href="#">Gizlilik</a><a href="#">Koşullar</a><a href="#">Yardım</a></div>
        </div>
      </footer>
    </main>
  );
}
