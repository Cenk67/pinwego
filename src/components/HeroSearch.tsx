"use client";

import React from "react";
import { Search, MapPin, Sparkles, SlidersHorizontal, ArrowRight } from "lucide-react";
import { DIRECTORY_CATEGORIES } from "@/data/mockBusinesses";
import { BusinessCategory } from "@/types/directory";

interface HeroSearchProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  locationQuery: string;
  setLocationQuery: (loc: string) => void;
  selectedCategory: BusinessCategory | 'all';
  setSelectedCategory: (cat: BusinessCategory | 'all') => void;
  onSearchSubmit: () => void;
  onOpenMatchmaker: () => void;
}

export const HeroSearch: React.FC<HeroSearchProps> = ({
  searchQuery,
  setSearchQuery,
  locationQuery,
  setLocationQuery,
  selectedCategory,
  setSelectedCategory,
  onSearchSubmit,
  onOpenMatchmaker,
}) => {
  const quickPrompts = [
    "Nişantaşı gurme tadım menüsü",
    "Acil 48 saatte daire mimari tadilatı",
    "D&B güven skoru yüksek kurumsal AI danışmanlığı",
    "Kadıköy aynı gün randevulu medikal spa"
  ];

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-indigo-50/50 via-white to-zinc-50/50 pt-8 pb-12 sm:pt-12 sm:pb-16 dark:from-zinc-950 dark:via-zinc-900/50 dark:to-zinc-950">
      {/* Glow backgrounds */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 right-10 -z-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-2xl" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Top Header & Tagline */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-xs backdrop-blur-xs dark:border-indigo-900/60 dark:bg-zinc-900/80 dark:text-indigo-300">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
            <span>20 Global Rehberin En Güçlü Özellikleri + Yapay Zeka Gücü</span>
          </div>
          
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl dark:text-white">
            Dünyanın En Akıllı <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Mobil Uyumlu İşletme Rehberi
            </span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-300">
            Yelp & Tripadvisor yorumları, Booksy anında randevusu, Thumbtack teklif motoru ve 
            Dun & Bradstreet ticari güven istihbaratı tek bir yapay zekalı platformda.
          </p>
        </div>

        {/* Search Bar Container */}
        <div className="mt-8 mx-auto max-w-4xl">
          <div className="rounded-2xl border border-zinc-200 bg-white p-2.5 shadow-xl shadow-indigo-500/5 ring-1 ring-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-900">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                onSearchSubmit();
              }}
              className="flex flex-col md:flex-row items-stretch gap-2"
            >
              
              {/* Natural Language / Keyword Search */}
              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-3.5 h-5 w-5 text-indigo-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Doğal dille arayın: örn. 'Kadıköy acil mutfak tadilatı' veya 'lüks restoran'..."
                  className="w-full rounded-xl border-0 bg-transparent py-3.5 pl-11 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 dark:text-white"
                />
              </div>

              {/* Location Input */}
              <div className="relative md:w-64 flex items-center border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800">
                <MapPin className="absolute left-3.5 h-5 w-5 text-zinc-400" />
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="Şehir / İlçe (İstanbul, Nişantaşı...)"
                  className="w-full rounded-xl border-0 bg-transparent py-3.5 pl-11 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 dark:text-white"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md transition hover:from-indigo-500 hover:to-blue-500 active:scale-95"
              >
                <Sparkles className="h-4 w-4" />
                <span>AI ile Bul</span>
              </button>
            </form>
          </div>

          {/* Quick AI Prompts */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Hızlı İstemler:
            </span>
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSearchQuery(prompt);
                  onSearchSubmit();
                }}
                className="rounded-lg border border-zinc-200 bg-white/80 px-2.5 py-1 text-zinc-600 transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-indigo-900 dark:hover:text-indigo-300"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Categories Bar */}
        <div className="mt-8 flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {DIRECTORY_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isSelected
                      ? "bg-indigo-500 text-white"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* AI Matchmaker Banner Pill */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={onOpenMatchmaker}
            className="group flex items-center gap-3 rounded-full border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-blue-50 px-5 py-2 text-xs font-medium text-indigo-900 shadow-xs transition hover:shadow-md dark:border-indigo-900/60 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800 dark:text-indigo-200"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white">
              <Sparkles className="h-3 w-3" />
            </span>
            <span>
              <strong>Ne aradığınızdan emin değil misiniz?</strong> AI Akıllı Eşleştiriciye birkaç cümleyle ihtiyacınızı anlatın.
            </span>
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
          </button>
        </div>

      </div>
    </div>
  );
};
