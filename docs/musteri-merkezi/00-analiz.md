# Faz 0 — Müşteri Veri Yönetimi ve İletişim Merkezi: mevcut durum analizi

"Müşteri Özelliği" belgesindeki istekler uygulanmadan önce kod tabanının durumu. Satır
referansları `main` dalının ucuna (PR #41 sonrası) göredir. Uygulama notu `01-uygulama.md`
dosyasındadır.

## 1. Mevcut mimari haritası

| Katman | Dosya | Durum |
| --- | --- | --- |
| Veritabanı | Cloudflare KV `ACCOUNTS` (`cloudflare.config.ts`) | SQL, ORM ve migration yok. Her hesap `acct:<e-posta>` anahtarında tek JSON. Yerelde `lib/account-kv.ts` bellek deposu kullanır. |
| Hesap kaydı | `lib/account-record.ts` | `StoredAccount`: `id`, `role` (`musteri`/`isletme`), `email`, `name`, `phone`, `customer{firstName,lastName,birthDate,occupation,nationalId?}`, `status` (`bekliyor`/`aktif`/`askida`/`silindi`), `emailVerified`, `verifiedAt`, `lastLoginAt`, parola özeti, doğrulama/sıfırlama belirteç özetleri. |
| Kayıt / giriş / doğrulama | `lib/account-flow.ts`, `/api/kayit`, `/api/giris`, `/api/dogrula` | Çalışıyor. Kayıt sırasında `acceptTerms` zorunlu, `marketing` isteğe bağlı kutu. |
| Müşteri dizini | `lib/customers.ts` → `customers:v1` | Hesaplardan türetilen en fazla 4000 satırlık liste (parola yok). Kayıt, giriş, doğrulama ve yönetici işlemlerinde `rememberCustomer` ile yenilenir. `custlog:<id>` anahtarında 40 satırlık işlem günlüğü vardır. |
| Pazarlama izni | `lib/pages-flow.ts` → `consents:v1` | Üyelik sözleşmesi, kullanım koşulları ve pazarlama politikası sayfa **sürümüne bağlı** onay satırları. `latestMarketing()` son pazarlama satırını okur. Yalnızca **e-posta** kanalı vardır. |
| Müşteri yönetim ekranı | `components/admin/customer-panel.tsx`, `/api/musteri` | Liste, ad/e-posta arama, durum/doğrulama/tarih süzgeci, detay, askıya al / aktifleştir / silinmiş işaretle, ad-telefon düzeltme, kampanya postasını kapatma (yalnız kapatma), onay ve işlem günlüğü. Tüm liste tek seferde iner; sayfalama yok; GSM ile arama yok. |
| Müşterinin kendi tercihi | `components/auth/account-screen.tsx` | "Kampanya ve duyuru e-postası almak istiyorum" kutusu. SMS / WhatsApp yok. |
| Yetki | `lib/admin-gate.ts` | Tek yönetici rolü: kullanıcı adı + parola + e-posta kodu, `pinwego_admin` HttpOnly çerezi, 12 saat. Ayrı personel rolü yok. |
| E-posta gönderimi | `lib/mailer.ts`, `lib/account-route.ts` → `sendLogged` | Canlıda Cloudflare Email (`EMAIL` bağlamı, `hesap@pinwego.com`), yedek Resend, geliştirmede `/onizleme/posta` kutusu. 3 deneme, `mailog:*` kaydı (adres özeti, gövde yok). `purpose` birliği: `verify`, `reset`, `changed`, `admin`, `remind`, `notice`. |
| Bildirim | `lib/notify-flow.ts`, `lib/admin-notify.ts` | **Yöneticiye** giden iç bildirimler ve günlük/haftalık özet. Müşteriye toplu gönderim yok. |
| CRM sekmesi | `lib/crm.ts`, `components/crm/crm-panel.tsx` | Satış CRM'i (kişi, fırsat, görev, teklif). Müşteri hesaplarıyla bağlı değil. |
| WhatsApp / SMS | `lib/contacts.ts` → `whatsappHref`, `lib/share.ts` | Yalnız işletme kartında `wa.me` bağlantısı. Business Platform API veya SMS sağlayıcı yok. |
| Zamanlayıcı | `worker/entry.js` → `scheduled` | 05:00 ve 12:00 UTC'de CRM hatırlatma ve özet taraması. Yeni tarama eklenebilir. |
| Test | `lib/*.test.ts`, `npx tsx <dosya>` | Node `assert` ile çalışır; bellek KV'si kullanılır. `lib/customers.test.ts` müşteri akışını kapsar. |

## 2. Belgedeki isteklerin karşılığı — boşluk listesi

| Belge maddesi | Mevcut | Boşluk |
| --- | --- | --- |
| Müşteri ID, ad, GSM, e-posta, kayıt, doğrulama, durum, son giriş | Var (`CustomerRow`) | Listede GSM gösterilmiyor; GSM ile arama yok |
| Kanal bazlı pazarlama izni (e-posta / SMS / WhatsApp) | Yalnız e-posta | SMS ve WhatsApp izni, kaynak, tarih, kanıt |
| Kara liste / iletişim engeli | Yok (yalnız hesap askıya alma) | Pazarlama engeli ve iletişim engeli ayrı tür olarak |
| İzin geçmişi | `consents:v1` (e-posta, sayfa sürümüne bağlı) | Diğer kanallar ve yönetici müdahalesi |
| Tek / toplu e-posta, şablon, kuyruk, sonuç | Yok | Tamamı |
| WhatsApp: manuel başlatma + Business Platform servis katmanı | Yalnız işletme kartı bağlantısı | Müşteri için bağlantı, API servis katmanı, şablon |
| SMS: entegrasyona hazır katman | Yok | Arayüz ve "bağlı değil" sonucu |
| Toplu gönderim öncesi alıcı sayısı + yönetici onayı | Yok | Ön izleme ve onay adımı |
| Gönderim hemen önce izin ve engel yeniden kontrolü | Yok | Kuyruk işlerken satır bazında denetim |
| Ret bağlantısı (ticari ileti) | Yalnız hesap sayfasındaki kutu | Her kampanya postasında tek tıkla ret bağlantısı |
| Sayfalama ve performans | Tek seferde tüm liste | Sunucu tarafı süzgeç ve sayfalama |
| Yetkiye bağlı Excel dışa aktarma | Yok | CSV (Excel uyumlu) + ayrı onay + denetim kaydı |
| Rol tabanlı erişim | Tek yönetici rolü | Ayrı personel rolü yok; bu sürümde eklenmiyor (bkz. riskler) |
| Raporlama | Kayıt/doğrulama sayıları | İzin, engel, gönderim, teslimat ve ret sayıları |

## 3. KVKK / ticari ileti açısından teknik eksikler

- Üyelik pazarlama izni sayılmıyor (iyi): kutu ayrı ve varsayılan kapalı. Ancak yalnızca e-posta için.
- Pazarlama e-postası hiç gönderilmediği için ret bağlantısı ve İYS kaydı ihtiyacı doğmamıştı; toplu gönderim açıldığında zorunlu olur.
- Yönetici izni **açamaz**, yalnız kapatabilir (`musteriPostFlow` → `pazarlama` yalnız `accepted: false`). Bu ilke korunmalı; yazılı/İYS onayı girilecekse kanıt notu zorunlu olmalı.
- Gönderim kayıtlarında e-posta adresi düz yazılmıyor (`emailHash`), bu iyi; yeni kayıtlar da hesap kimliğiyle tutulmalı, adres ve GSM çoğaltılmamalı.
- Hesap silme (`silindi`) ad ve GSM'i boşaltıyor; iletişim kayıtları da aynı anda kesilmeli.

## 4. Riskler ve korunması gerekenler

- `acct:*` kayıtları ve `registerInStore` / `loginInStore` değişmemeli. Yeni veri ayrı KV anahtarlarında durur (`commprefs:v1`, `commtpl:v1`, `commjobs:v1`); ikinci kullanıcı tablosu açılmaz.
- `consents:v1` e-posta izninin tek kaynağı kalır. SMS ve WhatsApp izni için yeni anahtar kullanılır; e-posta izni kopyalanmaz.
- Cloudflare Worker CPU sınırı için toplu gönderim tek istekte bitirilmez; kuyruk parça parça işlenir.
- WhatsApp Business Platform ve SMS için gerçek anahtar yok. Anahtar yokken sistem "bağlı değil" demeli, sahte başarı üretmemeli. Anahtarlar yalnızca Worker gizli değişkeninde durur; `cloudflare.config.ts` bu sürümde değiştirilmez (deploy etkilenmez).
- Tek yönetici rolü vardır. "Rol tabanlı yetki" isteği, personel hesabı olmadığı için ayrı onay adımı + denetim kaydı ile karşılanır; ayrı rol açmak kimlik sistemini değiştirir ve bu sürümün dışındadır.
- Geri dönüş: yeni anahtarlar silinirse eski müşteri paneli aynen çalışır. Yeni kod yalnızca ek anahtarları okur; yoksa boş kabul eder.

## 5. Önerilen uygulama sırası

1. Saf katman: `lib/comms.ts` — izin, engel, uygunluk, şablon, kuyruk, CSV, rapor (testli).
2. Sağlayıcı katmanı: `lib/whatsapp.ts`, `lib/sms.ts` — bağlı değilken açık hata.
3. Akış ve uçlar: `/api/musteri` zenginleştirme (süzgeç, sayfalama, kanal), `/api/musteri/iletisim`, `/api/musteri/cikis`.
4. Yönetim arayüzü: "Müşteri Yönetimi" alt sekmeleri.
5. Müşteri hesabı: SMS / WhatsApp tercih kutuları.
6. Zamanlayıcı ve belgeler.
