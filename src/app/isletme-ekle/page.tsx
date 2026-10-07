"use client";
import { useState } from "react";
import { BadgeCheck, CheckCircle2, PlusCircle } from "lucide-react";
import { CATEGORIES } from "@/data/businesses";

export default function IsletmeEkle() {
  const [form, setForm] = useState({ name: "", cat: "restoran", city: "İstanbul", phone: "", desc: "" });
  const [done, setDone] = useState(false);
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-black sm:text-3xl"><PlusCircle className="h-7 w-7 text-violet-600" /> İşletmenizi ücretsiz ekleyin</h1>
      <p className="mt-1 text-sm text-slate-500">Manta + Brownbook modeli: ücretsiz liste, premium vitrinle 3,2× görünürlük.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_280px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          {done ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <p className="mt-2 text-lg font-black">Başvurunuz alındı!</p>
              <p className="mt-1 text-sm text-slate-500"><b>{form.name}</b> doğrulama kuyruğuna eklendi (ortalama onay: 2 saat). Onaylanınca profiliniz yayına alınacak.</p>
              <button onClick={() => { setDone(false); setForm({ name: "", cat: "restoran", city: "İstanbul", phone: "", desc: "" }); }} className="mt-4 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white">Başka işletme ekle</button>
            </div>
          ) : (
            <>
              <label className="text-xs font-bold">İşletme adı *</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Örn: Moda Pide Evi" className="mt-1 w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold">Kategori</label>
                  <select value={form.cat} onChange={(e) => set("cat", e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm">
                    {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold">Şehir</label>
                  <select value={form.city} onChange={(e) => set("city", e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm">
                    {["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Diğer"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <label className="mt-3 block text-xs font-bold">Telefon *</label>
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0212 …" className="mt-1 w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
              <label className="mt-3 block text-xs font-bold">Tanıtım yazısı</label>
              <textarea value={form.desc} onChange={(e) => set("desc", e.target.value)} rows={3} placeholder="İşletmenizi 2-3 cümleyle tanıtın…" className="mt-1 w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
              <button onClick={() => { if (!form.name || !form.phone) return alert("Ad ve telefon gerekli"); setDone(true); }} className="mt-4 w-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-extrabold text-white">Ücretsiz yayınla</button>
              <p className="mt-2 text-center text-[11px] text-slate-400">Yayınlayarak kullanım koşullarını kabul etmiş olursunuz.</p>
            </>
          )}
        </div>
        <aside className="space-y-3">
          <div className="rounded-3xl bg-slate-900 p-5 text-sm text-white">
            <p className="flex items-center gap-1.5 font-extrabold"><BadgeCheck className="h-4 w-4 text-emerald-300" /> Neden RehberIQ?</p>
            <ul className="mt-2 space-y-1.5 text-white/75">
              <li>✓ Yapay zekâ sizi doğru müşteriye önerir</li>
              <li>✓ Canlı randevu takvimi (komisyonsuz)</li>
              <li>✓ Teklif havuzundan hazır müşteri</li>
              <li>✓ Yorum özeti + itibar paneli</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm">
            <p className="font-extrabold text-amber-900">Premium vitrin</p>
            <p className="mt-1 text-amber-800">Aramada üst sıra + “Öne Çıkan” rozeti + ana sayfa vitrini. İlk 30 gün ücretsiz.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
