# Lumina — 20 Global Rehberden İlham Alan Yapay Zekâlı Mobil Ticari Firma Rehberi

Dünyanın en büyük 20 ticari ve yerel rehberinin (Yelp, Tripadvisor, MapQuest, Whitepages, Booksy, Thumbtack, Dun & Bradstreet, Yellow Pages, Angi, Houzz, TaskRabbit vb.) en güçlü yönlerini yapay zekâ yetenekleriyle birleştiren mobil uyumlu modern web rehberi.

## 🌟 20 Global Rehberden Alınan Özellikler & Lumina AI

| Global Rehber | Aylık Trafik | Öne Çıkan Özellik | Lumina Entegrasyonu |
| :--- | :--- | :--- | :--- |
| **1. Yelp** | 128.8M | Arama + yorum + fotoğraf + işletme profili | Ziyaretçi fotoğraf galerisi, yıldızlı puanlama, doğrulanmış profiller |
| **2. Tripadvisor** | 106.8M | Güçlü yorum / reputasyon ekosistemi | LLM tabanlı kullanıcı yorumu konsensüs analizi ve özetleme |
| **3. MapQuest** | 35.5M | Harita + yol tarifi + lokal arama | Harita paneli, koordinat ve mahalle bazlı mesafe / yol tarifi |
| **4. Whitepages** | 33.6M | Büyük veri tabanı ve arama | Doğrulanmış telefon, adres ve kurumsal künye verisi |
| **5. Booksy** | 14.2M | Firma → hizmet → fiyat → randevu | Hizmet seçimi, şeffaf fiyat ve canlı takvim slotuyla online randevu |
| **6. Thumbtack** | 8.8M | Talep oluşturma + uzman eşleştirme | Doğal dil talebini analiz edip eşleşen uzmanlara teklif dağıtma |
| **7. Dun & Bradstreet**| ~8.3M | B2B veri + ticari istihbarat | D-U-N-S®, kuruluş yılı, çalışan sayısı, ciro ve ihracat pazarı kartı |
| **8. Yellow Pages US**| 6.5M | Klasik rehber + arama + reklam | A-Z sektörel kategori taksonomisi ve öne çıkan sponsorlu vitrin |
| **9. Angi / HomeAdvisor**| ~6.8M / 2.1M | Ev hizmetleri + teklif toplama | Sabit fiyat garantili usta ve ev hizmetleri teklif motoru |
| **10. Houzz** | 5.5M | İçerik + görsel + firma + ürün | Proje görselleri, tamamlanma süresi ve bütçe aralıkları |
| **11. Brownbook** | ~4.5M | Çoklu ülke firma dizini | Ülke, şehir ve bölge bazlı dizin ağacı |
| **12. TaskRabbit** | 3.0M | İhtiyaç → uzman → fiyat → işlem | Dakikalık/saatlik hizmet süresi ve sabit ücretlendirme |
| **13. Manta** | 2.1M | Ücretsiz liste + premium görünürlük | 2 dakikada ücretsiz işletme kaydı formu (yerel depolama) |
| **14. Kompass** | ~2.0M | Sektör/ticari B2B firma veri tabanı | İhracat hedefleri ve sektör sicil uyumluluğu paneli |
| **15. Infobel** | ~1.5–2M | Çok ülkeli firma/telefon verisi | Uluslararası formatta telefon ve konum dizini |
| **16. Loc8NearMe** | ~1.55M | “Yakınımda” arama + lokal SEO | Anlık açık/kapalı takibi, çalışma saatleri ve mesafe filtresi |
| **17. MerchantCircle** | ~1.2M | Firma profili + yerel pazarlama | Öne çıkan fırsatlar, keşif görüşmeleri ve indirimli servisler |
| **18. Hotfrog** | ~1.05M | Ülke + şehir + sektör dizini | Kapsamlı il/ilçe ve sektör kırılımlı hiyerarşik dizin |
| **19. Cybo** | ~468K | Çok ülkeli yerel firma verisi | Küresel veri şeması ve mobil öncelikli hızlı arayüz |

## Neler var

- **Yapay Zekâ Doğal Dil Arama Motoru:** “Kadıköy’de teraslı restoran”, “acil tesisatçı” veya “ihracat yapan yazılım şirketi” gibi serbest ifadeleri çözümler.
- **Yapay Zekâ Asistanı (`/asistan`):** Kullanıcının ihtiyacına göre anlık işletme önerileri ve eşleşme gerekçeleri sunar.
- **İşletme Detay Profili:** Fotoğraf galerisi, müşteri yorumları, haftalık çalışma saatleri, interaktif harita ve yol tarifi.
- **Booksy Tarzı Online Randevu:** Hizmet seçimi, usta/uzman ve saat dilimiyle rezervasyon.
- **Thumbtack / Angi Tarzı Teklif Al (`/teklif`):** İhtiyacı anlatıp eşleşen ustalardan fiyat teklifi isteme.
- **Dun & Bradstreet B2B İstihbaratı:** Kuruluş, çalışan sayısı, vergi/sicil ve ciro aralığı.
- **Ülke · Şehir · Sektör Dizini (`/dizin`):** Hotfrog & Brownbook modeli coğrafi hiyerarşi.
- **İşletmeni Ekle (`/kayit`):** Manta modeli ücretsiz firma listeleme.

## Çalıştırma

```bash
npm install
npm run dev
```

Uygulama [http://localhost:43721](http://localhost:43721) adresinde açılır.

```bash
npm run build
npm start
```

## Teknoloji

Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui. Harici API anahtarı veya veritabanı kurulumu gerekmez; demo veriler ve tarayıcı depolamasıyla doğrudan çalışır.
