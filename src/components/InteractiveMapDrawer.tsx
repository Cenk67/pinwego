"use client";

import React, { useState } from "react";
import { 
  MapPin, 
  Star, 
  ShieldCheck, 
  CalendarCheck, 
  FileText, 
  Navigation, 
  ExternalLink 
} from "lucide-react";
import { BusinessItem } from "@/types/directory";
import { AISearchResult } from "@/lib/aiMatchEngine";
import { formatPrice } from "@/lib/utils";

interface InteractiveMapDrawerProps {
  items: AISearchResult[];
  selectedBusiness: BusinessItem | null;
  onSelectBusiness: (biz: BusinessItem) => void;
  onQuickBook: (biz: BusinessItem) => void;
  onQuickQuote: (biz: BusinessItem) => void;
}

export const InteractiveMapDrawer: React.FC<InteractiveMapDrawerProps> = ({
  items,
  selectedBusiness,
  onSelectBusiness,
  onQuickBook,
  onQuickQuote
}) => {
  const [activePinId, setActivePinId] = useState<string>(
    selectedBusiness ? selectedBusiness.id : (items[0]?.business.id || '')
  );

  const activeItem = items.find((i) => i.business.id === activePinId) || items[0];

  return (
    <div className="rounded-3xl border border-zinc-200 overflow-hidden bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      
      {/* Map Header / Location Bar */}
      <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs flex items-center justify-between dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4 text-indigo-600 animate-pulse" />
          <span className="font-bold text-zinc-900 dark:text-white">
            İnteraktif Konum & Çevre Haritası (MapQuest / Loc8NearMe Modeli)
          </span>
        </div>
        <span className="text-zinc-500 text-[11px]">
          {items.length} Doğrulanmış Lokasyon Aktif
        </span>
      </div>

      <div className="relative h-96 w-full bg-slate-900 overflow-hidden select-none">
        {/* Stylized Modern Dark Grid Vector Map */}
        <svg className="absolute inset-0 h-full w-full opacity-30" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6366f1" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {/* Simulated roads / waterways */}
          <path d="M-50,200 Q200,100 450,220 T950,150" fill="none" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" opacity="0.4" />
          <path d="M120,-20 Q180,240 320,420" fill="none" stroke="#475569" strokeWidth="4" opacity="0.6" />
          <path d="M500,-20 Q480,210 650,420" fill="none" stroke="#475569" strokeWidth="4" opacity="0.6" />
          <path d="M-20,90 Q400,150 850,80" fill="none" stroke="#475569" strokeWidth="3" opacity="0.5" />
          {/* Bosphorus Waterway silhouette */}
          <path d="M 380,-10 C 360,120 440,240 410,410" fill="none" stroke="#0ea5e9" strokeWidth="18" opacity="0.3" />
        </svg>

        {/* Map Coordinates Pins */}
        <div className="absolute inset-0 p-6 pointer-events-auto">
          {items.map((result, idx) => {
            const biz = result.business;
            const isSelected = activePinId === biz.id;

            // Generate deterministic spread coordinates based on business lat/lng
            const topOffset = 18 + ((biz.location.lat * 1000) % 65);
            const leftOffset = 12 + ((biz.location.lng * 1000) % 75);

            return (
              <button
                key={biz.id}
                onClick={() => {
                  setActivePinId(biz.id);
                  onSelectBusiness(biz);
                }}
                style={{ top: `${topOffset}%`, left: `${leftOffset}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 z-10 ${
                  isSelected ? "scale-125 z-30" : "hover:scale-115"
                }`}
              >
                <div className={`relative flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-xl backdrop-blur-md transition ${
                  isSelected
                    ? "bg-indigo-600 text-white ring-4 ring-indigo-400/40"
                    : "bg-white text-zinc-900 hover:bg-zinc-100"
                }`}>
                  <MapPin className={`h-3.5 w-3.5 ${isSelected ? "text-white" : "text-indigo-600"}`} />
                  <span className="truncate max-w-[120px]">{biz.name.split(" ")[0]}</span>
                  <span className={`text-[10px] ml-0.5 ${isSelected ? "text-indigo-200" : "text-amber-500"}`}>
                    ★{biz.rating}
                  </span>
                </div>
                {/* Pin pointer triangle */}
                <div className={`mx-auto h-2 w-2 rotate-45 -mt-1 ${
                  isSelected ? "bg-indigo-600" : "bg-white"
                }`} />
              </button>
            );
          })}
        </div>

        {/* Floating Active Business Preview Card at Bottom of Map */}
        {activeItem && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-30">
            <div className="rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-2xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95">
              <div className="flex items-start gap-3">
                <img
                  src={activeItem.business.logo}
                  alt=""
                  className="h-12 w-12 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      {activeItem.business.categoryName}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600">
                      %{activeItem.matchScore} AI Uyum
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                    {activeItem.business.name}
                  </h4>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">
                    {activeItem.business.location.address}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2.5 dark:border-zinc-800 text-xs">
                <div className="text-zinc-600 dark:text-zinc-300">
                  <span className="font-bold text-amber-500">★ {activeItem.business.rating}</span>
                  <span className="text-zinc-400 ml-1">({activeItem.business.reviewCount} yorum)</span>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => onSelectBusiness(activeItem.business)}
                    className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200"
                  >
                    Detay
                  </button>
                  <button
                    onClick={() => onQuickBook(activeItem.business)}
                    className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs"
                  >
                    Randevu Al
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
