"use client";

import React, { useState } from "react";
import { 
  X, 
  Building2, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Upload, 
  Globe, 
  Phone, 
  Mail, 
  MapPin 
} from "lucide-react";
import { DIRECTORY_CATEGORIES } from "@/data/mockBusinesses";
import { BusinessCategory } from "@/types/directory";

interface AddBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddBusinessModal: React.FC<AddBusinessModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<BusinessCategory>("home-services");
  const [city, setCity] = useState("İstanbul");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [isAiEnriching, setIsAiEnriching] = useState(false);
  const [dunsGenerated, setDunsGenerated] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleAiAutoFill = () => {
    if (!name) return;
    setIsAiEnriching(true);
    setTimeout(() => {
      setDescription(
        `${name}, sektör standartlarında müşteri odaklı kaliteli hizmet sunan, yüksek puanlı ve güvenilir uzman kadrosuyla faaliyet gösteren onaylı bir işletmedir.`
      );
      setDunsGenerated(true);
      setIsAiEnriching(false);
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800 bg-gradient-to-r from-indigo-50/50 to-white dark:from-zinc-950 dark:to-zinc-900">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                İşletmenizi Ekleyin & Kaydedin
              </h3>
              <p className="text-[11px] text-zinc-500">
                Manta / Yellow Pages / Brownbook / D&B Standartlarında Global Listeleme
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h4 className="text-lg font-bold text-zinc-900 dark:text-white">
              İşletmeniz Doğrulama Sırasına Alındı!
            </h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 max-w-sm mx-auto">
              <strong>{name}</strong> için yapay zeka profili ve D&B sicil puanlama motoru çalıştırıldı. Profiliniz yayına hazırlandı.
            </p>
            <div className="rounded-xl bg-zinc-50 p-4 text-xs text-zinc-500 dark:bg-zinc-800/50">
              NexusBiz AI ile Google SEO, Yelp ve Booksy randevu sisteminiz otomatik aktif edilir.
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-zinc-900 py-3 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
            >
              Tamam
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            
            {/* Business Name & AI enrich */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Resmi İşletme veya Marka Adı
                </label>
                <button
                  type="button"
                  onClick={handleAiAutoFill}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" /> AI ile Otomatik Doldur
                </button>
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Anadolu Mutfak & Restoran A.Ş."
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            {/* Category & City */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Faaliyet Sektörü
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                >
                  {DIRECTORY_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Şehir / İlçe
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="İstanbul / Kadıköy"
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>

            {/* Phone & Website */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  İletişim Telefonu
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+90 212 000 0000"
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Web Sitesi (Opsiyonel)
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://isletme.com"
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                İşletme Tanıtım Yazısı & Hizmet Özeti
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Verilen hizmetler, tecrübe yılı, referanslar..."
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            {/* B2B / D&B Trust Badge Preview */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>D&B Ticari Sicil & Doğrulama Rozeti</span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                Profiliniz oluşturulduğunda Manta ve Yellow Pages ağlarına ücretsiz kayıt yapılır ve yapay zeka güven analizi gerçekleştirilir.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full rounded-xl bg-zinc-900 py-3 text-xs font-semibold text-white shadow-md transition hover:bg-zinc-800 active:scale-95 dark:bg-white dark:text-zinc-900"
            >
              İşletme Profilini Ücretsiz Yayınla
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
