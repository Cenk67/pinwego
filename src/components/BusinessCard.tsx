import Link from "next/link";
import { MapPin, BadgeCheck, Zap, CalendarCheck, FileText } from "lucide-react";
import { Business, priceText } from "@/data/businesses";
import { Stars } from "./Stars";

export function BusinessCard({ b, reason }: { b: Business; reason?: string }) {
  return (
    <Link
      href={`/isletme/${b.id}`}
      className="group overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-100"
    >
      <div className="relative h-44 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={b.photos[0]} alt={b.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          {b.premium && (
            <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-[11px] font-bold text-white shadow">
              <Zap className="h-3 w-3" /> Öne Çıkan
            </span>
          )}
          {b.verified && (
            <span className="flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              <BadgeCheck className="h-3 w-3" /> Onaylı
            </span>
          )}
        </div>
        <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {priceText(b.priceLevel)} • {b.distanceKm} km
        </span>
        <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-violet-700">
          AI skoru %{Math.min(99, 82 + Math.round(b.rating * 2))}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-[15px] font-extrabold leading-snug text-slate-900">{b.name}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3 w-3" /> {b.district}, {b.city} • {b.subcategory}
            </p>
          </div>
          <span className="shrink-0 rounded-2xl bg-emerald-50 px-2 py-1 text-sm font-extrabold text-emerald-700">{b.rating.toFixed(1)}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Stars value={b.rating} />
          <span className="text-xs text-slate-500">({b.reviewCount.toLocaleString("tr")} yorum)</span>
        </div>
        {reason && (
          <p className="mt-2.5 rounded-xl bg-violet-50 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-violet-800">
            ✨ {reason}
          </p>
        )}
        <div className="mt-3 flex gap-2">
          {b.acceptsAppointment && (
            <span className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-slate-900 px-2 py-2 text-xs font-bold text-white">
              <CalendarCheck className="h-3.5 w-3.5" /> Randevu
            </span>
          )}
          {b.acceptsQuote && (
            <span className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-violet-200 bg-violet-50 px-2 py-2 text-xs font-bold text-violet-700">
              <FileText className="h-3.5 w-3.5" /> Teklif
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
