"use client";

import React from "react";
import { 
  Sparkles, 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  FileText, 
  Heart
} from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold text-zinc-900 dark:text-white">
                Nexus<span className="text-indigo-600">Biz</span> AI
              </span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Dünyanın en büyük 20 ticari rehberinin en iyi özelliklerini yapay zeka ile harmanlayan yeni nesil mobil rehber platformu.
            </p>
          </div>

          {/* Global Directories Referenced */}
          <div>
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider dark:text-white mb-3">
              Kapsanan Global Modeller
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>Yelp & Tripadvisor (Yorum/Puan)</li>
              <li>Booksy & TaskRabbit (Randevu)</li>
              <li>Thumbtack & Angi (AI Teklif/RFQ)</li>
              <li>Dun & Bradstreet (B2B Güven)</li>
              <li>MapQuest & Loc8NearMe (Harita)</li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider dark:text-white mb-3">
              Öne Çıkan Sektörler
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>Ev Tadilatı & Mimarlık</li>
              <li>Restoran & Gurme Tadım</li>
              <li>Medikal Estetik & Spa</li>
              <li>B2B Yapay Zeka Danışmanlığı</li>
              <li>Otomotiv & Hibrit Servis</li>
            </ul>
          </div>

          {/* Trust & Guarantee */}
          <div>
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider dark:text-white mb-3">
              Güven ve Standartlar
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                <span>%100 Doğrulanmış Firma Sicili</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-500" />
                <span>Sözleşmeli Sabit Fiyat Garantisi</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span>Anında Takvim Entegrasyonu</span>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 dark:border-zinc-900">
          <p>© 2026 NexusBiz AI Directory. Tüm hakları saklıdır.</p>
          <p className="flex items-center gap-1 mt-2 sm:mt-0">
            Mobil öncelikli, yapay zeka destekli rehber mimarisi.
          </p>
        </div>
      </div>
    </footer>
  );
};
