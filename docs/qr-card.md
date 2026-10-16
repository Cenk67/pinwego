# QR kartvizit

Müşteri vitrindeki kodu okutur. Adres `https://pinwego.com/q/{kod}` kısa kartı açar. İşletmenin tam sayfasına gitmez. Kod sıra numarası değildir; katalog kimliğinden üretilen 10 karakterlik sabit bir simgedir. Basılan kod, site yayına alındığında aynı adresi açar.

## Architecture

Pinwego’da SQL yoktur. `lib/qr.ts` her işletme kimliği için profil ve vCard kodu, her örnek kampanya için kampanya kodu üretir. Aynı girdi her zaman aynı kodu verir. Katalog ve örnek kampanyalar pakette çözülür. Yeni kayıtların kodu işletme defterindeki kimlikten üretilir; gizli kayıt açılmaz. Kısa kart bu deftere bakar. QR için ayrı bir anahtar yazılmaz.

Olaylar `pinwego.qr.v1` anahtarında, kodu açan tarayıcıda durur. IP, ham tarayıcı kimliği ve kişi verisi yazılmaz. Cihaz yalnızca `mobile` veya `desktop` olarak kabaca ayrılır. Örnek okutmalar paketin içindedir; bu tarayıcıdaki okutmalar üzerine eklenir. Başka telefonun okutması işletme sahibinin paneline düşmez. Blog KV ve önbellek KV yazılmaz.

## Database

`business_qr_codes` ve `business_qr_events` tabloları, göç ve `DROP` yoktur. Kod, tür, işletme ve kampanya kimliği paketteki indekstedir. Olay alanları: kod, işletme, tür, zaman, cihaz, isteğe bağlı kampanya kimliği.

## API

Uzak REST yoktur. `GET /q/{kod}/vcard` `text/vcard` döner ve dosyayı `pinwego-{slug}.vcf` adıyla indirir. Tanınmayan kod 404 verir. Aynı kod için bu çalışan kopyada dakikada 30 indirme sınırı vardır; bu sınır bütün ziyaretçilerin ortak defteri değildir. Kısa kart `GET /q/{kod}`, baskı şablonu `GET /q/{kod}/baski` sayfalarıdır. Çözümleme, vCard metni ve sayaç özeti `lib/qr.ts` içindeki saf fonksiyonlardadır.

## Kart

İşletme sayfasının kenarında aynı kod görünür. Okutma kısa karta gider. Kampanya ayrıntısındaki kare, kampanyanın kendi adresini açar.

Misafir üyelik duvarı görmez. Ad, fotoğraf, sektör, kısa özet, telefon, adres, site, açık veya kapalı, Google Haritalar ve Pinwego profil bağlantısı görünür. Birincil düğme telefonuna kaydeder. İkincil düğme tam profile gider. Altta ücretsiz hesabın profilin kalanını açtığı söylenir; kayıt ve giriş, dönüş adresini işletme sayfasında tutar. Hesabı olmayan biri tam profilde mevcut misafir kapısını görür. Kısa kart bu kapının istisnasıdır, çünkü vCard telefon ve adres ister.

Kampanya kodu aynı kartı açar. Kampanya yayındaysa teklif ve kampanya bağlantısı eklenir. Süresi dolmuşsa bunu söyler.

## Analytics

Sayılan olaylar: `qr_scan`, `qr_landing_view`, `vcard_click`, `vcard_download`, `profile_click`, `login_click`, `register_click`, `register_done`, `campaign_view`, `campaign_use`. Site, kameranın okutmasını sayfayı açmasından ayıramaz. Okutma ve kart görüntüleme, aynı kod için günde bir kez, bu oturumda yazılır. Aynı tür iki saniyeden sık yazılmaz. Panel toplamı, son 7 günü, son 30 günü, vCard indirmesini, profil açılışını, kayıt dönüşümünü ve kampanya görüntüleme ile kullanımını gösterir. Yönetim bütün kartları, işletme bazında sayacı ve en çok okutulanları görür.

## SEO

Kısa kart ve baskı sayfası `noindex, follow` alır. Kanonik adres kısa kartın adresidir. İşletme sayfaları kendi indeks kurallarında kalır. Kısa kart site haritasına eklenmez.

## Security

vCard satır sonu, noktalı virgül, virgül ve ters bölü kaçırılır. Denetim karakterleri silinir. Fotoğraf yalnızca sitedeki göreli bir yolsa mutlak adrese çevrilir. Dosya adı harf, rakam ve kısa çizgi bırakır. Kod `^[a-z2-9]{10}$` dışında çözülmez. İşletme paneli kendi `ownerAccountId` kayıtlarını, yönetim bütün katalog kodlarını görür. Başkasının işletmesi için panel düğmesi yoktur. Gizli anahtar yoktur.

## Deployment

Bu özellik kendiliğinden canlıya çıkmaz. Dağıtım, katalog, blog KV ve önbellek KV silinmeden yapılır. QR için yeni bir KV anahtarı yazılmaz.

## Test

`lib/qr.test.ts` kodun uzunluğunu, kararlılığını, sıra numarası olmadığını, katalogda çakışmadığını, kampanya çözümünü, bozuk kodu, vCard kaçışını, dosya adını, olay aralığını, indirme patlaması sınırını, 7 ve 30 günlük pencereyi ve en çok okutulan işletmeyi doğrular.
