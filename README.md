# pinwego

Yakındaki işletmeyi tek cümleyle bulan, mobil uyumlu bir ticari rehber. Arama, yorum, fiyat, harita, randevu ve teklif aynı akışta durur.

Depo: [https://github.com/Cenk67/pinwego](https://github.com/Cenk67/pinwego)

Katalog örnek kayıtlardan oluşur. Eşleştirme tarayıcıda çalışır; harici bir model anahtarı gerekmez.

## Çalıştırma

Node.js 20.9 veya daha yenisi gerekir. Cloudflare Workers yayını Node.js 22.18 veya daha yenisini ister.

```bash
npm install
npm run dev
```

Site [http://127.0.0.1:43123](http://127.0.0.1:43123) adresinde açılır. `localhost:3000` bu projede kullanılmıyor.

## Cloudflare Workers

Canlı site Cloudflare Workers üzerinde durur. `pinwego.com` ve `www.pinwego.com`, `cloudflare.config.ts` içinde bu Worker’a bağlıdır. Alan adının ad sunucuları zaten Cloudflare’dedir; yayın sırasında DNS kaydı ve sertifika Cloudflare tarafından yazılır.

```bash
npx cf auth login
npm run deploy:vinext
```

`cf auth login` Cloudflare hesabını CLI’ye bağlar. `npm run deploy:vinext` Worker’ı kurar ve `pinwego.com` ile `www.pinwego.com` kayıtlarını ona yazar. Yerel Next.js sunucusu aynı kalır (`npm run dev`). Workers önizlemesi `npm run dev:vinext` ile 43124 portunda açılır.

Açılmazsa:

- `npm install` bittikten sonra komutu proje klasörünün içinde çalıştır.
- Port doluysa terminaldeki adresi kullan. Başka bir porta almak için: `npx next dev --hostname 0.0.0.0 --port 43124`
- Eski bir Node sürümü `next: command not found` veya derleme hatası verirse Node 20.9+ kur.

## Ne var?

- Sektörler: yeme-içme, konaklama, sağlık, temizlik, usta, otomotiv, hukuk, turizm, inşaat ve diğer ticari alanlar dahil 80 civarı hazır sektör. Ana sayfada ara, işletme kaydında seç. Listede yoksa “Sektör ekle” ile yeni sektör yazılır; arama sözcükleri, simge ve kapak seçilir. Özel sektörler bu tarayıcıda kalır.
- Doğal dille arama: semt, bütçe, aciliyet ve kategori aynı cümleden okunur.
- İşletme profili: fotoğraf, puan, yorum, saat, hizmet fiyatı, doğrulama ve öne çıkan rozeti.
- Harita: pinler işletmenin enlem ve boylamına göre Google Haritalar üzerinde durur; yakınlık semte göre ayarlanır. Yol tarifi Google Haritalar’ı açar.
- Konum: Eşleştir yanındaki düğme ülke, bölge, il, ilçe ve semti birbirine bağlı seçer. Seçilen nokta Google Haritalar’da durur. Yakınımdakiler tarayıcı konumunu kullanır. Örnek katalog İstanbul, Ankara, İzmir, Antalya ve Bursa kayıtlarındadır; başka bir yer haritada görünür, liste boş kalabilir.
- Zonguldak: 50 gerçek işletme, açık harita kaydındaki ad, adres, konum ve varsa telefon, site ve saatle durur. Her birinin Google Haritalar bağlantısı vardır. Kartta “İşletme senin mi?” ve “İşletmeyi sahiplen” yazar. Kabul edilirse işletme kaydı bu bilgilerle açılır.
- Talep: işi yaz, üç kayıt fiyat aralığı ve gerekçeyle gelsin; randevu ya da teklif bu tarayıcıda saklanır. Yer adımında bugün / bu hafta / esnek yanında takvimden tarih seçilir; bütçeyi serbest yazarsın. Konum, eşleştirme yanındaki düğmeyle aynıdır: ülke, bölge, il, ilçe, semt ve yakınımdakiler Google Haritalar üzerinde seçilir.
- Paylaş: her işletmenin yanında paylaş düğmesi vardır. Telefonda sistem menüsü bütün uygulamaları açar; değilse WhatsApp, Telegram, X, Facebook, LinkedIn, e-posta, SMS ve bağlantı kopyalama durur.
- Karşılaştırma: kaydettiğin işletmeleri yan yana bak.
- Hesap kapısı: kayıtlı olmayan hesap arama, harita, randevu ve kayıt eklemeyi açamaz. Müşteri T.C. kimlik bilgisi ve teyit belgesi girer. İşletme vergi levhası, imza sirküleri, sicil belgesi ve yetkili kimliğini yükler. Kayıt ve belgeler bu tarayıcıda durur.
- Yönetim: girişte Yönetici girişi vardır (`admin@pinwego.local` / `pinwego-admin`). `/yonetim` panelinden sektör gizleme/ekleme, işletme doğrulama, öne çıkarma, gizleme ve düzenleme, talepleri silme ve hesap belgelerini inceleme yapılır. Değişiklik bu tarayıcıda kalır.
- Kendi kaydın: doğrulanmış işletme hesabı işletme ekle formunu aramaya düşürür; kayıt yalnızca bu tarayıcıda durur.
- Mesajlar: `/mesajlar` içinde işletme aranır, seçilir ve doğrudan yazılır. Kart ve profildeki Mesaj gönder de aynı sohbeti açar. Rahatsız eden sohbette müşteri işletmeyi, işletme müşteriyi veya başka işletmeyi engeller; Engeli kaldır ile yazışma yeniden açılır. Gelen mesajda ekran uyarısı çıkar; izin verilirse tarayıcı bildirimi de gider. Oturum sekme bazlıdır: iki sekmede iki hesap açıp canlı sohbet edilebilir.
- Asistan: aynı eşleştiriciyle kısa bir sohbet.

Fotoğraflar Unsplash kaynaklıdır.
