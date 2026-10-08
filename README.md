# pinwego

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
- Konum: Eşleştir yanındaki düğme ülke, bölge, il, ilçe ve semti birbirine bağlı seçer. Seçilen nokta Google Haritalar’da durur. Yakınımdakiler tarayıcı konumunu kullanır. Örnek katalog İstanbul, Ankara, İzmir, Antalya ve Bursa kayıtlarındadır; başka bir yer haritada görünür, liste boş kalabilir.
- Zonguldak: 50 gerçek işletme, açık harita kaydındaki ad, adres, konum ve varsa telefon, site ve saatle durur. Her birinin Google Haritalar bağlantısı vardır. Kartta “İşletme senin mi?” ve “İşletmeyi sahiplen” yazar. Kabul edilirse işletme kaydı bu bilgilerle açılır.
- Talep: işi yaz, üç kayıt fiyat aralığı ve gerekçeyle gelsin; randevu ya da teklif bu tarayıcıda saklanır. Yer adımı, eşleştirme yanındaki konum düğmesiyle aynıdır: ülke, bölge, il, ilçe, semt ve yakınımdakiler Google Haritalar üzerinde seçilir.
- Paylaş: her işletmenin yanında paylaş düğmesi vardır. Telefonda sistem menüsü bütün uygulamaları açar; değilse WhatsApp, Telegram, X, Facebook, LinkedIn, e-posta, SMS ve bağlantı kopyalama durur.
- Karşılaştırma: kaydettiğin işletmeleri yan yana bak.
- Hesap kapısı: kayıtlı olmayan hesap arama, harita, randevu ve kayıt eklemeyi açamaz. Müşteri T.C. kimlik bilgisi ve teyit belgesi girer. İşletme vergi levhası, imza sirküleri, sicil belgesi ve yetkili kimliğini yükler. Kayıt ve belgeler bu tarayıcıda durur.
- Kendi kaydın: doğrulanmış işletme hesabı işletme ekle formunu aramaya düşürür; kayıt yalnızca bu tarayıcıda durur.
- Asistan: aynı eşleştiriciyle kısa bir sohbet.

Fotoğraflar Unsplash kaynaklıdır.
