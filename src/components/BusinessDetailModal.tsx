"use client";

import React, { useState } from "react";
import { 
  X, 
  Star, 
  MapPin, 
  Phone, 
  Globe, 
  Mail, 
  Clock, 
  ShieldCheck, 
  CalendarCheck, 
  Sparkles, 
  FileText, 
  Share2, 
  CheckCircle2, 
  TrendingUp, 
  Building2, 
  Image as ImageIcon,
  MessageSquare
} from "lucide-react";
import { BusinessItem, ServiceItem } from "@/types/directory";
import { formatPrice } from "@/lib/utils";

interface BusinessDetailModalProps {
  business: BusinessItem | null;
  onClose: () => void;
  onBookService: (business: BusinessItem, service?: ServiceItem) => void;
  onRequestQuote: (business: BusinessItem) => void;
}

export const BusinessDetailModal: React.FC<BusinessDetailModalProps> = ({
  business,
  onClose,
  onBookService,
  onRequestQuote,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'portfolio' | 'b2b' | 'reviews'>('overview');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!business) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative flex flex-col h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header Controls */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: business.name,
                  text: business.tagline,
                  url: window.location.href,
                }).catch(() => {});
              }
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-md backdrop-blur-md transition hover:bg-white dark:bg-zinc-800/90 dark:text-zinc-200"
            title="Paylaş"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-md backdrop-blur-md transition hover:bg-white dark:bg-zinc-800/90 dark:text-zinc-200"
            title="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto">
          
          {/* Hero Gallery Slider */}
          <div className="relative h-64 sm:h-80 w-full bg-zinc-900">
            <img
              src={business.gallery[activeImageIndex] || business.coverImage}
              alt={business.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Gallery Thumbnails */}
            {business.gallery.length > 1 && (
              <div className="absolute bottom-4 right-4 flex gap-1.5 z-10">
                {business.gallery.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`h-10 w-14 overflow-hidden rounded-lg border-2 transition ${
                      activeImageIndex === idx ? "border-white scale-105" : "border-transparent opacity-70"
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Profile Overview overlay on image */}
            <div className="absolute bottom-4 left-4 sm:left-6 z-10 text-white max-w-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold">
                  {business.categoryName}
                </span>
                {business.b2bData && (
                  <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> D&B Güven Skoru: {business.b2bData.creditTrustScore}/100
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {business.name}
              </h1>
              <p className="mt-1 text-sm text-zinc-200 line-clamp-1">
                {business.tagline}
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-zinc-200 bg-zinc-50 px-6 py-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/50">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <div>
                <span className="font-bold text-zinc-900 dark:text-white">{business.rating} Puan</span>
                <span className="text-zinc-500 ml-1">({business.reviewCount} yorum)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-indigo-500" />
              <span className="truncate text-zinc-700 dark:text-zinc-300">{business.location.city}, {business.location.country}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-500" />
              <span className="text-emerald-700 font-semibold dark:text-emerald-400">Şu an Açık</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span className="text-indigo-700 font-bold dark:text-indigo-300">%{business.aiScore} Yapay Zeka Endeksi</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-zinc-200 px-6 overflow-x-auto scrollbar-none dark:border-zinc-800">
            {[
              { id: 'overview', label: 'Genel Bakış & AI Özeti' },
              { id: 'services', label: `Hizmetler & Randevu (${business.services.length})` },
              { id: 'portfolio', label: 'Görsel Portfolyo' },
              { id: 'b2b', label: 'D&B Kurumsal İstihbarat' },
              { id: 'reviews', label: `Müşteri Yorumları (${business.reviewCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3.5 px-4 text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Panels */}
          <div className="p-6">
            
            {/* 1. OVERVIEW & AI SYNTHESIS */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                
                {/* AI Executive Card */}
                <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 p-5 dark:border-indigo-900/50 dark:from-zinc-900 dark:to-zinc-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                          NexusBiz Yapay Zeka Konsensüs Özeti
                        </h4>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Yelp, Google, D&B ve doğrulanmış kullanıcı yorumlarının LLM analizi
                        </span>
                      </div>
                    </div>
                    <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">
                      %{business.aiScore} Güven
                    </span>
                  </div>

                  <p className="mt-4 text-xs sm:text-sm text-zinc-700 italic dark:text-zinc-300">
                    "{business.aiSummary.highlightQuote}"
                  </p>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-white p-3 shadow-xs dark:bg-zinc-800">
                      <span className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5 mb-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Güçlü Yönler:
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-zinc-600 dark:text-zinc-300">
                        {business.aiSummary.strengths.map((str, i) => (
                          <li key={i}>{str}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-xl bg-white p-3 shadow-xs dark:bg-zinc-800">
                      <span className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5 mb-1.5">
                        <TrendingUp className="h-4 w-4 text-indigo-600" /> En Uygun Kullanım:
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {business.aiSummary.bestFor.map((bf, i) => (
                          <span key={i} className="rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                            {bf}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact & Map Info (Loc8NearMe / MapQuest Style) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                      İletişim ve Konum (MapQuest / Loc8NearMe)
                    </h4>
                    <div className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-300">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                        <span>{business.location.address}, {business.location.zipCode} {business.location.city} / {business.location.country}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-zinc-400 shrink-0" />
                        <a href={`tel:${business.phone}`} className="hover:text-indigo-600 font-medium">
                          {business.phone}
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-zinc-400 shrink-0" />
                        <a href={business.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                          {business.website.replace('https://', '')}
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-zinc-400 shrink-0" />
                        <span>{business.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                      Çalışma Saatleri
                    </h4>
                    <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                      <div className="flex justify-between">
                        <span>Pazartesi - Cuma:</span>
                        <span className="font-medium text-zinc-900 dark:text-white">{business.hours.monday}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cumartesi:</span>
                        <span className="font-medium text-zinc-900 dark:text-white">{business.hours.saturday}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pazar:</span>
                        <span className="font-medium text-zinc-900 dark:text-white">{business.hours.sunday}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* 2. SERVICES & BOOKING (Booksy / TaskRabbit style) */}
            {activeTab === 'services' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-zinc-500">
                    Hizmet seçerek hemen online takvim randevusu oluşturabilir veya özel fiyat teklifi isteyebilirsiniz.
                  </p>
                </div>

                {business.services.map((srv) => (
                  <div
                    key={srv.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-4 transition hover:border-indigo-300 dark:border-zinc-800 dark:hover:border-indigo-800 bg-white dark:bg-zinc-900"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                          {srv.name}
                        </h4>
                        {srv.instantBookable && (
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Anında Randevu
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {srv.description}
                      </p>
                      {srv.durationMinutes && (
                        <span className="mt-1.5 inline-block text-[11px] text-zinc-400">
                          Süre: {srv.durationMinutes} dakika
                        </span>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-end justify-between w-full sm:w-auto gap-2">
                      <div className="text-right">
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">
                          {srv.price === 0 ? "Ücretsiz Keşif" : formatPrice(srv.price)}
                        </span>
                        {srv.priceType === 'starting_at' && (
                          <span className="text-[10px] text-zinc-400 block">'den başlayan</span>
                        )}
                      </div>

                      {srv.instantBookable ? (
                        <button
                          onClick={() => onBookService(business, srv)}
                          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 active:scale-95"
                        >
                          <CalendarCheck className="h-3.5 w-3.5" />
                          <span>Randevu Al</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onRequestQuote(business)}
                          className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Teklif İste</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. PORTFOLIO (Houzz style) */}
            {activeTab === 'portfolio' && (
              <div className="space-y-4">
                {business.portfolio && business.portfolio.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {business.portfolio.map((item) => (
                      <div key={item.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                        <img src={item.imageUrl} alt={item.title} className="h-48 w-full object-cover" />
                        <div className="p-4">
                          <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{item.title}</h4>
                          <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                            <span>Maliyet: <strong className="text-zinc-800 dark:text-zinc-200">{item.costEstimate}</strong></span>
                            <span>Süre: <strong className="text-zinc-800 dark:text-zinc-200">{item.completionTime}</strong></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-zinc-400 text-xs">
                    Bu işletme için yüklenmiş özel portfolyo projesi bulunamadı.
                  </div>
                )}
              </div>
            )}

            {/* 4. B2B INTELLIGENCE (Dun & Bradstreet, Kompass style) */}
            {activeTab === 'b2b' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-6 w-6 text-emerald-600" />
                      <div>
                        <h4 className="font-bold text-sm text-emerald-950 dark:text-emerald-200">
                          Ticari Sicil ve Kredi İstihbaratı
                        </h4>
                        <span className="text-[11px] text-zinc-500">
                          Dun & Bradstreet / Kompass standartlarında şirket güven verisi
                        </span>
                      </div>
                    </div>
                    <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                      {business.b2bData?.creditTrustScore || 90}/100
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-xl bg-white p-3 dark:bg-zinc-800">
                      <span className="text-zinc-400 block text-[10px]">D-U-N-S® Numarası</span>
                      <span className="font-mono font-bold text-zinc-900 dark:text-white">
                        {business.b2bData?.dunsNumber || "TR-994-0129"}
                      </span>
                    </div>
                    <div className="rounded-xl bg-white p-3 dark:bg-zinc-800">
                      <span className="text-zinc-400 block text-[10px]">Mali Risk Derecesi</span>
                      <span className="font-bold text-emerald-600">
                        {business.b2bData?.riskLevel || "Düşük Risk"}
                      </span>
                    </div>
                    <div className="rounded-xl bg-white p-3 dark:bg-zinc-800">
                      <span className="text-zinc-400 block text-[10px]">Vergi & Hukuk Durumu</span>
                      <span className="font-bold text-zinc-900 dark:text-white">
                        {business.b2bData?.complianceStatus || "Aktif & Temiz"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 p-4 text-xs dark:border-zinc-800 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Kuruluş Yılı:</span>
                    <span className="font-medium text-zinc-900 dark:text-white">{business.foundedYear}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Çalışan Sayısı:</span>
                    <span className="font-medium text-zinc-900 dark:text-white">{business.employeeCount} kişi</span>
                  </div>
                  {business.b2bData?.annualRevenueRange && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Tahmini Yıllık Ciro Hacmi:</span>
                      <span className="font-medium text-zinc-900 dark:text-white">{business.b2bData.annualRevenueRange}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. REVIEWS (Yelp & Tripadvisor style) */}
            {activeTab === 'reviews' && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-zinc-50 p-4 text-xs text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                  <span className="font-bold text-zinc-900 dark:text-white">AI Yorum Konsensüsü: </span>
                  {business.aiSummary.sentimentSummary}
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-zinc-200 p-4 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs">
                          SY
                        </div>
                        <div>
                          <span className="text-xs font-bold text-zinc-900 dark:text-white">Selin Yılmaz</span>
                          <span className="text-[10px] text-emerald-600 ml-2 font-medium">✓ Doğrulanmış Müşteri</span>
                        </div>
                      </div>
                      <div className="flex text-amber-400">
                        {"★".repeat(5)}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                      "Servis kalitesi, personelin güleryüzü ve profesyonelliği tek kelimeyle mükemmeldi. Kesinlikle tekrar tercih edeceğiz."
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Bottom CTA Bar */}
        <div className="border-t border-zinc-200 bg-white p-4 sm:px-6 dark:border-zinc-800 dark:bg-zinc-900 flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-500 block">Ortalama Yanıt Süresi</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {business.estimatedResponseTime}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onRequestQuote(business)}
              className="rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-900 dark:bg-zinc-900 dark:text-indigo-300"
            >
              Fiyat Teklifi İste (RFQ)
            </button>
            <button
              onClick={() => onBookService(business)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-indigo-700 active:scale-95"
            >
              <CalendarCheck className="h-4 w-4" />
              <span>Anında Randevu Oluştur</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
