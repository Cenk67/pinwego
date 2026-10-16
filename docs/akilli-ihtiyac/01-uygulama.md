# Akıllı İhtiyaç ve Çözüm Bulucu — Uygulama notu

"Pinwego Akıllı İhtiyaç ve Çözüm Bulucu" belgesindeki fazların kodda nereye oturduğu. Faz 0 raporu
`00-mevcut-sistem-analizi.md` dosyasındadır. Her şey kural tabanlıdır; dış yapay zekâ çağrısı yoktur.
Belgedeki sıra korundu: önce ucuz ve ölçülebilir, sonra güçlendirilebilir.

## Faz 1 — Akıllı ihtiyaç araması

| Belge maddesi | Kod |
| --- | --- |
| Doğal dil cümlesi, "Evimin su tesisatı patladı" gibi | `lib/need.ts` → `needHints` (≈90 ipucu, öncelikli olanlar sektör sözlüğünü ezer), `matchNeed()` |
| Yazım hatası düzeltme | `correctNeedDetailed()` — Damerau-Levenshtein, 5+ harfli sözcük, yer adları ve korunan sözcükler dokunulmaz |
| Eş anlamlı eşleme | `needSynonyms` (muslukçu→tesisatçı, araba/araç→oto, ehliyet→sürücü kursu …) + Türkçe ek soyma |
| Kategori eşleme, çok kategorili ihtiyaç | `ParsedQuery.categories` (ör. "çocuklarla hafta sonu" → eğlence + çocuk + yeme), `lib/match.ts` → `parseQuery()` |
| Konum filtresi | mevcut il/ilçe sözlüğü; düzeltme motoru yer adlarını `protect` listesiyle korur |
| Puan, yorum, aktiflik, hizmet uyumu ile sıralama | `searchDirectory()` skoru; `haystack()` artık profil hizmetleri, `aiTags` ve SEO etiketlerini de tarar |
| Sponsorlu kayıt alakasız aramada öne geçmez | `searchDirectory()` — `premium` artışı yalnızca aynı kategoride; `lib/match.test.ts` sponsor havuzu testi |
| Okunamayan cümle | Hiçbir sinyal yoksa tüm katalog yerine gerçek sıfır sonuç (`unstructured` kapısı, `strongHit`) |
| Arama ekranı metinleri | `lib/messages.ts` → `need.hint` "Aradığın çözüm burada!", `need.lead`, `need.submit` "Çözüm Bul", kapsam seçenekleri `need.scope*` (12 dil) |
| Anlaşılan ihtiyaç özeti | `components/directory/need-brief.tsx` → `NeedBrief`: kategori, yer, aciliyet, bütçe, zamanlama çipleri; "Düzeltildi: x → y" satırı |
| Eksik bilgiyi gerektiğinde sorma | `needPrompt()`: yer yoksa ve sonuç boş/uzak → şehir çipleri; hizmet işlerinde aciliyet; fiyatlı alanlarda bütçe. Tek seferde tek soru |
| Yakın kategori önerisi | `relatedCategories` + `alternativeCategories()`; `NeedAlternatives` canlı sayıyla çip gösterir |
| Bilgi arayan ile işletme arayan ayrımı | `needIntent()`; bilgi niyetinde rehberler sonuçların üstüne çıkar, kart "Bilgi mi arıyorsun?" der |
| Sigorta/finans ayrı akış | `isFinancialNeed()`; `NeedBrief` içinde "Sigorta ve finans ürünleri" kutusu ve `/talep` bağlantısı; arama cümlesi pazarlamaya aktarılmaz |

Testler: `npx tsx lib/need.test.ts`, `npx tsx lib/match.test.ts`.

## Faz 2 — Akıllı yönlendirme (fallback)

| Belge maddesi | Kod |
| --- | --- |
| Önce Pinwego, sonra Google / YouTube / Haritalar | mevcut `components/discover/discover-offer.tsx`; sıfır veya ince sonuçta görünür, kapsam seçimi ile uyumlu |
| Hazır arama bağlantısı, kazıma yok | `lib/discover.ts` → `webSearchUrl`, `videoSearchUrl`, `mapsSearchUrl`; `discoverQuery()` güvenli sorgu |
| Dış sonuç Pinwego kaydı gibi sunulmaz | başlık/metin "dönen sayfalar Pinwego kaydı değildir"; yeni sekme |
| Geri dönüş seçeneği | `need.externalHint` "Dış bağlantılar yeni sekmede açılır; bu sayfa açık kalır." |
| Sıfır sonuç metni | `need.zeroTitle` / `need.zeroBody`: yazım ve eş anlam denendi, yakın kategori / şehir / dış kaynak öner |
| Video araması ayrı | YouTube düğmesi işletme listesiyle karışmaz; olay kaydında `target: "video"` |

## Faz 3 — Sesli arama

Mevcut `components/directory/voice-search.tsx` ve `lib/voice/*` korunur. Sesle gelen cümle aynı ihtiyaç motorundan
geçer; `trackNeed` olayında `voice: true` işaretlenir (`getVoiceTrail().mark === voiceQueryMark(query)`), raporda
"sesli" sayısı ayrı durur.

## Faz 4 — Yönetim paneli ve analitik

| Belge maddesi | Kod |
| --- | --- |
| Sonuç bulunamayan aramalar | `lib/need-analytics.ts` → `NeedState.queries[*].zero`, `needReport().zeroQueries` |
| En sık ihtiyaçlar | `topQueries` (en çok 400 satır, en seyrek olanlar önce düşer) |
| Eşleşme oranı | `rates.match` = en az bir Pinwego kaydı bulan arama / tüm aramalar |
| Dış kaynağa geçiş | `external.web/video/maps/places`, `rates.external` |
| İşletme iletişim dönüşümü | `trackNeedContact()` telefon / WhatsApp / mesaj / randevu; yalnızca son 30 dakikada ihtiyaç araması yapıldıysa sayılır |
| API | `app/api/ihtiyac/route.ts` → POST `needEventFlow` (204, çerez yok, bot ve yönetici oturumu sayılmaz, IP başına dakikada 90), GET `needReportFlow` (yönetici oturumu şart) |
| Depolama | KV anahtarı `need:v1`; sunucuda yalnızca küçük harfe indirilmiş cümle, kategori, şehir ve sayaçlar; telefon ve e-posta `normalizeNeedQuery()` ile atılır |
| Panel | `components/admin/need-admin.tsx`, sekme "İhtiyaç araması": altı kart, sıfır sonuç listesi, en sık ihtiyaçlar, kategoriye göre, dış kaynak, günlük seyir |

Testler: `npx tsx lib/need-analytics.test.ts`, `npx tsx lib/need-flow.test.ts`.

## Faz 5 — Gelişmiş özellikler

| Belge maddesi | Kod |
| --- | --- |
| Kullanıcı geri bildirimi | `NeedFeedback` "Bu sonuçlar ihtiyacını karşıladı mı?" Evet/Hayır → `feedback` olayı, raporda memnuniyet oranı |
| Alternatif kategori önerisi | `NeedAlternatives`, tıklama `alternative` olayı olarak sayılır |
| İzinli kişiselleştirme | `lib/need-memory.ts` + `components/directory/need-memory-chips.tsx`: onay kutusu işaretlenmeden hiçbir şey saklanmaz, yalnızca bu tarayıcı (localStorage), sunucuya gitmez, "Temizle" ile silinir |
| Yapay zekâ destekli sıralama | sonraki adım; rapor verisi (sıfır sonuç, memnuniyet) hangi sözlük maddesinin ekleneceğini gösterir |

## Blog entegrasyonu

- `BlogPost.keywords` (arama anahtar kelimeleri) ve `BlogPost.needQuery` (makale altındaki "Bu konuda işletme ara" cümlesi).
- `searchGuides()` anahtar kelime isabetine +5 verir; rehberler sonuç sayfasında ve asistanda görünür, bilgi niyetinde üste çıkar.
- Yeni alt kategori `rehber/ihtiyac` "İhtiyaç rehberleri": belgede geçen beş örnek için beş editoryal yazı
  (tesisat patlaması, kışın ısınmayan ev, araç sigortası, işletmeye web sitesi, çocuklarla hafta sonu).
- Yönetim → Blog → yazı formunda "Arama anahtar kelimeleri" ve "İşletme arama cümlesi" alanları.
- Makale sayfası: `needQuery` olan yazıda "Bu konuda işletme ara" kutusu; editoryal yazılarda ilgili bağlantılar `/ara?q=…`.

Test: `npx tsx --test lib/blog.test.ts`.

## Değişmeyenler

Mevcut arama URL'leri (`/ara?q=&sehir=&kategori=…`), filtreler, sesli arama, keşif ayarları, asistan ve hesap
kapısı aynı kaldı. Yeni mesaj anahtarları 12 dilde eklendi; `card.featured` yerine kartta `card.sponsored`
("Sponsorlu") yazar. Yeni KV anahtarı yalnızca `need:v1`; canlıya alırken ek binding gerekmez.

## Canlıya almadan önce

1. `npx tsx lib/need.test.ts && npx tsx lib/match.test.ts && npx tsx lib/need-analytics.test.ts && npx tsx lib/need-flow.test.ts && npx tsx --test lib/blog.test.ts`
2. Yönetim → İhtiyaç araması sekmesinde ilk haftanın sıfır sonuç listesini okuyun; eksik işletme mi, eksik ipucu mu ayırın.
3. Eksik ipucu için `lib/need.ts` → `needHints` veya `needSynonyms` satırı ekleyin ve `lib/need.test.ts`'e bir örnek cümle koyun.
