"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { CATEGORIES } from "@/data/businesses";
import { aiSearch } from "@/lib/ai";
import { BusinessCard } from "@/components/BusinessCard";
import { AICopilot } from "@/components/AICopilot";

function KesfetInner() {
  const params = useSearchParams();
  const router = useRouter();
  const initialQ = params.get("q") ?? "";
  const initialK = params.get("k") ?? "";
  const [q, setQ] = useState(initialQ);
  const [cat, setCat] = useState(initialK);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [onlyAppt, setOnlyAppt] = useState(false);
  const [onlyQuote, setOnlyQuote] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<"ai" | "rating" | "near">("ai");

  const { intent, results } = useMemo(() => {
    const base = q || (cat ? CATEGORIES.find((c) => c.slug === cat)?.label ?? "" : "restoran kuaför tesisatçı yakınımda");
    return aiSearch(base);
  }, [q, cat]);

  const filtered = useMemo(() => {
    let r = [...results];
    if (cat) r = [...r.filter((x) => x.business.category === cat), ...r.filter((x) => x.business.category !== cat)];
    if (onlyOpen) r = r.filter((x) => x.business.hours.some((h) => h.openNow));
    if (onlyAppt) r = r.filter((x) => x.business.acceptsAppointment);
    if (onlyQuote) r = r.filter((x) => x.business.acceptsQuote);
    if (minRating) r = r.filter((x) => x.business.rating >= minRating);
    if (sort === "rating") r.sort((a, b) => b.business.rating - a.business.rating);
    if (sort === "near") r.sort((a, b) => a.business.distanceKm - b.business.distanceKm);
    return r;
  }, [results, cat, onlyOpen, onlyAppt, onlyQuote, minRating, sort]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <form
        onSubmit={(e) => { e.preventDefault(); router.replace(`/kesfet?q=${encodeURIComponent(q)}${cat ? `&k=${cat}` : ""}`); }}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1.5 pl-4 shadow-sm"
      >
        <Search className="h-5 w-5 text-violet-600" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="İşletme, hizmet veya ihtiyaç yazın…" className="w-full bg-transparent text-sm font-medium focus:outline-none" />
        {q && <button type="button" onClick={() => setQ("")} aria-label="Temizle"><X className="h-4 w-4 text-slate-400" /></button>}
        <button className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white">Ara</button>
      </form>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-3.5 text-[13px] leading-relaxed text-violet-900">
            <span className="flex items-center gap-1.5 font-extrabold"><Sparkles className="h-4 w-4" /> Yapay zekâ analizi</span>
            <span className="mt-1 block">{intent.explanation}</span>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button onClick={() => setCat("")} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${!cat ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>Tümü</button>
            {CATEGORIES.map((c) => (
              <button key={c.slug} onClick={() => setCat(cat === c.slug ? "" : c.slug)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${cat === c.slug ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold">
            <span className="flex items-center gap-1 text-slate-500"><SlidersHorizontal className="h-3.5 w-3.5" /> Filtre:</span>
            {[
              { l: "Şu an açık", v: onlyOpen, s: setOnlyOpen },
              { l: "Randevulu", v: onlyAppt, s: setOnlyAppt },
              { l: "Teklifli", v: onlyQuote, s: setOnlyQuote },
            ].map((f) => (
              <button key={f.l} onClick={() => f.s(!f.v)} className={`rounded-full px-3 py-1.5 ${f.v ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>{f.l}</button>
            ))}
            {[0, 4.5, 4.7].map((r) => (
              <button key={r} onClick={() => setMinRating(r)} className={`rounded-full px-3 py-1.5 ${minRating === r ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                {r === 0 ? "Tüm puanlar" : `${r}★+`}
              </button>
            ))}
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="ml-auto rounded-full bg-slate-100 px-3 py-1.5">
              <option value="ai">AI skoruna göre</option>
              <option value="rating">Puana göre</option>
              <option value="near">Yakınlığa göre</option>
            </select>
          </div>

          <p className="mt-4 text-sm text-slate-500"><b className="text-slate-900">{filtered.length}</b> işletme bulundu</p>
          {filtered.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-4xl">🔍</p>
              <p className="mt-2 font-extrabold">Sonuç bulunamadı</p>
              <p className="text-sm text-slate-500">Filtreleri gevşetmeyi veya farklı bir cümle denemeyi öneririm.</p>
              <button onClick={() => { setCat(""); setMinRating(0); setOnlyOpen(false); setOnlyAppt(false); setOnlyQuote(false); }} className="mt-3 rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white">Filtreleri temizle</button>
            </div>
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {filtered.map((r) => <BusinessCard key={r.business.id} b={r.business} reason={r.reason} />)}
            </div>
          )}
        </div>
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-3xl bg-[#0d0b24] p-2">
            <AICopilot compact onResults={(qq) => setQ(qq)} />
          </div>
          <div className="mt-3 rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-extrabold">💡 Pro ipucu</p>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-500">“Pazar günü açık”, “bütçe dostu”, “teklif al” gibi ifadeler ekleyin — yapay zekâ filtreleri otomatik kurar.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function Kesfet() {
  return (
    <Suspense fallback={<main className="p-10 text-center text-sm text-slate-500">Yükleniyor…</main>}>
      <KesfetInner />
    </Suspense>
  );
}
