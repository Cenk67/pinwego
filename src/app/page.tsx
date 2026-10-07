"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Sparkles, MapPin, ShieldCheck, CalendarCheck, FileText, Star, ArrowRight, Navigation } from "lucide-react";
import { BUSINESSES, CATEGORIES, POPULAR_SEARCHES } from "@/data/businesses";
import { aiSearch } from "@/lib/ai";
import { BusinessCard } from "@/components/BusinessCard";
import { AICopilot } from "@/components/AICopilot";
import { Stars } from "@/components/Stars";
import { DirectorySynthesisSection } from "@/components/DirectorySynthesisSection";

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [nearMe, setNearMe] = useState(true);

  const featured = useMemo(() => [...BUSINESSES].sort((a, b) => b.rating * b.reviewCount - a.rating * a.reviewCount).slice(0, 6), []);
  const premium = BUSINESSES.filter((b) => b.premium);

  const go = (text: string) => {
    const query = nearMe && !/yakınım/i.test(text) ? `${text} yakınımda` : text;
    router.push(`/kesfet?q=${encodeURIComponent(query || "restoran")}`);
  };

  return (
    <main>
      {/* HERO */}
      <section className="hero-grid bg-[#0d0b24] px-4 pb-10 pt-8 sm:pt-12">
        <div className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Yelp + Booksy + Thumbtack + Tripadvisor tek platformda
            </span>
            <h1 className="mt-4 text-3xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl">
              Arama değil, <span className="bg-gradient-to-r from-fuchsia-400 via-pink-300 to-amber-300 bg-clip-text text-transparent">doğru eşleşme.</span>
              <br />Yapay zekâ rehberiniz hazır.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
              20 küresel rehberin en iyi özellikleri: yorum + fotoğraf + randevu + teklif + B2B veri. İhtiyacınızı cümleyle yazın, yapay zekâ size en uygun işletmeyi eşleşme skoruyla bulsun.
            </p>

            <form
              onSubmit={(e) => { e.preventDefault(); go(q); }}
              className="mt-5 flex flex-col gap-2 rounded-3xl border border-white/15 bg-white p-2 shadow-2xl sm:flex-row sm:items-center sm:rounded-full"
            >
              <div className="flex flex-1 items-center gap-2 px-3 py-2">
                <Search className="h-5 w-5 shrink-0 text-violet-600" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Ne arıyorsunuz? Örn: pazar açık kuaför…"
                  className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNearMe(!nearMe)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-xs font-bold transition ${nearMe ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                >
                  <Navigation className="h-3.5 w-3.5" /> Yakınımda {nearMe ? "açık" : "kapalı"}
                </button>
                <button className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-700">Bul</button>
              </div>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((p) => (
                <button key={p} onClick={() => go(p)} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/15">
                  {p}
                </button>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { icon: <ShieldCheck className="h-4 w-4" />, t: "Onaylı işletme", d: "Kimlik + vergi doğrulamalı" },
                { icon: <CalendarCheck className="h-4 w-4" />, t: "Anında randevu", d: "Booksy tarzı canlı takvim" },
                { icon: <FileText className="h-4 w-4" />, t: "3 teklif karşılaştır", d: "Thumbtack tarzı eşleşme" },
              ].map((f) => (
                <div key={f.t} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <span className="text-fuchsia-300">{f.icon}</span>
                  <p className="mt-1.5 text-xs font-extrabold text-white sm:text-sm">{f.t}</p>
                  <p className="text-[11px] text-white/55">{f.d}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <AICopilot onResults={(qq) => go(qq)} />
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {["restoran", "guzellik", "ev-hizmet", "saglik"].map((k) => {
                const c = CATEGORIES.find((x) => x.slug === k)!;
                return (
                  <Link key={k} href={`/kesfet?k=${k}`} className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15">
                    <span>{c.icon}</span> {c.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mx-auto mt-8 grid max-w-6xl grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { n: "16", u: "işletme profili", d: "doğrulanmış kayıt" },
            { n: "21K+", u: "kullanıcı yorumu", d: "yapay zekâ ile özetlenir" },
            { n: "%94", u: "eşleşme memnuniyeti", d: "randevu sonrası puan" },
            { n: "12", u: "kategori", d: "B2B + B2C kapsama" },
          ].map((s) => (
            <div key={s.u} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
              <p className="text-2xl font-black text-white">{s.n}</p>
              <p className="text-xs font-bold text-white/85">{s.u}</p>
              <p className="text-[11px] text-white/50">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Kategorilere göz atın</h2>
            <p className="text-sm text-slate-500">Yellow Pages geleneği + Loc8NearMe tarzı yakınlık araması</p>
          </div>
          <Link href="/kesfet" className="flex items-center gap-1 text-sm font-bold text-violet-700">Tümü <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/kesfet?k=${c.slug}`} className={`group rounded-3xl bg-gradient-to-br ${c.color} p-4 text-white shadow-lg transition hover:-translate-y-1`}>
              <span className="text-3xl">{c.icon}</span>
              <p className="mt-3 text-sm font-extrabold leading-tight">{c.label}</p>
              <p className="mt-1 text-[11px] text-white/80">{c.count.toLocaleString("tr")} işletme</p>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="border-y border-slate-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-black text-slate-900 sm:text-2xl"><Star className="h-5 w-5 fill-amber-400 text-amber-400" /> Yapay zekânın bu haftaki önerileri</h2>
              <p className="text-sm text-slate-500">Puan + yorum hacmi + yakınlık skoruna göre seçildi</p>
            </div>
            <Link href="/kesfet" className="hidden items-center gap-1 text-sm font-bold text-violet-700 sm:flex">Keşfet <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((b) => {
              const { results } = aiSearch(b.subcategory);
              return <BusinessCard key={b.id} b={b} reason={results[0]?.reason} />;
            })}
          </div>
        </div>
      </section>

      {/* PREMIUM + HOW */}
      <section className="mx-auto max-w-6xl gap-4 px-4 py-10 lg:grid lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl bg-slate-900 p-6 text-white sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-300">Manta modeli • Freemium</p>
          <h3 className="mt-2 text-2xl font-black">İşletmeniz mi var? 2 dakikada ücretsiz listeleyin.</h3>
          <p className="mt-2 text-sm text-white/70">Ücretsiz profille başlayın, öne çıkan vitrin + randevu takvimi + teklif havuzuyla büyüyün. Premium işletmeler 3,2× daha fazla görüntülenir.</p>
          <div className="mt-4 space-y-2">
            {premium.slice(0, 3).map((b) => (
              <Link key={b.id} href={`/isletme/${b.id}`} className="flex items-center gap-3 rounded-2xl bg-white/5 p-2.5 hover:bg-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.photos[0]} alt="" className="h-11 w-11 rounded-xl object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{b.name}</span>
                  <span className="flex items-center gap-1 text-xs text-white/60"><Stars value={b.rating} size={11} /> {b.rating} • {b.district}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-white/40" />
              </Link>
            ))}
          </div>
          <Link href="/isletme-ekle" className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 text-sm font-extrabold text-slate-900 hover:opacity-90">
            Ücretsiz işletme ekle <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 lg:mt-0">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-600">Nasıl çalışır?</p>
          <h3 className="mt-2 text-2xl font-black text-slate-900">Talep → eşleşme → randevu</h3>
          <ol className="mt-4 space-y-3">
            {[
              { n: "1", t: "İhtiyacınızı yazın", d: "Doğal cümle yeterli. Yapay zekâ kategori, semt, fiyat ve aciliyeti anlar (Thumbtack + Whitepages karması)." },
              { n: "2", t: "Skorlu listeyi inceleyin", d: "Her işletmede AI eşleşme nedeni, yorum özeti ve canlı “şu an açık” bilgisi (MapQuest + Tripadvisor karması)." },
              { n: "3", t: "Randevu alın veya teklif toplayın", d: "Kuaförde anında saat seçin, tesisatta 3 uzmandan fiyat alın (Booksy + Angi karması)." },
            ].map((s) => (
              <li key={s.n} className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-violet-100 text-sm font-black text-violet-700">{s.n}</span>
                <span><span className="block text-sm font-extrabold text-slate-900">{s.t}</span><span className="block text-[13px] leading-relaxed text-slate-500">{s.d}</span></span>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex items-center gap-1.5 rounded-2xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
            <MapPin className="h-4 w-4" /> Konum izniyle “yakınımda açık” filtresi otomatik çalışır — yol tarifi tek dokunuşla haritada açılır.
          </div>
        </div>
      </section>

      {/* 20 GLOBAL DIRECTORIES AI SYNTHESIS */}
      <DirectorySynthesisSection />
    </main>
  );
}
