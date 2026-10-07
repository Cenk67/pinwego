"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import { CATEGORIES, BUSINESSES } from "@/data/businesses";
import { aiSearch } from "@/lib/ai";
import { BusinessCard } from "@/components/BusinessCard";

const STEPS = ["İhtiyaç", "Detay", "Eşleşme"];

export default function TeklifAl() {
  const [step, setStep] = useState(0);
  const [cat, setCat] = useState("ev-hizmet");
  const [desc, setDesc] = useState("");
  const [city, setCity] = useState("İstanbul");
  const [budget, setBudget] = useState("Fark etmez");
  const [done, setDone] = useState(false);

  const matches = aiSearch(`${CATEGORIES.find((c) => c.slug === cat)?.label} ${desc}`).results.filter((r) => r.business.acceptsQuote).slice(0, 3);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-violet-600"><Sparkles className="h-3.5 w-3.5" /> Thumbtack + Angi tarzı akıllı eşleşme</p>
      <h1 className="mt-1 text-2xl font-black sm:text-3xl">3 adımda 3 teklif alın</h1>
      <div className="mt-4 flex gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex-1 rounded-2xl p-3 text-center text-xs font-extrabold ${i <= step ? "bg-slate-900 text-white" : "bg-white text-slate-400 border border-slate-200"}`}>{i + 1}. {s}</div>
        ))}
      </div>

      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
        {step === 0 && (
          <>
            <p className="font-extrabold">Hangi hizmete ihtiyacınız var?</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => (
                <button key={c.slug} onClick={() => setCat(c.slug)} className={`rounded-2xl border p-3 text-left text-sm font-bold ${cat === c.slug ? "border-violet-600 bg-violet-50 text-violet-800" : "border-slate-200"}`}>
                  <span className="text-xl">{c.icon}</span><span className="block text-xs">{c.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="mt-4 flex w-full items-center justify-center gap-1 rounded-full bg-slate-900 py-3 text-sm font-bold text-white">Devam et <ArrowRight className="h-4 w-4" /></button>
          </>
        )}
        {step === 1 && (
          <>
            <p className="font-extrabold">İhtiyacınızı anlatın</p>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} placeholder="Örn: 3+1 evde petek temizliği + bir banyoda batarya değişimi…" className="mt-2 w-full rounded-2xl border border-slate-200 px-3.5 py-3 text-sm focus:border-violet-400 focus:outline-none" />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <select value={city} onChange={(e) => setCity(e.target.value)} className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm">
                {["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya"].map((c) => <option key={c}>{c}</option>)}
              </select>
              <select value={budget} onChange={(e) => setBudget(e.target.value)} className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm">
                {["Fark etmez", "0–2.500 ₺", "2.500–10.000 ₺", "10.000 ₺+"].map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setStep(0)} className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-bold">Geri</button>
              <button onClick={() => { setStep(2); setDone(true); }} className="flex-1 rounded-full bg-slate-900 py-3 text-sm font-bold text-white">Uzmanları eşleştir</button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <p className="flex items-center gap-1.5 font-extrabold"><CheckCircle2 className="h-5 w-5 text-emerald-500" /> {city} • {budget} için {matches.length} uzman eşleşti</p>
            <p className="mt-1 text-sm text-slate-500">Yapay zekâ “{desc.slice(0, 60) || CATEGORIES.find((c) => c.slug === cat)?.label}” talebinizi analiz etti. Teklifler ~25 dk içinde gelir.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {matches.map((m) => <BusinessCard key={m.business.id} b={m.business} reason={m.reason} />)}
            </div>
            {done && (
              <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
                Talebiniz iletildi! Uzmanlar teklif verince SMS + e-posta alacaksınız. Dilerseniz <Link href="/kesfet" className="font-bold underline">keşfetmeye devam edin</Link>.
              </div>
            )}
            <button onClick={() => { setStep(0); setDone(false); setDesc(""); }} className="mt-3 w-full rounded-full border border-slate-200 py-2.5 text-sm font-bold">Yeni talep oluştur</button>
            <div className="mt-3 hidden">{BUSINESSES.length}</div>
          </>
        )}
      </div>
    </main>
  );
}
