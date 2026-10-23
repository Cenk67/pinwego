# Faz 1–5 — Müşteri Yönetimi ve İletişim Merkezi: uygulama notu

`00-analiz.md` dosyasındaki boşlukların nasıl kapatıldığı, nerede durduğu ve canlıya alınırken
ne yapılacağı. Bu dal canlıyı etkilemez: `cloudflare.config.ts` değişmedi, yeni gizli değişken
tanımlanmadı, mevcut KV anahtarları ve kayıt / giriş akışları aynen durur.

## 1. Dosya haritası

| Dosya | Görev |
| --- | --- |
| `lib/comms.ts` | Saf mantık: kanal izinleri, kara liste, uygunluk kuralı, süzgeç + sayfalama, şablon, gönderim işi, rapor, CSV, ret altbilgisi. Ağ ve KV yok; testi kolay. |
| `lib/comms-flow.ts` | KV okuma / yazma, `/api/musteri/iletisim` ve `/api/musteri/cikis` akışları, kuyruk adımı, cron taraması. |
| `lib/whatsapp.ts` | WhatsApp Business Platform (Meta Cloud API) şablon mesajı gönderimi. Anahtar yoksa `unconfigured`. |
| `lib/sms.ts` | SMS gönderici arayüzü ve adaptör yuvası. Adaptör yok; her zaman `unconfigured`. |
| `lib/customers-flow.ts` | Mevcut `/api/musteri` akışı genişletildi: sunucu tarafı süzgeç ve sayfalama, kanal rozetleri, detayda iletişim verisi, müşterinin kendi kanal tercihi. |
| `app/api/musteri/iletisim/route.ts` | Yönetici iletişim API'si (GET genel görünüm / CSV / iş durumu, POST işlemler). |
| `app/api/musteri/cikis/route.ts` | Kampanya postası ret bağlantısı (GET onay sayfası, POST kapatma). |
| `components/admin/customer-center.tsx` | "Müşteri Yönetimi" sekmesi: Tüm müşteriler · Toplu gönderim · Şablonlar · Gönderim geçmişi · Rapor ve denetim. |
| `components/admin/customer-panel.tsx` | Liste, süzgeçler, sayfalama, CSV dışa aktarma, müşteri detayı (durum, kanal izinleri, kanıtla açma, kara liste, manuel WhatsApp, tekil gönderim, geçmişler). |
| `components/admin/comms-client.ts` | Yönetici bileşenlerinin ortak tipleri ve `fetch` yardımcıları. |
| `components/auth/account-screen.tsx` | Müşterinin hesap sayfası: e-posta / SMS / WhatsApp tercih kutuları. |
| `worker/entry.js` | Zamanlanmış görevde `commsQueueSweep()` — yarım kalan kuyrukları bitirir. |
| `lib/comms.test.ts` | Saf mantık + akış testleri (bellek KV'si ile). |
| `.env.example` | Yeni ortam değişkenlerinin açıklaması (değer yok). |

## 2. Veri modeli — yeni KV anahtarları

İkinci kullanıcı tablosu yok. `acct:*`, `customers:v1`, `consents:v1`, `custlog:*` olduğu gibi
kalır. Yeni anahtarlar yalnızca **hesap kimliği** (`accountId`) taşır; e-posta ve GSM
çoğaltılmaz.

| Anahtar | İçerik | Sınır |
| --- | --- | --- |
| `commprefs:v1` | `prefs[accountId]`: `sms` ve `whatsapp` izni (`accepted`, `source`, `at`, `note`), `block` (`pazarlama` / `iletisim`, gerekçe, tarih), `cikis` (ret belirteci). `history[]`: kanal bazlı izin olayları. `audits[]`: yönetici işlemleri. | geçmiş 3000, denetim 200 satır |
| `commtpl:v1` | Şablonlar (`id`, `name`, `channel`, `subject`, `body`, `waName`, `waLanguage`). İlk açılışta örnek şablonlar. | 60 |
| `commjobs:v1` | Gönderim işleri (`id`, `kind`, `channel`, `mode`, `subject`, `body`, `filter`, `pending[]` hesap kimlikleri, `results[]`, `skipped` sayaçları, `status`). | 120 iş, iş başına 600 sonuç |

**E-posta izni tek kaynaklıdır:** `consents:v1` içindeki son `pazarlama` satırı
(`latestMarketing`). `commprefs:v1` e-posta iznini **kopyalamaz**; yalnızca geçmiş olayına ve
rapora yazar. SMS ve WhatsApp izinleri `commprefs:v1` içinde durur.

Kaynak değerleri: `kayit` (kayıt formu) · `hesap` (hesap sayfası) · `yonetici` (yönetici kapattı)
· `yazili` (yazılı onay kanıtı) · `iys` (İYS kaydı) · `cikis` (ret bağlantısı).

## 3. Kurallar

- **Üyelik ≠ pazarlama izni.** Kayıt formundaki kutu ayrı ve varsayılan kapalı; yalnızca e-posta
  kanalını açar. SMS ve WhatsApp'ı müşteri hesap sayfasından kendisi açar.
- **Yönetici izni kapatabilir, açamaz.** Açmanın tek yolu `izin.kanit`: kaynak `yazili` ya da `iys`
  ve en az 5 karakter kanıt notu zorunludur; işlem denetim kaydına düşer.
- **İki engel türü.** `pazarlama`: kampanya gitmez, hizmet mesajı gider. `iletisim`: yöneticiden hiçbir
  ileti gitmez. Doğrulama / şifre / güvenlik postaları (`verify`, `reset`, `changed`) bu kurallardan
  bağımsızdır ve engelden etkilenmez.
- **İki mesaj türü.** `kampanya`: kanal izni şart, toplu gönderilebilir, her postaya ret bağlantısı
  eklenir, alıcı başına günde en çok 3 kampanya postası. `hizmet`: yalnız tek alıcı, izin aranmaz,
  `iletisim` engeli durdurur.
- **Uygunluk hemen önce yeniden denetlenir.** Toplu iş kuyruğa alınırken alıcı listesi hesaplanır,
  ancak her adımda (`stepSize = 20`) satır bazında `eligibility()` tekrar çalışır; iş sırasında izni
  kapanan ya da engellenen müşteri `atlandi` olarak işaretlenir (`izin` / `engel` / `durum` / `adres` /
  `sinir`).
- **Sahte gönderim yok.** WhatsApp API ve SMS anahtarı yoksa alıcılar `hata` sonucu alır, ekranda
  "bağlı değil" görünür. Hiçbir satır "gönderildi" denerek geçilmez. Geliştirmede e-posta
  `/onizleme/posta` kutusuna düşer (mevcut davranış).
- **Kişisel veri yerleri.** URL'lerde e-posta / GSM yok (`?id=` hesap kimliği, `?t=` rastgele ret
  belirteci). Gönderim kayıtlarında adres yok, hesap kimliği var. Hata mesajları kişisel veri
  içermez. CSV yalnızca `onay=1` ile iner, silinmiş hesapları dışlar, denetim kaydı yazar ve
  formül enjeksiyonuna karşı `=+-@` ile başlayan hücreleri tırnaklar.
- **Onay adımı.** Toplu gönderimde önce `onizle` (alıcı sayısı + düşenlerin nedenleri), sonra onay
  kutusu, sonra `gonder` (`confirm: true` ve `expected` alıcı sayısı). Ön izlemeden sonra liste
  değiştiyse sunucu `degisti` döner ve yeniden hesaplatır.
- **Tek yönetici rolü.** Ayrı personel rolü olmadığı için belgede istenen "toplu gönderim ve dışa
  aktarma için ayrı yetki", ayrı onay adımı + denetim kaydı ile karşılanır. Rol ayrımı kimlik
  sistemini değiştireceği için bu sürümün dışındadır (bkz. bölüm 7).

## 4. API

Tüm yönetici uçları `pinwego_admin` çerezi ister; POST istekleri `origin` denetiminden geçer.

### `GET /api/musteri` (genişletildi)
- `?sayfa=1&adet=50` + süzgeçler `q` (ad, soyad, GSM, e-posta, kayıt no), `durum`, `dogrulama`,
  `kanal` + `izin`, `engel`, `from`, `to` → `{ items, totals, page }`. Satırlar `channels` ve `block`
  alanlarıyla gelir.
- `sayfa` yoksa eski davranış (tüm liste) korunur.
- `?id=<hesap>` → detay + `comms` (kanal izinleri, engel, izin geçmişi, son gönderimler).

### `GET /api/musteri/iletisim`
- Varsayılan: şablonlar, son işler, rapor, sağlayıcı durumu, denetim kaydı.
- `?disa=csv&onay=1` + liste süzgeçleri: Excel uyumlu CSV (UTF-8 BOM, `;` ayraç).
- `?is=<işId>`: tek işin durumu (kuyruk ilerlemesi için).

### `POST /api/musteri/iletisim` — `op` değerleri
| op | Ne yapar |
| --- | --- |
| `sablon.kaydet`, `sablon.sil` | Şablon yönetimi |
| `izin.kapat` | Bir kanalın iznini kapatır (`id`, `channel`) |
| `izin.kanit` | Yazılı / İYS kanıtıyla izin açar (`id`, `channel`, `source`: `yazili` / `iys`, `note`) |
| `engel.koy`, `engel.kaldir` | Kara liste (`id`, `kind`: `pazarlama` / `iletisim`, `reason`) |
| `manuel` | `wa.me` bağlantısı üretir (`id`, `text`) ve "manuel" iş kaydı düşer; API gönderimi değildir |
| `onizle` | `channel` + `kind` + hedef (`id` ya da `filter`) için alıcı sayısı ve düşenlerin dökümü |
| `gonder` | Tek (`id`) ya da toplu (`filter`) gönderim işi açar; `subject`, `body`, `confirm: true` ve `expected` zorunlu |
| `kuyruk.isle` | Bir işin (`job`) 20 alıcılık bir adımını işler (ekran bitene kadar çağırır) |
| `kuyruk.iptal` | Kalan alıcıları iptal eder (`job`) |

### `POST /api/musteri` (genişletildi)
- Yönetici `durum: "silindi"` → iletişim tercihleri ve ret belirteci de silinir (`forgetCustomer`).
- Müşteri (`pinwego_acct` çerezi) `op: "pazarlama"` artık `kanal` alır: `eposta` (consents:v1),
  `sms` / `whatsapp` (commprefs:v1).

### `GET|POST /api/musteri/cikis?t=<belirteç>`
- GET: onay sayfası (robots noindex). POST: `origin` denetimi + oran sınırı; e-posta iznini
  `cikis` bağlamıyla kapatır. Belirteç müşteri başına rastgele ve `commprefs:v1` içinde durur;
  adres ya da kimlik URL'ye çıkmaz.

## 5. Ortam değişkenleri (hiçbiri bu dalda tanımlı değil)

| Değişken | Kullanım |
| --- | --- |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_API_VERSION` | Meta Cloud API şablon mesajı. İkisi boşsa "bağlı değil". |
| `SMS_PROVIDER`, `SMS_API_KEY`, `SMS_SENDER` | Adaptör eklenene kadar dolu olsa da gönderim yapılmaz. |

Değerler yalnızca Worker gizli değişkeni (`bindings.secret()`) olarak eklenir; istemci koduna, Git'e
ve günlüklere yazılmaz. `.env.example` yalnızca anahtar adlarını listeler.

## 6. Canlıya alma adımları

1. Dalı `main` ile birleştir ve yayınla. Yeni anahtarlar ilk kullanımda oluşur; veri taşıma yok.
2. Yönetim panelinde "Müşteri Yönetimi" sekmesini aç; liste eskisi gibi çalışmalı, kanal rozetleri
   "e-posta" dışında boş görünür (SMS / WhatsApp izni henüz kimsede yok).
3. E-posta gönderimi mevcut `EMAIL` bağlamıyla çalışır; ek ayar yok. İlk toplu gönderimi küçük bir
   süzgeçle dene; ret bağlantısının `https://pinwego.com/api/musteri/cikis?t=...` olduğunu gör.
4. WhatsApp Business Platform açılacaksa: Meta'da onaylı şablon oluştur, `cloudflare.config.ts`
   içine `WHATSAPP_TOKEN: bindings.secret()`, `WHATSAPP_PHONE_ID: bindings.secret()` ekle, değerleri
   Cloudflare panelinden gir, şablon ekranında `waName` / `waLanguage` alanlarını doldur. Rapor
   sekmesindeki "WhatsApp Business API: bağlı" yazısı anahtarın görüldüğünü doğrular.
5. SMS için sağlayıcı seçildiğinde `lib/sms.ts` içinde `smsSenderFrom` tek adaptör noktasıdır;
   gönderim yolu ve ekranlar hazırdır.
6. İYS: `izin.kanit` → kaynak `iys` ve kayıt numarası notu ile mevcut onaylar işlenir. Otomatik İYS
   senkronu bu sürümde yoktur.

## 7. Bilinçli olarak dışarıda bırakılanlar

- Ayrı personel rolleri (RBAC): kimlik sistemi tek yönetici; rol açmak `lib/admin-gate.ts` ve
  oturum modelini değiştirir.
- Sağlayıcı teslim / okundu geri bildirimi (webhook): WhatsApp ve SMS bağlandığında ayrı uç gerekir.
- Zamanlanmış kampanya (ileri tarihli gönderim), A/B, segment kaydetme.
- İYS ile otomatik senkron.

## 8. Geri dönüş

Yeni kod yalnızca ek anahtarları okur; yoksa boş kabul eder. Geri dönüş için önceki sürüm
yayınlanır; `commprefs:v1`, `commtpl:v1`, `commjobs:v1` istenirse silinir. `consents:v1` içine
yazılan `cikis` ve `kanit` bağlamlı satırlar eski kodla uyumludur (`context` yalnız gösterim için).

## 9. Test

```bash
npx tsx lib/comms.test.ts        # saf mantık + akış (bellek KV)
npx tsx lib/customers.test.ts    # mevcut müşteri akışı
npx eslint lib components app    # tip ve hook kuralları
```

Elle doğrulanan akış (geliştirme sunucusu + `/onizleme/posta`): GSM ile arama, kanal süzgeci,
detayda izin kapatma ve kanıtla açma, kara liste, toplu gönderim ön izleme → onay → kuyruk →
"2 gönderildi", gönderim geçmişi, rapor, kampanya postasındaki ret bağlantısı → "Kampanya postası
kapatıldı" → müşterinin e-posta izni kapalı ve geçmişte `cikis` satırı.
