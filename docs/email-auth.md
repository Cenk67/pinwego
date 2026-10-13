# E-posta ve hesap güvenliği

Mevcut tarayıcı oturumu ve hesap KV kaydı durur. Yeni bir kimlik sağlayıcısı yok. Veritabanı migration yok.

## Ne değişir

- Posta bağlıyken yeni müşteri ve işletme kaydı `emailVerified: false` ile açılır. Hesap, tek kullanımlık bağlantı onaylanmadan oturum açmaz.
- Bağlantı ve şifre sıfırlama belirteci düz metin olarak saklanmaz. KV’de yalnızca SHA-256 özeti ve süre durur. Doğrulama 24 saat, sıfırlama 1 saattir. Kullanım aynı hesap yazısında silinir.
- Eski kayıtlarda `emailVerified` alanı yoktur. Bu hesaplar doğrulanmış sayılır ve giriş yapmaya devam eder.
- Şifre değişince `credentialVersion` artar. Diğer cihaz bir sonraki açılışta oturumu kapatır. Sunucu kapalıysa yerel oturum düşmez.
- Şifre sıfırlama, adres kayıtlı olsun ya da olmasın aynı cümleyi döner.
- Turnstile gizli anahtarı varken kayıt, yeniden gönderim ve şifre sıfırlama Siteverify olmadan ilerlemez. Anahtar yokken bu adımlar eski hâliyle açıktır.
- Gönderen `hesap@pinwego.com` (Cloudflare Email Service). Yanıt adresi `destek@pinwego.com`. İşletme mektubunda `satis@pinwego.com` da yazar. `RESEND_API_KEY` varsa ve Worker e-posta bağlamı yoksa Resend yedek kalır.
- Resend başarısı teslimat değildir. 5xx ve 429 için üç deneme vardır. Gönderim kaydı amaç, durum, deneme sayısı ve e-posta özetinden ibarettir; gövde ve belirteç yazılmaz.
- Geliştirmede anahtar yoksa mektup `/onizleme/posta` kutusuna düşer. Üretimde bu sayfa yoktur.

## Sizin tamamlamanız gerekenler

1. Cloudflare Email Service’te `pinwego.com` gönderimi açık kalsın. DNS kayıtları `cf-bounce` altındadır.
2. `destek@pinwego.com` ve `satis@pinwego.com` gelen kutuları, doğrulanmış hesap adresine yönlenir.
3. Cloudflare Turnstile’da `pinwego.com` ve `www.pinwego.com` için bir widget açın.
4. `TURNSTILE_SITE_KEY` ve `TURNSTILE_SECRET_KEY` değerlerini Worker ortamına koyun. Site anahtarı sayfada görünür; gizli anahtar görünmez.

Worker e-posta bağlamı yokken ve `RESEND_API_KEY` boşken üretim davranışı değişmez: yeni kayıt doğrulanmış kabul edilir, şifre e-postası “henüz bağlı değil” der. Bağlam varken yeni kayıt onay mektubu ister.
