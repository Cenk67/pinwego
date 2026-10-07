"use client";

import React from "react";
import { 
  Star, 
  MapPin, 
  CalendarCheck, 
  FileSpreadsheet, 
  ShieldCheck, 
  Palette, 
  Sparkles,
  Zap,
  Globe2,
  CheckCircle2
} from "lucide-react";
import { TOP_GLOBAL_DIRECTORIES_SYNTHESIS } from "@/data/mockBusinesses";

export const DirectorySynthesisSection: React.FC = () => {
  const directoryMatrix = [
    {
      source: "Yelp & Tripadvisor",
      traffic: "128.8M + 106.8M",
      feature: "Derinlemesine Doğrulanmış Yorumlar & Fotoğraf Havuzu",
      nexusFeature: "LLM Destekli Yorum Konsensüsü & Duygu (Sentiment) Analitiği",
      color: "from-amber-500 to-red-500"
    },
    {
      source: "Booksy & TaskRabbit",
      traffic: "14.2M + 3.0M",
      feature: "Firma → Hizmet Seçimi → Şeffaf Fiyat → Anında Randevu",
      nexusFeature: "Çoklu saat dilimi, SMS/E-posta onaylı takvim rezervasyonu",
      color: "from-blue-600 to-indigo-600"
    },
    {
      source: "Thumbtack & Angi / HomeAdvisor",
      traffic: "8.8M + 6.8M",
      feature: "Talep Oluşturma + İhtiyaca Göre Uzman Eşleştirme (RFQ)",
      nexusFeature: "Yapay zeka ile anında piyasa bütçe tahmini ve çoklu teklif dağıtımı",
      color: "from-emerald-500 to-teal-600"
    },
    {
      source: "Dun & Bradstreet & Kompass",
      traffic: "~8.3M + ~2.0M",
      feature: "B2B Firma Verisi + Ticari İstihbarat & D-U-N-S® Numarası",
      nexusFeature: "Kurumsal kredi/güven skoru (1-100), vergi & sicil uyumluluğu",
      color: "from-purple-600 to-indigo-600"
    },
    {
      source: "MapQuest & Loc8NearMe & Cybo",
      traffic: "35.5M + 1.5M + 468K",
      feature: "Harita + Yol Tarifi + 'Yakınımda' Çok Ülkeli Arama",
      nexusFeature: "İnteraktif koordinat ve mahalle bazlı mesafe optimizasyonu",
      color: "from-cyan-500 to-blue-600"
    },
    {
      source: "Houzz & Manta & Brownbook",
      traffic: "5.5M + 2.1M + 4.5M",
      feature: "İçerik + Önce/Sonra Portfolyo + Ücretsiz Şirket Dizini",
      nexusFeature: "Proje bütçe & teslim süresi etiketli görsel vitrin",
      color: "from-rose-500 to-pink-600"
    }
  ];

  return (
    <section id="features-synthesis" className="py-16 bg-white border-y border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Dünyanın En İyi 20 Rehberinin DNA'sı</span>
          </div>
          <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Neden Tek Bir Rehberle Yetinesiniz?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
            Yelp'in yorum gücünü, Booksy'nin anında randevusunu, Thumbtack'in teklif sistemini ve Dun & Bradstreet'in ticari güven skorunu yapay zeka ile tek platformda birleştirdik.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {directoryMatrix.map((item, index) => (
            <div
              key={index}
              className="relative flex flex-col justify-between rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 transition hover:border-indigo-300 hover:bg-white hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-indigo-900 dark:hover:bg-zinc-900"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">
                    {item.source}
                  </span>
                  <span className="rounded-md bg-zinc-200/80 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    Aylık {item.traffic}
                  </span>
                </div>

                <div className="mb-4">
                  <span className="text-[11px] text-zinc-400 uppercase tracking-wider block font-semibold">
                    Global Rehber Modeli:
                  </span>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                    {item.feature}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 dark:border-indigo-950 dark:bg-indigo-950/30">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  <Zap className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>NexusBiz AI Entegrasyonu:</span>
                </div>
                <p className="mt-1 text-xs text-indigo-900/80 dark:text-indigo-300/80">
                  {item.nexusFeature}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Trust Stat Bar */}
        <div className="mt-12 rounded-2xl bg-gradient-to-r from-zinc-900 via-indigo-950 to-zinc-900 p-6 sm:p-8 text-white shadow-xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold text-indigo-400">%100</span>
              <p className="text-xs text-zinc-300 mt-1">Mobil Uyumlu Responsive Deneyim</p>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold text-blue-400">15 dk</span>
              <p className="text-xs text-zinc-300 mt-1">Ortalama AI Teklif & Yanıt Süresi</p>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">95+</span>
              <p className="text-xs text-zinc-300 mt-1">Doğrulanmış D&B Ticari Güven İndeksi</p>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold text-cyan-400">7/24</span>
              <p className="text-xs text-zinc-300 mt-1">Akıllı Arama & Anında Randevu</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
