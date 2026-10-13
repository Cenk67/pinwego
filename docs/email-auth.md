# E-posta ve hesap güvenliği

Mevcut tarayıcı oturumu ve hesap KV kaydı durur. Yeni bir kimlik sağlayıcısı yok. Veritabanı migration yok.

## Ne değişir

- Posta bağlıyken yeni müşteri ve işletme kaydı `emailVerified: false` ile açılır. Hesap, tek kullanımlık bağlantı onaylanmadan oturum açmaz.
- Bağlantı ve şifre sıfırlama belirteci düz metin olarak saklanmaz. KV’de yalnızca SHA-256 özeti ve süre durur. Doğrulama 24 saat, sıfırlama 1 saattir. Kullanım aynı hesap yazısında silinir.
- Eski kayıtlarda `emailVerified` alanı yoktur. Bu hesaplar doğrulanmış sayılır ve giriş yapmaya devam eder.
- Şifre değişince `credentialVersion` artar. Diğer cihaz bir sonraki açılışta oturumu kapatır. Sunucu kapalıysa yerel oturum düşmez.
- Şifre sıfırlama, adres kayıtlı olsun ya da olmasın aynı cümleyi döner.
- Turnstile gizli anahtarı varken kayıt, yeniden gönderim ve şifre sıfırlama Siteverify olmadan ilerlemez. Anahtar yokken bu adımlar eski hâliyle açıktır.
- Gönderen `EMAIL_FROM` (varsayılan `Pinwego <hesap@pinwego.com>`), yanıt adresi `destek@pinwego.com`. İşletme mektubunda `satis@pinwego.com` da yazar.
- Resend başarısı teslimat değildir. 5xx ve 429 için üç deneme vardır. Gönderim kaydı amaç, durum, deneme sayısı ve e-posta özetinden ibarettir; gövde ve belirteç yazılmaz.
- Geliştirmede anahtar yoksa mektup `/onizleme/posta` kutusuna düşer. Üretimde bu sayfa yoktur.

## Sizin tamamlamanız gerekenler

1. Resend’de `pinwego.com` alanını doğrulayın. SPF ve DKIM kayıtlarını DNS’e ekleyin.
2. `hesap@pinwego.com` gönderen adresini doğrulayın. İsterseniz `EMAIL_FROM` değerini değiştirin.
3. `RESEND_API_KEY` değerini Worker gizli değişkeni olarak ekleyin. Repoya yazmayın.
4. Cloudflare Turnstile’da `pinwego.com` ve `www.pinwego.com` için bir widget açın.
5. `TURNSTILE_SITE_KEY` ve `TURNSTILE_SECRET_KEY` değerlerini Worker ortamına koyun. Site anahtarı sayfada görünür; gizli anahtar görünmez.
6. `destek@pinwego.com` ve `satis@pinwego.com` kutularını açın. Kod bu adreslere pazarlama postası göndermez.

Anahtarlar boşken üretim davranışı değişmez: yeni kayıt doğrulanmış kabul edilir, şifre e-postası “henüz bağlı değil” der.
