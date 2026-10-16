# Faz 0 — Mevcut sistem analizi

Bu rapor, "Pinwego Akıllı İhtiyaç ve Çözüm Bulucu" çalışmasına başlamadan önce kod tabanının
durumunu kayda geçirir. Rapor yazılırken kod değiştirilmedi. Satır referansları
`cursor/need-search-707e` dalının ucuna (PR #35) göredir.

## 1. Arama altyapısı

| Katman | Dosya | Ne yapar |
| --- | --- | --- |
| Sorgu çözümleme | `lib/match.ts` → `parseQuery` | Metni `fold` ile sadeleştirir, `correctNeedText` ile bilinen yazım hatalarını düzeltir, semt/il adlarını katalogdan tanır, sektör ifadeleriyle (`Sector.phrases`, dünya dilleri `lib/world-query.ts`) kategori seçer, etiket kurallarını (aile, manzara, ekonomik, lüks, acil…) çıkarır, puan ve "şu an açık" ipuçlarını okur. Sektör eşleşmesi yoksa `matchNeed` ile ihtiyaç ipucuna düşer. |
| Sıralama | `lib/match.ts` → `searchDirectory` | Süzgeçleri uygular, `narrowToWritten` ile yazılan işe daraltır, puan + kategori (+8) + şehir (+6) + semt (+8) + etiket (+3) + terim (+1.5) + mesafe cezası ile skorlar. Sponsor (`premium`) yalnızca +0.35, doğrulanmış +0.15 alır; organik alaka her zaman önde kalır. Altı sıralama anahtarı vardır (`ilgili`, `puan`, `yorum`, `mesafe`, `yanit`, `fiyat`). |
| Asistan | `lib/match.ts` → `concierge` | Aynı motoru üç sonuçla çalıştırır; skor 3'ün altındaysa `outside: true` döner. |
| İhtiyaç ipuçları | `lib/need.ts` | Beş ihtiyaç ipucu (`enerji/kombi`, `usta/tesisat`, `teknoloji/web`, `cocuk`, `finans/sigorta`) ve dört sabit yazım düzeltmesi. Sözlük küçüktür; eş anlamlı, bulanık düzeltme ve yakın kategori mantığı yoktur. |
| Kapsam seçimi | `lib/need-scope.ts` | `hepsi` / `pinwego` / `rehber` üçlüsü `localStorage` içinde durur. |
| Arama ekranı | `components/directory/search-screen.tsx` | URL parametreleriyle (`q`, `sehir`, `kategori`, `puan`, `fiyat`, `acik`, `dogru`, `one`, `sirala`) çalışır. Konum seçimi `lib/place.ts` → `applyPlace` ile uygulanır; yerel sonuç yoksa en yakın 8 kayıt "genişletildi" notuyla gelir. Az sonuçta `DiscoverOffer` ve blog rehber kartları açılır. |
| Sesli arama | `components/directory/voice-search.tsx`, `lib/voice/*` | Web Speech API; konuşma metne çevrilip aynı `/ara` adresine `voiceSearchPath` ile gönderilir. Analitik `lib/voice/analytics.ts` içinde tarayıcıda durur. |
| Dış keşif | `lib/discover.ts`, `components/discover/*`, `app/api/kesif/route.ts` | Google Haritalar, Google arama ve YouTube için hazır arama adresleri (`mapsSearchUrl`, `webSearchUrl`, `videoSearchUrl`). Sorgu `discoverQuery` ile temizlenir (kontrol karakteri, `<>`, `javascript:` vb. reddedilir, 80 karakter). Places (New) listesi yalnızca sunucu anahtarı varsa `/kesif` sayfasında açılır. |

### Boşluklar

- Yazım düzeltmesi dört sabit ifadeyle sınırlı; genel bulanık eşleşme yok.
- Eş anlamlı sözlüğü yok; "muslukçu", "petek", "kasko" gibi günlük sözcükler sektör ifadelerinde geçmiyorsa boş döner.
- "Yakın kategori" kavramı yok; `usta` boşsa `ev` veya `enerji` önerilmez.
- Sistem kullanıcıya ne anladığını söylemez; şehir, bütçe veya aciliyet eksikse sormaz.
- Bilgi edinme niyeti ("nasıl seçilir") ile işletme bulma niyeti ayrılmaz.
- Arama olayları sunucuya yazılmaz; sıfır sonuçlu aramalar yalnızca o tarayıcının `localStorage` sayacında kalır.

## 2. İşletme veri modeli

`lib/types.ts` → `Business`: kimlik, `slug`, `name`, `category` (sektör id), `subcategory` (serbest metin),
konum (`city`, `district`, `address`, `lat`, `lng`), iletişim (`phone`, `contacts.landline|mobile|whatsapp`,
`links`), itibar (`rating`, `reviewCount`, `reviews`), fiyat (`priceLevel` 1–4, `services[]`), açıklık
(`openNow`, `hours`, `hourBook`, `presence`), metin (`summary`, `about`, `tags[]`, `amenities[]`),
bayraklar (`premium`, `verified`), `responseMinutes`, `booking`, `photo`, `source` (`katalog` | `senin` | `google`),
`profile` (`BusinessProfile`: SEO ve AI etiketleri, hizmetler, galeri, yayın durumu).

Arama "samanlığı" (`haystack`) şu alanları birleştirir: ad, alt kategori, özet, hakkında, ilçe, şehir,
etiketler, hizmet adları, olanaklar. `profile.aiTags` ve `profile.seoTags` henüz samanlığa girmez.

Kaynaklar:

- `lib/catalog.ts`: örnek katalog (İstanbul, Ankara, İzmir, Antalya, Bursa) — 21 yeme-içme, 16 B2B,
  11 sağlık, 10 konaklama, 8 usta, 7 güzellik, 7 dekor ve her sektörden en az bir kayıt.
- `lib/zonguldak.ts`: 50 gerçek Zonguldak kaydı (`source: "google"`), puan/yorum kopyalanmaz.
- `lib/listings.ts` + `app/api/ilan/route.ts`: sunucuda (KV `ACCOUNTS`) duran işletme kayıtları.
- `lib/directory-context.tsx`: bu üçünü, yönetici gizleme/düzenleme katmanıyla (`BusinessOverride`)
  birleştirir ve `visibleBusinesses` olarak ekranlara verir.

## 3. Kategoriler

`lib/sectors.ts` → `seedSectors`: 80'in üzerinde sektör; her birinde `id`, `label`, `blurb`, `photo`, `tint`,
`icon`, `booking` ve arama ifadeleri `phrases[]` vardır. Özel sektörler `setCustomSectors` ile tarayıcıda
eklenir. Çok dilli takma adlar `lib/world-query.ts` içindedir. Kategoriler arasında "komşuluk" tanımı yoktur.

Blog tarafı (`lib/blog.ts`) ayrı bir hiyerarşi kullanır: kategori → alt kategori → yazı. Üç editör yazısı
("Rehber" kategorisi) ve şehir × sektör programatik sayfalar (en az üç kayıt kuralı) vardır. Arama
rehber eşleşmesi `searchGuides` başlık/özet/kategori/gövde sözcüklerine bakar; yazıya özel anahtar
kelime alanı yoktur.

## 4. API'ler

| Yol | Amaç |
| --- | --- |
| `GET /api/kesif` | Google Places (New) Text Search vekili; anahtar yoksa `unconfigured`. |
| `POST /api/olay`, `GET /api/analitik` | Ziyaret sayacı ve yönetici raporu (`lib/notify-flow.ts`, `lib/stats.ts`). KV `stats:v1`. |
| `/api/ilan` | İşletme kayıtları (oluştur, bayrak, sil, toplu içe aktarım). |
| `/api/kayit`, `/api/giris`, `/api/oturum`, `/api/dogrula*`, `/api/sifre*`, `/api/musteri` | Hesap akışları, e-posta doğrulama, şifre sıfırlama. |
| `/api/yonetici`, `/api/yonetici/kod` | Yönetici şifre + tek kullanımlık posta kodu; oturum çerezi `pinwego_admin`. |
| `/api/blog` | Blog durumu (KV `BLOG_STATE`), yönetici yazar. |
| `/api/crm`, `/api/bildirim`, `/api/iletisim`, `/api/gorunum`, `/api/sayfa`, `/api/yer` | CRM, bildirim merkezi, iletişim kutusu, görüntülenme sayacı, içerik sayfaları, yer arama. |

Kalıcılık: Cloudflare KV bağları `ACCOUNTS`, `BLOG_STATE`, `VINEXT_KV_CACHE` (`cloudflare.config.ts`).
Yerelde `lib/account-kv.ts` süreç belleğinde bir `Map` kullanır.

## 5. Yetkilendirme

Roller `musteri`, `isletme`, `admin`. Misafir gezer ama iletişim/üye işlemleri `useGuestGate`
ile kapıya düşer. Yönetici uç noktaları `readAdminCookie` + `adminSessionOpen` ile korunur
(`lib/admin-gate.ts`). Anonim olay uç noktaları (`/api/olay`) bot süzgeci + IP başına hız sınırı
(`takeIpSlot`) kullanır ve kişisel veri almaz.

## 6. Mevcut yapay zekâ özellikleri

- Kural tabanlı doğal dil çözümleme (`parseQuery`): dış model çağrısı yok, anahtar yok.
- Gerekçeli sıralama (`explain`): her kartın altında eşleşme gerekçesi.
- Asistan (`components/directory/assistant.tsx`): aynı eşleştirici, üç sonuç, rehber kartları, dış
  bağlantılar.
- Sesli arama: tarayıcı konuşma tanıma + aynı arama yolu.
- İşletme profili `aiTags` / `pendingAiTags`: işletmenin yazdığı niyet etiketleri (henüz aramada
  kullanılmıyor).

## 7. Belgedeki fazlara göre karar

| Faz | Mevcut | Yapılacak |
| --- | --- | --- |
| 1 Akıllı ihtiyaç araması | Sektör ifadeleri, 5 ipucu, 4 sabit düzeltme | Geniş ihtiyaç sözlüğü, eş anlamlı sözlüğü, bulanık yazım düzeltme (yer adları korunur), niyet ayrımı, eksik bilgi sorgusu, yakın kategori önerisi, kullanıcıya "ne anladım" özeti |
| 2 Yönlendirme | Google / Haritalar / YouTube bağlantıları, güvenli sorgu | Sıra: düzelt → eş anlamlı → yakın kategori → dış kaynak; bilgi ve işletme niyetini ayır; geri dönüş düğmesi; finansal ürün notu |
| 3 Sesli arama | Var | Olay kaydında `voice` bayrağı; sözlük aynı motorda |
| 4 Yönetici ve analitik | Yalnız tarayıcı sayacı | Sunucuda `need:v1` durumu, `/api/ihtiyac`, yönetim sekmesi: sıfır sonuç, en sık ihtiyaç, eşleşme oranı, dış kaynağa geçiş, iletişim dönüşümü, geri bildirim |
| 5 İleri | — | Alternatif kategori chip'leri, kullanıcı geri bildirimi, izinli "son ihtiyaçlar" hatırlama, blog rehberlerinin arama ve asistanda birincil bilgi kaynağı olması |

Mevcut kod korunur: `searchDirectory` imzası, URL parametreleri, `DiscoverOffer` ve blog bileşenleri
aynı kalır; yeni mantık `lib/need.ts` ve yeni dosyalara eklenir.
