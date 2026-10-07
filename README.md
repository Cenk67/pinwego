# Pinora

Yakındaki işletmeyi tek cümleyle bulan, mobil uyumlu bir ticari rehber. Arama, yorum, fiyat, harita, randevu ve teklif aynı akışta durur.

Katalog örnek kayıtlardan oluşur. Eşleştirme tarayıcıda çalışır; harici bir model anahtarı gerekmez.

## Çalıştırma

Node.js 20.9 veya daha yenisi gerekir.

```bash
npm install
npm run dev
```

Site [http://127.0.0.1:43123](http://127.0.0.1:43123) adresinde açılır. `localhost:3000` bu projede kullanılmıyor.

Açılmazsa:

- `npm install` bittikten sonra komutu proje klasörünün içinde çalıştır.
- Port doluysa terminaldeki adresi kullan. Başka bir porta almak için: `npx next dev --hostname 0.0.0.0 --port 43124`
- Eski bir Node sürümü `next: command not found` veya derleme hatası verirse Node 20.9+ kur.

## Ne var?

- Doğal dille arama: semt, bütçe, aciliyet ve kategori aynı cümleden okunur.
- İşletme profili: fotoğraf, puan, yorum, saat, hizmet fiyatı, doğrulama ve öne çıkan rozeti.
- Harita: pinler işletmenin enlem ve boylamına göre Google Haritalar üzerinde durur; yakınlık semte göre ayarlanır. Yol tarifi Google Haritalar’ı açar.
- Talep: işi yaz, üç kayıt fiyat aralığı ve gerekçeyle gelsin; randevu ya da teklif bu tarayıcıda saklanır.
- Karşılaştırma: kaydettiğin işletmeleri yan yana bak.
- Kendi kaydın: işletme ekle formu aramaya düşer ve yalnızca bu tarayıcıda durur.
- Asistan: aynı eşleştiriciyle kısa bir sohbet.

Fotoğraflar Unsplash kaynaklıdır.
