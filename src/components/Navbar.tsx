"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  Search, 
  MapPin, 
  Menu, 
  X, 
  PlusCircle, 
  ShieldCheck, 
  Calendar, 
  SlidersHorizontal,
  Bot
} from "lucide-react";

interface NavbarProps {
  onOpenMatchmaker?: () => void;
  onOpenAddBusiness?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenMatchmaker,
  onOpenAddBusiness,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo & Global Badge */}
        <div className="flex items-center gap-3">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 shadow-md shadow-indigo-500/20 text-white transition-transform group-hover:scale-105">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Nexus<span className="text-indigo-600 dark:text-indigo-400">Biz</span>
              </span>
              <span className="ml-1.5 inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10 dark:bg-indigo-950 dark:text-indigo-300">
                AI Directory
              </span>
            </div>
          </Link>
        </div>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          <Link href="/" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
            Rehber & Keşfet
          </Link>
          <button
            onClick={onOpenMatchmaker}
            className="flex items-center gap-1.5 text-indigo-600 font-semibold hover:text-indigo-700 dark:text-indigo-400"
          >
            <Bot className="h-4 w-4" />
            <span>AI Eşleştirici</span>
            <span className="rounded bg-indigo-100 px-1.5 py-0.2 text-[10px] text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
              Yeni
            </span>
          </button>
          <a href="#features-synthesis" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
            Global Özellikler
          </a>
          <a href="#b2b-verified" className="flex items-center gap-1 transition hover:text-indigo-600 dark:hover:text-indigo-400">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>D&B Kurumsal Skor</span>
          </a>
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={onOpenMatchmaker}
            className="hidden lg:inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3.5 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            Akıllı Teklif Al (AI RFQ)
          </button>

          <button
            onClick={onOpenAddBusiness}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800 active:scale-95 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            <PlusCircle className="h-4 w-4" />
            <span>İşletmeni Ekle</span>
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={onOpenMatchmaker}
            className="p-2 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
            title="AI Eşleştirici"
          >
            <Bot className="h-5 w-5" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-200 bg-white px-4 py-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-950">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-200"
          >
            Ana Sayfa & Keşfet
          </Link>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenMatchmaker?.();
            }}
            className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400"
          >
            <Bot className="h-4 w-4" />
            <span>AI Akıllı Eşleştirici & Teklif Al</span>
          </button>
          <a
            href="#features-synthesis"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-zinc-600 dark:text-zinc-400"
          >
            Global 20 Rehber Özellikleri
          </a>
          <div className="pt-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAddBusiness?.();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm"
            >
              <PlusCircle className="h-4 w-4" />
              <span>İşletmeni Ücretsiz Kaydet</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
