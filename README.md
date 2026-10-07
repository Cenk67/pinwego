# RehberIQ — Yapay Zekâlı Ticari Firma Rehberi

Listedeki 20 küresel rehberin (Yelp, Tripadvisor, MapQuest, Whitepages, Booksy, Thumbtack, Dun & Bradstreet, Yellow Pages, Angi, Houzz, Brownbook, TaskRabbit, HomeAdvisor, Manta, Kompass, Infobel, Loc8NearMe, MerchantCircle, Hotfrog, Cybo) en iyi özellikleri tek mobil uyumlu web uygulamasında birleştirildi.

## Özellik → İlham tablosu

| Özellik | İlham |
|---|---|
| Arama + yorum + fotoğraf + işletme profili | Yelp |
| Yapay zekâ yorum özeti + itibar paneli | Tripadvisor |
| Yakınımda filtresi + mesafe + yol tarifi | MapQuest, Loc8NearMe |
| Hızlı kişi/firma/telefon araması | Whitepages, Infobel |
| Hizmet → fiyat → anında randevu | Booksy |
| İhtiyaç yaz → uzman eşleşmesi (Teklif Al) | Thumbtack, TaskRabbit |
| B2B künye (kuruluş, çalışan, ihracat) | Dun & Bradstreet, Kompass |
| Kategori dizini + sponsorlu vitrin | Yellow Pages US, Manta, Hotfrog, Cybo, Brownbook |
| Teklif topla + karşılaştır | Angi, HomeAdvisor |
| Fotoğraf galerisi + proje vitrini | Houzz |
| Profil + yerel pazarlama (ücretsiz listele) | MerchantCircle |

## Sayfalar

- `/` — AI asistan + hero arama + kategoriler + öneriler
- `/kesfet` — AI skorlu sonuçlar, filtreler (açık / randevulu / teklifli / puan), sıralama
- `/isletme/[id]` — profil, hizmet+fiyat, yorumlar, fotoğraflar, B2B künye, randevu/teklif modalı
- `/teklif-al` — 3 adımlı akıllı eşleşme akışı
- `/isletme-ekle` — ücretsiz işletme kaydı
- `/api/ai-search?q=...` — JSON AI arama API'si

## Çalıştırma

```bash
npm install
npm run dev      # http://localhost:43127
npm run build
```

AI katmanı (`src/lib/ai.ts`) tamamen istemcide çalışır; harici anahtar gerekmez. Randevu/teklif/yorum/favoriler `localStorage`'da saklanır.
