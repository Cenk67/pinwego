"use client";

import React, { useState } from "react";
import { 
  X, 
  FileText, 
  CheckCircle2, 
  Sparkles, 
  Building2, 
  Coins, 
  ShieldCheck,
  Zap
} from "lucide-react";
import { BusinessItem, QuoteRequestFormData } from "@/types/directory";
import { generateInstantAIQuote } from "@/lib/aiMatchEngine";

interface QuoteRequestModalProps {
  business?: BusinessItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QuoteRequestModal: React.FC<QuoteRequestModalProps> = ({
  business,
  isOpen,
  onClose,
}) => {
  const [serviceNeeded, setServiceNeeded] = useState(
    business?.services[0]?.name || "Komple Hizmet & Fiyat Teklifi"
  );
  const [zipOrCity, setZipOrCity] = useState(business?.location.city || "İstanbul");
  const [budgetRange, setBudgetRange] = useState("Orta Düzey (Standart Rayiç)");
  const [details, setDetails] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [aiPreview, setAiPreview] = useState<any>(null);

  if (!isOpen) return null;

  const handleComputeAIPreview = () => {
    if (!details) return;
    const quote = generateInstantAIQuote(
      business?.categoryName || "Genel Hizmet",
      serviceNeeded,
      details,
      budgetRange
    );
    setAiPreview(quote);
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
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800 bg-gradient-to-r from-blue-50/50 to-white dark:from-zinc-950 dark:to-zinc-900">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Akıllı Fiyat Teklifi Al (Thumbtack / Angi RFQ)
              </h3>
              <p className="text-[11px] text-zinc-500">
                {business ? business.name : "Tüm Uygun Eşleşen İşletmelere Gönder"}
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
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h4 className="text-lg font-bold text-zinc-900 dark:text-white">
              Teklif Talebiniz Başarıyla Dağıtıldı!
            </h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 max-w-sm mx-auto">
              Talebiniz yapay zeka tarafından analiz edilerek onaylı işletme profiline yönlendirildi. Ortalama <strong>15 dakika</strong> içinde size özel resmi teklif iletilecektir.
            </p>
            <div className="rounded-xl bg-zinc-50 p-4 text-xs text-zinc-500 dark:bg-zinc-800/50">
              NexusBiz Altyapısı: Talebiniz D&B ve TMMOB onaylı uzmanlara aktarıldı.
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
            
            {/* Service & City */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Talep Edilen Hizmet
                </label>
                <input
                  type="text"
                  required
                  value={serviceNeeded}
                  onChange={(e) => setServiceNeeded(e.target.value)}
                  placeholder="Örn: Komple Mutfak Yenileme"
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Şehir / İlçe
                </label>
                <input
                  type="text"
                  required
                  value={zipOrCity}
                  onChange={(e) => setZipOrCity(e.target.value)}
                  placeholder="Kadıköy, İstanbul"
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>

            {/* Budget Range */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Hedef Bütçe Aralığı
              </label>
              <select
                value={budgetRange}
                onChange={(e) => setBudgetRange(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              >
                <option value="Ekonomik / Uygun Fiyat Odaklı">Ekonomik / Uygun Fiyat Odaklı</option>
                <option value="Orta Düzey (Standart Rayiç)">Orta Düzey (Standart Rayiç)</option>
                <option value="Premium / Birinci Sınıf Malzeme & İşçilik">Premium / Birinci Sınıf Malzeme & İşçilik</option>
                <option value="Kurumsal Sözleşmeli Proje">Kurumsal Sözleşmeli Proje</option>
              </select>
            </div>

            {/* Project Details */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Proje Detayları & Açıklama
                </label>
                <button
                  type="button"
                  onClick={handleComputeAIPreview}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" /> AI Bütçe Hesapla
                </button>
              </div>
              <textarea
                rows={3}
                required
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Örn: 15 m2 mutfak dolabı değişimi, ada tezgah yapımı ve elektrik altyapısı yenilenmesi..."
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            {/* AI Calculation Callout */}
            {aiPreview && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs dark:border-blue-900/50 dark:bg-blue-950/30">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5 text-blue-600" /> Yapay Zeka Ön Bütçe Tahmini:
                  </span>
                  <span className="font-bold text-blue-800 dark:text-blue-300">
                    {aiPreview.estimatedPriceRange}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                  {aiPreview.aiInsights[0]}
                </p>
              </div>
            )}

            {/* Customer Details */}
            <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Adınız & Soyadınız
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Mehmet Can"
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Telefon No (Teklif Bildirimi)
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0532 111 22 33"
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    E-Posta Adresi
                  </label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="mehmet@example.com"
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 py-3 text-xs font-semibold text-white shadow-md transition hover:bg-blue-700 active:scale-95"
            >
              Fiyat Teklifi Talebini Gönder (Ücretsiz)
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
