# Lumina

Yerel restoran rehberi, randevu, hizmet pazaryeri ve B2B firma dizinini tek yapay zekâ katmanında birleştiren mobil uyumlu web uygulaması.

Katalogdaki işletmeler örnek veridir; arama motoru cümleyi kategori, mahalle, fiyat ve niyet (randevu / teklif) olarak okur.

## Neler var

- Doğal dilde arama ve “yakınımda” sıralama
- İşletme profili: fotoğraf, yorum, saat, harita, yol tarifi
- Booksy tarzı randevu (hizmet → usta → saat)
- Thumbtack / Angi tarzı teklif ve uzman eşleştirme
- D&B / Kompass tarzı ticari istihbarat kartı
- Ülke · şehir · sektör dizini
- Ücretsiz işletme kaydı (bu tarayıcıda saklanır)

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

Next.js, TypeScript, Tailwind CSS, shadcn/ui. Harici API anahtarı gerekmez.
