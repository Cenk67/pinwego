# Kampanya sistemi

Pinwego’nun çalışan modeli SQL, cron ve uzak yapay zekâ kullanmaz. İşletme, hesap ve yönetim bu tarayıcıdadır; paketlenmiş katalog herkese aynı örneği verir. Kampanya da aynı çizgidedir: bir kayıt, iki yerde görünür. Aşağıdaki başlıklar istenen bölümleri bu mimariye göre anlatır.

## Architecture

Tek kampanya kaydı vardır. Örnek kayıtlar `lib/campaigns.ts` içinde paketlenir; arama motoru ve ilk boyama bunları görür. Düzenleme, moderasyon, sayaç ve kupon kullanımı `pinwego.campaigns.v1` anahtarıyla bu tarayıcıda durur. Sunucu anlık görüntüsü yalnızca örnektir, böylece ilk boyama kaymaz. Tarih durumu okunurken hesaplanır (`liveStatus`). Ayrı bir cron yoktur.

Yayındaki ve tarihi süren kayıt işletmenin sayfasında “Güncel kampanyalar” ve `/kampanyalar` listesinde aynı kayıttır. Onaylanmamış, askıdaki, arşivdeki ve süresi dolmuş kayıt aktif listede yoktur.

## Database

SQL tablosu, `DROP` ve KV yazımı yok. Blog ve önbellek ad alanlarına dokunulmaz. Kayıt alanları: başlık, kısa ve uzun metin, görsel, kategori, indirim veya avantaj, başlangıç ve bitiş, kod, koşullar, kullanım sınırı, işletme kopyası (ad, şehir, ilçe, telefon, WhatsApp, site, koordinat), durum, moderasyon notu, öne çıkarma, sponsor ve bitişi, sayaçlar, kuponu kullanan yerel kimlikler, ön kontrol ve denetim izi.

Durumlar: `draft`, `pending_moderation`, `approved`, `rejected`, `published`, `expired`, `archived`, `suspended`. `approved` ve `published` tarih penceresine göre okunur: başlangıçtan önce onaylı, pencerede yayında, bitişten sonra süresi dolmuş. Taslak, moderasyon, red, arşiv ve askı tarih yüzünden yayına çıkmaz.

## API

Uzak REST yoktur. Saf fonksiyonlar `lib/campaigns.ts` içindedir: `liveStatus`, `listPublic`, `moderate`, `reviewCampaign`, `suggestCampaignCopy`, `redeemCoupon`, `createPayment`, `campaignPath`. Arayüz bunları `lib/campaign-store.ts` üzerinden okur ve yazar.

## Moderation

İşletme kendi kaydını oluşturur, taslak tutar ve moderasyona gönderir. Yönetici onaylar, gerekçeyle reddeder, yayından kaldırır, arşivler, öne çıkarır ve sponsor işareti koyar. Red gerekçesi işletmeye görünür. Yayındaki kaydı düzenlemek kaydı yeniden moderasyona alır. İşletme başkasının kaydını ve onay düğmesini kullanamaz. Yönetici bütün kayıtları görür.

Roller uygulamadaki üç roldür: `musteri`, `isletme`, `admin`. Ayrı moderatör veya süper yönetici hesabı açılmaz.

## AI

Ön kontrol bu tarayıcıda, kuralla çalışır. Büyük harf, fazla ünlem, yüzde 90 ve üzeri indirim, kısa metin, eksik görsel, eksik koşul ve bitişin başlangıçtan önce olması uyarı yazar. Uyarı yayını açmaz. Tek cümlelik metin önerisi de yalnızca taslağa yazılır; kendiliğinden yayınlanmaz. Uzak bir modele istek gitmez.

## SEO

`/kampanyalar`, `/kampanyalar/{sehir}`, `/kampanyalar/{kategori}`, `/kampanyalar/{sehir}/{kategori}` ve `/kampanyalar/{sehir}/{kategori}/{slug}`. Şehir ve kategori aynı parçada çözülür; şehir kısa adları ile sektör kimlikleri çakışmaz. Başlık, açıklama ve kanonik adres üretilir. Süresi dolmuş veya yayında olmayan örnek kayıt `noindex` alır. Doğrudan adres, süresi dolduysa bunu söyler. Yayındaki örnek kayıtta Offer JSON-LD vardır.

Süzgeç sorgu ile paylaşılır: `q`, `indirim`, `sirala`, `bitis`, `yakin`.

## Analytics

Görüntüleme günde bir kez, oturumda, kişisel veri olmadan sayılır. Ayrı alanlar: görüntüleme, tıklama, WhatsApp, site, kaydetme, paylaşma, kupon. Kart tıklaması ve ayrıntı görüntüleme ayrı olaydır. Sıra: görüntüleme, tıklama, kaydetme, paylaşma, WhatsApp, doluluk, doğrulanmış işletme, sponsor ve öne çıkarma. Ağırlıklar yönetimdeki eşik formunda durur. Kişiselleştirme kapalıdır; açılırsa yalnızca bu tarayıcıda bakılan kategori öne alınır.

## QR

Ayrıntı sayfası kampanyanın mutlak adresini `uqr` ile SVG çizer. Üçüncü bir görsel servisine istek gitmez.

## Coupon

Kod, yayındaki kayıtta, büyük-küçük harf duymazdan gelinerek eşleşir. Kullanım sınırı ve aynı yerel kimlik ikinci kez engellenir. Bu kimlik rastgeledir, kişi verisi değildir. Başka tarayıcı veya başka kişi için ortak kasa değildir.

## Monetization

Sponsor işareti ve bitiş tarihi yönetici tarafından elle konur. Süre dolunca işaret düşer. Paket fiyatları yalnızca etikettir. `createPayment` PayTR, iyzico ve Stripe için `not_connected` döner. Ücret alınmaz.

## Cron Jobs

Yok. Bitiş tarihi her okumada `expired` üretir. Aktif liste bu kaydı almaz.

## Security

İşletme yalnız kendi `ownerAccountId` değeri veya kendi işlettiği kayıt üzerinde işlem yapar. Yönetici hepsini görür. Telefon, WhatsApp, site ve kupon kullanımı mevcut misafir kapısının arkasındadır. Yakın süzgeç, yer seçicide açılmış konumu kullanır; sessiz konum alınmaz. Görsel bu tarayıcıda JPEG, PNG veya WebP olarak okunur, 1,2 MB üstü reddedilir, uzun kenar 960 piksele indirilir. Gizli anahtar yoktur. Moderasyon kapatılamaz.

## Deployment

Bu özellik canlıya kendiliğinden çıkmaz. Dağıtım, katalog, blog KV ve önbellek KV silinmeden, mevcut `deploy:vinext` adımıyla yapılır. Kampanya kaydı için yeni bir KV anahtarı yazılmaz.

## Test

`lib/campaigns.test.ts` tarih penceresini, moderasyona gönderirken ön kontrolü, işletmenin onaylayamamasını, başkasının kaydını düzenleyememesini, onayın pencerede yayın olması, süresi dolanın listeden çıkmasını, gerekçesiz redi, yayındaki düzenlemenin moderasyona dönüşünü, çakışan kısa adın sonekini, kuponun tek kullanım ve sınırını, adresi ve sponsor sırasını doğrular.
