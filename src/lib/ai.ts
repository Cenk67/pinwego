// Hafif, tamamen istemci-içi çalışan "yapay zeka" katmanı:
// - Türkçe doğal dil sorgusunu niyet + filtrelere çevirir (Yelp/Tripadvisor/Thumbtack karması)
// - İşletme ↔ sorgu eşleşme skoru üretir
// - Yorum özetleri çıkarır (reputasyon ekosistemi)

import { BUSINESSES, Business, CATEGORIES } from "@/data/businesses";

export type SearchIntent = {
  categories: string[];
  districts: string[];
  maxPrice?: number;
  minRating?: number;
  needAppointment?: boolean;
  needQuote?: boolean;
  openNow?: boolean;
  nearMe?: boolean;
  keywords: string[];
  explanation: string;
};

const CAT_KEYWORDS: Record<string, string[]> = {
  restoran: ["restoran", "yemek", "kahvaltı", "kafe", "cafe", "kahve", "lokanta", "kebap", "yeme", "brunch", "teras"],
  guzellik: ["kuaför", "kuafor", "berber", "güzellik", "guzellik", "saç", "sac", "makyaj", "cilt", "balyaj", "gelin"],
  "ev-hizmet": ["tesisat", "elektrik", "tadilat", "tamir", "usta", "arıza", "arıza", "peyzaj", "bahçe", "bakım", "metal", "sanayi", "b2b", "toptan"],
  saglik: ["diş", "dis", "dişçi", "implant", "klinik", "doktor", "sağlık", "saglik", "ortodonti"],
  otel: ["otel", "konaklama", "pansiyon", "tatil", "oda", "rezervasyon"],
  oto: ["oto", "araba", "servis", "bakım", "lastik", "ekspertiz", "tamir"],
  temizlik: ["temizlik", "temiz", "ev temiz", "cam sil", "dip köşe"],
  nakliyat: ["nakliyat", "taşıma", "tasima", "taşınma", "evin", "nakliye", "kargo"],
  spor: ["spor", "fitness", "gym", "pilates", "havuz", "antrenör"],
  evcil: ["veteriner", "pet", "kedi", "köpek", "pati", "acil", "kuaför hayvan"],
  hukuk: ["avukat", "hukuk", "dava", "kira", "danışman", "muhasebe", "mali"],
  etkinlik: ["fotoğraf", "fotograf", "düğün", "dugun", "nişan", "etkinlik", "drone", "albüm", "dekorasyon"],
};

const DISTRICTS = [
  "kadıköy", "kadikoy", "beşiktaş", "besiktas", "üsküdar", "uskudar", "şişli", "sisli",
  "bakırköy", "bakirkoy", "ataşehir", "atasehir", "sarıyer", "sariyer", "levent",
  "kızılay", "kizilay", "çankaya", "cankaya", "alsancak", "karşıyaka", "karsiyaka",
  "kaş", "kas", "yenimahalle", "nilüfer", "nilufer",
];

export function parseQuery(raw: string): SearchIntent {
  const q = raw.toLocaleLowerCase("tr");
  const categories: string[] = [];
  for (const [slug, keys] of Object.entries(CAT_KEYWORDS)) {
    if (keys.some((k) => q.includes(k))) categories.push(slug);
  }
  const districts: string[] = [];
  for (const d of DISTRICTS) {
    if (q.includes(d)) {
      const norm = d
        .replace("kadikoy", "Kadıköy")
        .replace("kadıköy", "Kadıköy")
        .replace("besiktas", "Beşiktaş")
        .replace("beşiktaş", "Beşiktaş");
      if (!districts.includes(norm)) districts.push(norm);
    }
  }

  let maxPrice: number | undefined;
  if (/ucuz|uygun|ekonomik|öğrenci|ogrenci/.test(q)) maxPrice = 1;
  else if (/lüks|luks|premium|butik|özel/.test(q)) maxPrice = 3;

  let minRating: number | undefined;
  if (/en iyi|en yüksek|5 yıldız|tavsiye|öner/.test(q)) minRating = 4.7;
  else if (/iyi|kaliteli|güvenilir|puanı yüksek/.test(q)) minRating = 4.5;

  const needAppointment = /randevu|rezervasyon|rezerv|ayırt/.test(q);
  const needQuote = /teklif|fiyat al|ücret|keşif|tahmin/.test(q);
  const openNow = /açık|acik|şimdi|simdi|nöbetçi|7\/24|pazar günü/.test(q);
  const nearMe = /yakınım|yakınımda|yakın|çevrem|konum/.test(q);

  const keywords = raw.split(/\s+/).filter((w) => w.length > 3).slice(0, 6);

  const parts: string[] = [];
  if (categories.length) {
    const labels = categories.map((s) => CATEGORIES.find((c) => c.slug === s)?.label).join(", ");
    parts.push(`${labels} kategorisinde`);
  }
  if (districts.length) parts.push(`${districts.join(", ")} çevresinde`);
  else if (nearMe) parts.push("konumunuza en yakın");
  if (minRating) parts.push(`${minRating}★ üzeri puanlı`);
  if (maxPrice === 1) parts.push("bütçe dostu");
  if (needAppointment) parts.push("anında randevulu");
  if (needQuote) parts.push("teklif alınabilen");
  if (openNow) parts.push("şu an açık");
  const explanation = parts.length
    ? `Aramanızı şöyle anladım: ${parts.join(" • ")}. Sonuçları yapay zekâ eşleşme skoruna göre sıraladım.`
    : "Aramanızı genel olarak taradım; dilerseniz kategori, semt veya 'randevulu / uygun fiyatlı / şu an açık' gibi detay ekleyin, listeyi daraltayım.";

  return { categories, districts, maxPrice, minRating, needAppointment, needQuote, openNow, nearMe, keywords, explanation };
}

export function matchScore(b: Business, intent: SearchIntent, raw: string): number {
  let s = b.rating * 12;
  s += Math.min(b.reviewCount / 120, 18);
  if (intent.categories.includes(b.category)) s += 30;
  if (intent.districts.length) {
    const hit = intent.districts.some((d) => b.district.toLocaleLowerCase("tr").includes(d.toLocaleLowerCase("tr").slice(0, 5)));
    if (hit) s += 22;
  }
  if (intent.nearMe) s += Math.max(0, 16 - b.distanceKm * 1.6);
  if (intent.maxPrice === 1 && b.priceLevel === 1) s += 12;
  if (intent.maxPrice === 3 && b.priceLevel === 3) s += 10;
  if (intent.minRating && b.rating >= intent.minRating) s += 14;
  if (intent.needAppointment && b.acceptsAppointment) s += 10;
  if (intent.needQuote && b.acceptsQuote) s += 10;
  if (intent.openNow && b.hours.some((h) => h.openNow)) s += 8;
  if (b.premium) s += 6;
  if (b.verified) s += 4;
  const q = raw.toLocaleLowerCase("tr");
  for (const t of b.tags) {
    const first = t.split(" ")[0];
    if (q.includes(first.slice(0, 5))) s += 5;
  }
  return Math.round(s);
}

export type AIResult = { business: Business; score: number; reason: string };

export function aiSearch(raw: string): { intent: SearchIntent; results: AIResult[] } {
  const intent = parseQuery(raw);
  const scored = BUSINESSES.map((b) => {
    const score = matchScore(b, intent, raw);
    const reasons: string[] = [];
    if (intent.categories.includes(b.category)) reasons.push("kategoriye tam uyum");
    if (intent.nearMe && b.distanceKm < 5) reasons.push(`${b.distanceKm} km yakınlık`);
    if (intent.minRating && b.rating >= (intent.minRating ?? 0)) reasons.push(`${b.rating}★ yüksek puan`);
    if (intent.needAppointment && b.acceptsAppointment) reasons.push("anında randevu");
    if (intent.needQuote && b.acceptsQuote) reasons.push("online teklif");
    if (b.premium) reasons.push("öne çıkan işletme");
    if (!reasons.length) reasons.push(`${b.reviewCount} yorum • ${b.rating}★`);
    return { business: b, score, reason: reasons.slice(0, 2).join(" + ") };
  });

  let results = scored.sort((a, b) => b.score - a.score);

  if (intent.categories.length) results = [...results.filter((r) => intent.categories.includes(r.business.category)), ...results.filter((r) => !intent.categories.includes(r.business.category))].slice(0, results.length);
  if (intent.minRating) results = results.filter((r) => r.business.rating >= (intent.minRating ?? 0) || r.score > 70);

  return { intent, results };
}

export function summarizeReviews(b: Business): { summary: string; pros: string[]; cons: string[]; sentiment: number } {
  const avg = b.reviews.reduce((a, r) => a + r.rating, 0) / Math.max(1, b.reviews.length);
  const text = b.reviews.map((r) => r.text).join(" ").toLocaleLowerCase("tr");
  const pros: string[] = [];
  const cons: string[] = [];
  if (/hızlı|dakika|hemen|aynı gün/.test(text)) pros.push("Hızlı servis");
  if (/temiz|pırıl|hijyen|düzen/.test(text)) pros.push("Temizlik & düzen");
  if (/fiyat|ücret|uygun|şeffaf|performans/.test(text)) pros.push("Şeffaf fiyat");
  if (/ilgili|nazik|güler|bilgi/.test(text)) pros.push("İlgili ekip");
  if (/lezzet|tat|kalite|harika|efsane/.test(text)) pros.push("Yüksek lezzet/kalite");
  if (pros.length < 2) pros.push("Genel memnuniyet yüksek", "Tekrar tercih ediliyor");
  if (/kalabalık|sıra|yoğun/.test(text)) cons.push("Yoğun saatlerde sıra olabilir");
  if (/park|otopark/.test(text)) cons.push("Otoparkı kontrol edin");
  if (!cons.length) cons.push("Belirgin bir şikâyet yok");
  const summary = `${b.reviewCount} değerlendirmede ${b.rating}★ ortalama. Yapay zekâ ${b.reviews.length} öne çıkan yorumu okudu: müşteriler özellikle “${pros[0]?.toLocaleLowerCase("tr")}” vurguluyor.`;
  return { summary, pros: pros.slice(0, 3), cons: cons.slice(0, 2), sentiment: Math.round((avg / 5) * 100) };
}

export const AI_QUICK_PROMPTS = [
  "Pazar günü açık kuaför öner",
  "Yakınımda 7/24 tesisatçı bul",
  "Bütçe dostu kahvaltı mekânı",
  "Şehirlerarası nakliyat için teklif al",
  "En yüksek puanlı veteriner",
];
