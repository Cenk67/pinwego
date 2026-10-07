import { BusinessItem, SearchFilterState } from "@/types/directory";
import { MOCK_BUSINESSES } from "@/data/mockBusinesses";

export interface AISearchResult {
  business: BusinessItem;
  matchScore: number;
  matchReason: string;
  recommendedService?: string;
}

export function searchBusinessesWithAI(
  businesses: BusinessItem[],
  filters: SearchFilterState
): AISearchResult[] {
  const query = filters.query.toLowerCase().trim();

  // If empty query and no specific filters, return all with default high score
  return businesses
    .filter((biz) => {
      // Category filter
      if (filters.category !== 'all' && biz.category !== filters.category) {
        return false;
      }

      // Location filter
      if (filters.location) {
        const locLower = filters.location.toLowerCase();
        const matchesLoc =
          biz.location.city.toLowerCase().includes(locLower) ||
          biz.location.address.toLowerCase().includes(locLower) ||
          (biz.location.neighborhood &&
            biz.location.neighborhood.toLowerCase().includes(locLower));
        if (!matchesLoc) return false;
      }

      // Rating filter
      if (filters.ratingMin > 0 && biz.rating < filters.ratingMin) {
        return false;
      }

      // Instant booking only
      if (filters.instantBookingOnly && !biz.instantBookingEnabled) {
        return false;
      }

      // Verified only
      if (filters.verifiedOnly && !biz.verified) {
        return false;
      }

      // B2B with High Trust only
      if (filters.b2bOnly && (!biz.b2bData || biz.b2bData.creditTrustScore < 90)) {
        return false;
      }

      // Price filter
      if (filters.priceLevel && filters.priceLevel !== 'all' && biz.priceLevel !== filters.priceLevel) {
        return false;
      }

      return true;
    })
    .map((biz) => {
      let score = biz.aiScore;
      let matchReason = `Genel uygunluk skoru: %${biz.aiScore}. Doğrulanmış profil ve yüksek memnuniyet.`;
      let recommendedService = biz.services[0]?.name;

      if (query) {
        let textMatchPoints = 0;

        // Check name
        if (biz.name.toLowerCase().includes(query)) textMatchPoints += 35;
        // Check tagline / subcategory
        if (biz.tagline.toLowerCase().includes(query)) textMatchPoints += 25;
        if (biz.subcategory.toLowerCase().includes(query)) textMatchPoints += 20;

        // Check keywords
        const matchedKeyword = biz.keywords.find((k) => query.includes(k) || k.includes(query));
        if (matchedKeyword) textMatchPoints += 30;

        // Check services
        const matchedService = biz.services.find(
          (s) => s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query)
        );
        if (matchedService) {
          textMatchPoints += 35;
          recommendedService = matchedService.name;
        }

        // Check AI summary
        if (biz.aiSummary.bestFor.some((bf) => bf.toLowerCase().includes(query))) {
          textMatchPoints += 25;
        }

        // Natural language query intent detection
        if (query.includes('acil') || query.includes('hemen') || query.includes('randevu')) {
          if (biz.instantBookingEnabled) {
            textMatchPoints += 20;
            matchReason = 'Anında takvim rezervasyonu ve hızlı geri dönüş süresiyle eşleşti.';
          }
        }

        if (query.includes('ucuz') || query.includes('uygun') || query.includes('ekonomik')) {
          if (biz.priceLevel === '$' || biz.priceLevel === '$$') {
            textMatchPoints += 20;
            matchReason = 'Fiyat/performans beklentinize en uygun seçenek.';
          }
        }

        if (query.includes('lüks') || query.includes('en iyi') || query.includes('vip') || query.includes('kaliteli')) {
          if (biz.rating >= 4.9) {
            textMatchPoints += 25;
            matchReason = 'En yüksek müşteri memnuniyeti (4.9+) ve premium hizmet standartı.';
          }
        }

        if (query.includes('b2b') || query.includes('kurumsal') || query.includes('şirket') || query.includes('fatura')) {
          if (biz.b2bData && biz.b2bData.creditTrustScore >= 90) {
            textMatchPoints += 30;
            matchReason = `D&B onaylı yüksek ticari güven skoru (%${biz.b2bData.creditTrustScore}).`;
          }
        }

        score = Math.min(99, Math.max(65, Math.round((biz.aiScore * 0.5) + (textMatchPoints * 0.7))));
        if (!matchReason.includes('D&B') && !matchReason.includes('rezervasyonu')) {
          matchReason = `Yapay zeka analizine göre "${query}" aramanıza %${score} oranında tam uyumlu.`;
        }
      }

      return {
        business: biz,
        matchScore: score,
        matchReason,
        recommendedService
      };
    })
    .sort((a, b) => {
      if (filters.sortBy === 'rating') return b.business.rating - a.business.rating;
      if (filters.sortBy === 'reviews') return b.business.reviewCount - a.business.reviewCount;
      if (filters.sortBy === 'ai_score') return b.matchScore - a.matchScore;
      // Default: recommended (match score + rating + promoted)
      const scoreA = a.matchScore + (a.business.promoted ? 5 : 0);
      const scoreB = b.matchScore + (b.business.promoted ? 5 : 0);
      return scoreB - scoreA;
    });
}

export function generateInstantAIQuote(
  category: string,
  serviceNeeded: string,
  details: string,
  budgetRange: string
) {
  // Intelligent estimate calculation
  let estimatedPriceRange = '5.000 ₺ - 15.000 ₺';
  let completionDuration = '2 - 4 Gün';
  let recommendedProsCount = 3;
  let aiInsights = [
    'Talebiniz standart piyasa rayicinin optimum bandında.',
    'Bölgenizdeki 3 onaylı ve D&B güven skoru yüksek uzmandan 15 dakika içinde geri dönüş bekleniyor.'
  ];

  const lower = (category + ' ' + serviceNeeded + ' ' + details).toLowerCase();

  if (lower.includes('tadilat') || lower.includes('inşaat') || lower.includes('mutfak') || lower.includes('ev')) {
    estimatedPriceRange = '65.000 ₺ - 180.000 ₺';
    completionDuration = '15 - 30 Gün';
    recommendedProsCount = 4;
    aiInsights = [
      'Komple projelerde 3D modelleme ve sözleşmeli sabit fiyat garantisi önerilir.',
      'Malzeme ve işçilik ayrımı yapılmış şeffaf kalem teklifleri talep edildi.'
    ];
  } else if (lower.includes('yazılım') || lower.includes('ai') || lower.includes('web') || lower.includes('danışmanlık')) {
    estimatedPriceRange = '35.000 ₺ - 120.000 ₺';
    completionDuration = '3 - 6 Hafta';
    aiInsights = [
      'Next.js ve kurumsal bulut mimarisi için SLA garantili destek önerisi hazırlandı.',
      'Veri gizliliği (KVKK & ISO 27001) standartlarına uygun şirketler eşleştirildi.'
    ];
  } else if (lower.includes('araba') || lower.includes('servis') || lower.includes('bakım')) {
    estimatedPriceRange = '3.500 ₺ - 8.500 ₺';
    completionDuration = 'Aynı Gün / 4 Saat';
    aiInsights = [
      'Orijinal OEM parça garantili ve bilgisayarlı diagnostik testi dahil.',
      'Maslak ve çevre oto sanayi lokasyonlarında hızlı randevu müsaitliği var.'
    ];
  } else if (lower.includes('cilt') || lower.includes('spa') || lower.includes('güzellik') || lower.includes('diş')) {
    estimatedPriceRange = '1.500 ₺ - 6.000 ₺';
    completionDuration = '45 - 90 Dakika';
    aiInsights = [
      'FDA onaylı teknolojiler ve hekim konsültasyonu dahil paketler filtrelendi.',
      'Online randevu ile beklemeden hızlı kabule uygun.'
    ];
  }

  return {
    estimatedPriceRange,
    completionDuration,
    recommendedProsCount,
    aiInsights,
    urgencyLevel: details.toLowerCase().includes('acil') ? 'Acil / Aynı Gün Öncelikli' : 'Normal / Esnek',
    aiConfidenceScore: 94
  };
}
