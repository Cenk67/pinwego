"use client";

import React, { useState } from "react";
import { 
  Bot, 
  Sparkles, 
  Send, 
  X, 
  ArrowRight, 
  Building2, 
  CheckCircle, 
  Calendar,
  FileSpreadsheet,
  Coins
} from "lucide-react";
import { BusinessItem } from "@/types/directory";
import { generateInstantAIQuote } from "@/lib/aiMatchEngine";
import { MOCK_BUSINESSES } from "@/data/mockBusinesses";
import { formatPrice } from "@/lib/utils";

interface AIMatchmakerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBusiness: (biz: BusinessItem) => void;
  onRequestQuote: (biz?: BusinessItem) => void;
}

export const AIMatchmakerDrawer: React.FC<AIMatchmakerDrawerProps> = ({
  isOpen,
  onClose,
  onSelectBusiness,
  onRequestQuote,
}) => {
  const [userInput, setUserInput] = useState("");
  const [matchedResults, setMatchedResults] = useState<{
    matches: { business: BusinessItem; matchReason: string; matchPct: number }[];
    instantQuote: any;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!isOpen) return null;

  const handleAnalyze = () => {
    if (!userInput.trim()) return;
    setIsAnalyzing(true);

    setTimeout(() => {
      const lower = userInput.toLowerCase();
      const instantQuote = generateInstantAIQuote("Genel", userInput, userInput, "Orta Seviye");

      // Score businesses based on inquiry
      const matches = MOCK_BUSINESSES.map((biz) => {
        let matchPct = 70;
        let matchReason = "Sektör tecrübesi ve doğrulanmış kullanıcı memnuniyeti ile önerildi.";

        if (lower.includes("tadilat") || lower.includes("ev") || lower.includes("mimar")) {
          if (biz.category === "home-services") {
            matchPct = 98;
            matchReason = "Apex Yapı 3D render, sözleşmeli sabit fiyat garantisi ve anahtar teslim uzmanlığıyla %98 eşleşti.";
          }
        } else if (lower.includes("restoran") || lower.includes("yemek") || lower.includes("gurme") || lower.includes("romantik")) {
          if (biz.category === "restaurants") {
            matchPct = 96;
            matchReason = "Lumière Bistro şefin tadım menüsü ve lüks ambiyans puanıyla en yüksek skoru aldı.";
          }
        } else if (lower.includes("b2b") || lower.includes("yapay zeka") || lower.includes("yazılım") || lower.includes("şirket")) {
          if (biz.category === "b2b-consulting" || biz.category === "tech-creative") {
            matchPct = 97;
            matchReason = "Dun & Bradstreet kurumsal güven skoru 99 ve SOC 2 sertifikasyonuyla mükemmel uyum.";
          }
        } else if (lower.includes("araba") || lower.includes("oto") || lower.includes("bakım") || lower.includes("servis")) {
          if (biz.category === "automotive") {
            matchPct = 95;
            matchReason = "Bilgisayarlı diagnostik ve orijinal parça garantili servis altyapısı.";
          }
        } else if (lower.includes("spa") || lower.includes("cilt") || lower.includes("masaj") || lower.includes("estetik")) {
          if (biz.category === "beauty-wellness" || biz.category === "health-medical") {
            matchPct = 96;
            matchReason = "FDA onaylı klinik teknolojileri ve Booksy anında takvim rezervasyonu.";
          }
        }

        return {
          business: biz,
          matchReason,
          matchPct
        };
      })
      .sort((a, b) => b.matchPct - a.matchPct)
      .slice(0, 3);

      setMatchedResults({
        matches,
        instantQuote
      });
      setIsAnalyzing(false);
    }, 600);
  };

  const sampleInquiries = [
    "Kadıköy'de 3+1 daire mutfak ve banyo tadilatı yaptırmak istiyorum, anahtar teslim.",
    "Nişantaşı'nda romantik bir akşam yemeği için 2 kişilik gurme restoran arıyorum.",
    "Şirketimiz için kurumsal yapay zeka ve LLM entegrasyonu danışmanlığı arıyoruz.",
    "Beşiktaş'ta cumartesi günü için derin cilt bakımı ve spa masajı randevusu."
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800 bg-gradient-to-r from-indigo-50/50 to-white dark:from-zinc-950 dark:to-zinc-900">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                NexusBiz AI Akıllı Eşleştirici
                <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Thumbtack + Angi Modeli
                </span>
              </h3>
              <p className="text-[11px] text-zinc-500">
                İhtiyacınızı serbestçe yazın, AI en doğru işletmeleri ve tahmini bütçeyi çıkarsın.
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Prompt Input Box */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-950 dark:bg-zinc-800/40">
            <label className="block text-xs font-bold text-indigo-950 dark:text-indigo-200 mb-1.5">
              Nasıl bir hizmete veya işletmeye ihtiyacınız var?
            </label>
            <textarea
              rows={3}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Örn: 'Suadiye'de komple ev tadilatı için güvenilir, mimari render veren bir ekip arıyorum, bütçemiz esnek.'"
              className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            />
            
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] text-zinc-400">
                Thumbtack & Angi usulü otomatik RFQ oluşturur.
              </span>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !userInput.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5 animate-spin" />
                    <span>AI Analiz Ediyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Eşleştir ve Fiyat Çıkar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Suggestions if no results */}
          {!matchedResults && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                Örnek Aramaları Deneyin:
              </span>
              {sampleInquiries.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setUserInput(sample);
                  }}
                  className="w-full text-left rounded-xl border border-zinc-200 p-3 text-xs text-zinc-700 transition hover:border-indigo-300 hover:bg-indigo-50/30 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                >
                  "{sample}"
                </button>
              ))}
            </div>
          )}

          {/* Analysis Results Display */}
          {matchedResults && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Instant Market Intelligence & Pricing Estimate */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-950 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      Yapay Zeka Rayiç & Fiyat Tahmini
                    </span>
                  </div>
                  <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                    %{matchedResults.instantQuote.aiConfidenceScore} Güven
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-white p-2.5 shadow-xs dark:bg-zinc-800">
                    <span className="text-zinc-400 text-[10px] block">Tahmini Piyasa Bütçesi</span>
                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                      {matchedResults.instantQuote.estimatedPriceRange}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 shadow-xs dark:bg-zinc-800">
                    <span className="text-zinc-400 text-[10px] block">Ortalama Tamamlanma</span>
                    <span className="text-sm font-bold text-zinc-800 dark:text-white">
                      {matchedResults.instantQuote.completionDuration}
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-zinc-600 dark:text-zinc-300 space-y-1">
                  {matchedResults.instantQuote.aiInsights.map((ins: string, i: number) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{ins}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Matched Businesses */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                    Eşleşen En İyi Uzman İşletmeler ({matchedResults.matches.length})
                  </h4>
                  <button
                    onClick={() => onRequestQuote()}
                    className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Hepsine Tek Seferde Teklif Gönder →
                  </button>
                </div>

                <div className="space-y-3">
                  {matchedResults.matches.map((item, idx) => (
                    <div
                      key={item.business.id}
                      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 hover:border-indigo-300 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.business.logo}
                            alt=""
                            className="h-10 w-10 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700"
                          />
                          <div>
                            <h5 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white">
                              {item.business.name}
                            </h5>
                            <span className="text-[11px] text-zinc-500">
                              {item.business.location.city} • ★ {item.business.rating} ({item.business.reviewCount} yorum)
                            </span>
                          </div>
                        </div>

                        <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 shrink-0">
                          %{item.matchPct} Uyum
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300 italic">
                        "{item.matchReason}"
                      </p>

                      <div className="mt-3 flex items-center justify-end gap-2 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
                        <button
                          onClick={() => {
                            onClose();
                            onSelectBusiness(item.business);
                          }}
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                        >
                          Profili Gör
                        </button>
                        <button
                          onClick={() => {
                            onClose();
                            onRequestQuote(item.business);
                          }}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs"
                        >
                          Teklif İste
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
