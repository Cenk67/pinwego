"use client";
import { Suspense, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Phone, BadgeCheck, Zap, Clock, CalendarCheck, FileText, Navigation, Share2, Heart, Building2, ThumbsUp, Sparkles, CheckCircle2 } from "lucide-react";
import { BUSINESSES, categoryLabel, priceText } from "@/data/businesses";
import { summarizeReviews } from "@/lib/ai";
import { useLocal } from "@/lib/store";
import { Stars } from "@/components/Stars";
import { BusinessCard } from "@/components/BusinessCard";

export default function IsletmeDetay() {
  return (
    <Suspense fallback={<main className="p-10 text-center text-sm text-slate-500">Yükleniyor…</main>}>
      <DetayInner />
    </Suspense>
  );
}

function DetayInner() {
  const { id } = useParams<{ id: string }>();
  const b = BUSINESSES.find((x) => x.id === id);
  const [tab, setTab] = useState<"genel" | "hizmet" | "yorum" | "foto" | "hak">("genel");
  const [fav, setFav] = useLocal<string[]>("riq:favs", []);
  const [extraReviews, setExtraReviews] = useLocal<Record<string, { author: string; rating: number; text: string; date: string }[]>>("riq:reviews", {});
  const [booking, setBooking] = useState<{ type: "randevu" | "teklif" | null; done: boolean }>({ type: null, done: false });
  const [form, setForm] = useState({ name: "", date: "", note: "" });
  const [reviewForm, setReviewForm] = useState({ name: "", rating: 5, text: "" });

  const allReviews = useMemo(() => [...(extraReviews[b?.id ?? ""] ?? []).map((r, i) => ({ id: `u${i}`, helpful: 0, ...r })), ...(b?.reviews ?? [])], [extraReviews, b]);
  const summary = useMemo(() => (b ? summarizeReviews({ ...b, reviews: allReviews.length ? allReviews : b.reviews }) : null), [b, allReviews]);

  if (!b) return <main className="mx-auto max-w-3xl p-10 text-center">İşletme bulunamadı. <Link className="text-violet-700 font-bold" href="/kesfet">Keşfe dön</Link></main>;

  const isFav = fav.includes(b.id);
  const related = BUSINESSES.filter((x) => x.category === b.category && x.id !== b.id).slice(0, 3);

  const submitBooking = () => {
    if (!form.name) return alert("Lütfen adınızı yazın");
    setBooking({ type: booking.type, done: true });
    try {
      const key = booking.type === "randevu" ? "riq:appts" : "riq:quotes";
      const prev = JSON.parse(localStorage.getItem(key) ?? "[]");
      localStorage.setItem(key, JSON.stringify([...prev, { business: b.name, ...form, at: new Date().toISOString() }]));
    } catch {}
  };

  const submitReview = () => {
    if (!reviewForm.name || !reviewForm.text) return alert("Ad ve yorum gerekli");
    setExtraReviews((p) => ({ ...p, [b.id]: [...(p[b.id] ?? []), { author: reviewForm.name, rating: reviewForm.rating, text: reviewForm.text, date: "az önce" }] }));
    setReviewForm({ name: "", rating: 5, text: "" });
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <p className="text-xs text-slate-400"><Link href="/" className="hover:underline">Ana Sayfa</Link> / <Link href="/kesfet" className="hover:underline">Keşfet</Link> / <b className="text-slate-600">{b.name}</b></p>

      {/* Gallery */}
      <div className="mt-3 grid gap-2 overflow-hidden rounded-3xl sm:grid-cols-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={b.photos[0]} alt={b.name} className="h-64 w-full object-cover sm:col-span-2" />
        <div className="hidden grid-rows-2 gap-2 sm:grid">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.photos[1] ?? b.photos[0]} alt="" className="h-[124px] w-full object-cover" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.photos[2] ?? b.photos[0]} alt="" className="h-[124px] w-full object-cover" />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              {b.premium && <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-[11px] font-bold text-white"><Zap className="h-3 w-3" /> Öne Çıkan</span>}
              {b.verified && <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"><BadgeCheck className="h-3 w-3" /> Onaylı İşletme</span>}
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{categoryLabel(b.category)} • {priceText(b.priceLevel)}</span>
              <span className="ml-auto flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3.5 w-3.5 text-emerald-500" /> Şu an açık</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{b.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4" /> {b.address}</p>
            <div className="mt-2 flex items-center gap-2">
              <Stars value={b.rating} size={16} />
              <b className="text-lg">{b.rating.toFixed(1)}</b>
              <span className="text-sm text-slate-500">({b.reviewCount.toLocaleString("tr")} yorum)</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {b.tags.map((t) => <span key={t} className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">{t}</span>)}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <a href={`tel:${b.phone.replace(/\s/g, "")}`} className="flex items-center justify-center gap-1.5 rounded-2xl bg-slate-900 px-3 py-2.5 text-sm font-bold text-white"><Phone className="h-4 w-4" /> Ara</a>
              <a href={`https://www.google.com/maps/search/${encodeURIComponent(b.name + " " + b.address)}`} target="_blank" className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-bold"><Navigation className="h-4 w-4" /> Yol Tarifi</a>
              <button onClick={() => setFav(isFav ? fav.filter((f) => f !== b.id) : [...fav, b.id])} className={`flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-sm font-bold ${isFav ? "border-rose-200 bg-rose-50 text-rose-600" : "border-slate-200"}`}><Heart className={`h-4 w-4 ${isFav ? "fill-rose-500 text-rose-500" : ""}`} /> {isFav ? "Kaydedildi" : "Kaydet"}</button>
              <button onClick={() => { navigator.clipboard?.writeText(window.location.href); alert("Bağlantı kopyalandı"); }} className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-bold"><Share2 className="h-4 w-4" /> Paylaş</button>
            </div>
            {b.acceptsAppointment || b.acceptsQuote ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {b.acceptsAppointment && <button onClick={() => setBooking({ type: "randevu", done: false })} className="flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-3 text-sm font-extrabold text-white shadow-lg shadow-fuchsia-200"><CalendarCheck className="h-4 w-4" /> Hemen Randevu Al</button>}
                {b.acceptsQuote && <button onClick={() => setBooking({ type: "teklif", done: false })} className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-violet-600 px-3 py-3 text-sm font-extrabold text-violet-700"><FileText className="h-4 w-4" /> Ücretsiz Teklif Al</button>}
              </div>
            ) : null}
          </div>

          {/* Tabs */}
          <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
            {[["genel", "Genel Bakış"], ["hizmet", "Hizmetler & Fiyat"], ["yorum", `Yorumlar (${allReviews.length})`], ["foto", "Fotoğraflar"], ["hak", "Hakkında & B2B"]].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k as typeof tab)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${tab === k ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{l}</button>
            ))}
          </div>

          {tab === "genel" && (
            <div className="mt-3 space-y-3">
              <div className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5">
                <p className="flex items-center gap-1.5 text-sm font-extrabold text-violet-900"><Sparkles className="h-4 w-4" /> Yapay zekâ yorum özeti</p>
                <p className="mt-1.5 text-sm leading-relaxed text-violet-950">{summary?.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {summary?.pros.map((p) => <span key={p} className="rounded-full bg-emerald-100 px-2.5 py-1 font-bold text-emerald-800">✓ {p}</span>)}
                  {summary?.cons.map((c) => <span key={c} className="rounded-full bg-amber-100 px-2.5 py-1 font-bold text-amber-800">! {c}</span>)}
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${summary?.sentiment}%` }} /></div>
                <p className="mt-1 text-[11px] text-violet-700">Müşteri memnuniyeti %{summary?.sentiment}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="font-extrabold">Hakkında</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{b.description}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  {[["Deneyim", `${b.yearsActive} yıl`], ["Ekip", b.employees], ["Diller", b.languages.join(", ")], ["Mesafe", `${b.distanceKm} km`]].map(([k, v]) => (
                    <div key={k} className="rounded-2xl bg-slate-50 p-3"><p className="text-[11px] font-bold uppercase text-slate-400">{k}</p><p className="font-bold">{v}</p></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "hizmet" && (
            <div className="mt-3 rounded-3xl border border-slate-200 bg-white p-5">
              <p className="font-extrabold">Hizmetler & fiyat listesi <span className="ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">şeffaf fiyat</span></p>
              <div className="mt-3 space-y-2">
                {b.services.map((s) => (
                  <div key={s.name} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 hover:border-violet-200">
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{s.name}</span><span className="text-xs text-slate-400">{s.duration ?? "yerinde hizmet"}</span></span>
                    <b className="text-sm">{s.price === 0 ? "Ücretsiz" : `${s.price.toLocaleString("tr")} ${s.unit}`}</b>
                    {b.acceptsAppointment && <button onClick={() => setBooking({ type: "randevu", done: false })} className="rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white">Seç</button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "yorum" && (
            <div className="mt-3 space-y-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="font-extrabold">Yorum yaz</p>
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setReviewForm({ ...reviewForm, rating: n })} aria-label={`${n} yıldız`} className={`text-2xl ${reviewForm.rating >= n ? "text-amber-400" : "text-slate-200"}`}>★</button>
                  ))}
                </div>
                <input value={reviewForm.name} onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })} placeholder="Adınız" className="mt-2 w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
                <textarea value={reviewForm.text} onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })} placeholder="Deneyiminizi paylaşın…" rows={3} className="mt-2 w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
                <button onClick={submitReview} className="mt-2 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white">Yorumu yayınla</button>
              </div>
              {allReviews.map((r) => (
                <div key={r.id} className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-black text-white">{r.author[0]}</span>
                    <span className="flex-1"><span className="block text-sm font-bold">{r.author}</span><span className="text-xs text-slate-400">{r.date}</span></span>
                    <Stars value={r.rating} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{r.text}</p>
                  <button className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-violet-700"><ThumbsUp className="h-3.5 w-3.5" /> Faydalı ({r.helpful})</button>
                </div>
              ))}
            </div>
          )}

          {tab === "foto" && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {b.photos.concat(b.photos).slice(0, 6).map((p, i) => <img key={i} src={p} alt="" className="h-48 w-full rounded-2xl object-cover" />)}
            </div>
          )}

          {tab === "hak" && (
            <div className="mt-3 rounded-3xl border border-slate-200 bg-white p-5">
              <p className="flex items-center gap-1.5 font-extrabold"><Building2 className="h-4 w-4" /> Firma künyesi (D&B / Kompass tarzı B2B)</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {[["Sektör", b.b2b?.sector ?? b.subcategory], ["Kuruluş", String(b.b2b?.founded ?? 2020 - (b.yearsActive % 10))], ["Çalışan", b.employees], ["İhracat", b.b2b?.exportMarkets?.join(", ") || "—"], ["Telefon", b.phone], ["Adres", b.address]].map(([k, v]) => (
                  <div key={k} className="rounded-2xl bg-slate-50 p-3"><dt className="text-[11px] font-bold uppercase text-slate-400">{k}</dt><dd className="font-semibold">{v}</dd></div>
                ))}
              </dl>
            </div>
          )}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="flex items-center gap-1.5 text-sm font-extrabold"><Clock className="h-4 w-4 text-emerald-500" /> Çalışma saatleri</p>
            {b.hours.map((h) => <p key={h.days} className="mt-1.5 flex justify-between text-sm"><span className="text-slate-500">{h.days}</span><b>{h.time}</b></p>)}
            <a href={`tel:${b.phone.replace(/\s/g, "")}`} className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-2.5 text-sm font-bold text-white"><Phone className="h-4 w-4" /> {b.phone}</a>
          </div>
          <div className="rounded-3xl bg-slate-900 p-5 text-white">
            <p className="text-sm font-extrabold">Benzer işletmeler</p>
            <div className="mt-2 space-y-2 text-sm">
              {related.map((r) => <Link key={r.id} href={`/isletme/${r.id}`} className="block rounded-2xl bg-white/5 p-2.5 hover:bg-white/10"><b>{r.name}</b><span className="block text-xs text-white/60">{r.rating}★ • {r.district}</span></Link>)}
              {related.length === 0 && <p className="text-xs text-white/60">Bu kategoride başka kayıt yok.</p>}
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-8">
        <p className="font-extrabold">Bunlara da bakın</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BUSINESSES.filter((x) => x.id !== b.id).slice(0, 3).map((x) => <BusinessCard key={x.id} b={x} />)}
        </div>
      </div>

      {/* Booking modal */}
      {booking.type && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setBooking({ type: null, done: false })}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            {booking.done ? (
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                <h3 className="mt-2 text-lg font-black">{booking.type === "randevu" ? "Randevunuz alındı!" : "Talebiniz iletildi!"}</h3>
                <p className="mt-1 text-sm text-slate-500">{b.name} • {form.name}{form.date ? ` • ${form.date}` : ""} — işletme en kısa sürede onaylayacak. Bildirimlerinizden takip edebilirsiniz.</p>
                <button onClick={() => setBooking({ type: null, done: false })} className="mt-4 w-full rounded-full bg-slate-900 py-2.5 text-sm font-bold text-white">Kapat</button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-black">{booking.type === "randevu" ? "Randevu oluştur" : "Ücretsiz teklif iste"}</h3>
                <p className="text-sm text-slate-500">{b.name} • ortalama yanıt: 25 dk</p>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ad Soyad" className="mt-3 w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
                <input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} type={booking.type === "randevu" ? "datetime-local" : "text"} placeholder={booking.type === "randevu" ? "" : "İhtiyacınızı kısaca yazın (örn: 2+1 petek temizliği)"} className="mt-2 w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
                <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Not (opsiyonel)" rows={2} className="mt-2 w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setBooking({ type: null, done: false })} className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-bold">Vazgeç</button>
                  <button onClick={submitBooking} className="flex-1 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 py-2.5 text-sm font-extrabold text-white">Onayla</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
