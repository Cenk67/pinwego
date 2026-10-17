# Faz 0 — Sektör sistemi: mevcut durum analizi

"Pinwego Sektör ve Alt Sektör Sistemi" belgesine başlamadan önce kod tabanının durumu. Satır
referansları `main` dalının ucuna (PR #37 sonrası) göredir. Bu rapor yazılırken kod değişmedi;
uygulama notu `01-uygulama.md` dosyasındadır.

## 1. Sektör tanımı nerede duruyordu

| Katman | Dosya | Durum |
| --- | --- | --- |
| Çekirdek liste | `lib/sectors.ts` → `seedSectors` | ≈80 sabit sektör; `id`, `label`, `blurb`, `photo`, `tint`, `icon`, `booking`, `phrases`. Tek seviye, üst/alt ilişkisi yok. |
| Ziyaretçi eklemesi | `components/directory/sector-form.tsx`, `lib/directory-context.tsx` → `addSector` | Ana sayfadaki "Sektör ekle" düğmesi ve `/listele` formundaki "Listede yoksa sektör ekle" bağlantısı sektörü **yalnızca o tarayıcının `localStorage`** kaydına yazıyordu. Başka ziyaretçi, yönetici ve sunucu bunu görmüyordu. |
| Gizleme | `hideSector`, `hiddenSectorIds` | Yine tarayıcı yerelinde; sunucuda sektör durumu diye bir kavram yoktu. |
| Yönetim | `components/admin/admin-screen.tsx` → `SectorAdmin` | Arama kutusu + gizle/sil; görsel yükleme, sıra, SEO alanı, alt sektör, silme öncesi bağlılık denetimi yoktu. |
| Çeviri | `lib/sector-copy.ts` | 80 çekirdek sektörün 11 dilde adı/açıklaması. Özel sektörler çevrilmiyor. |
| Kullanım | `lib/match.ts`, `lib/catalog.ts`, `components/directory/search-screen.tsx`, `sector-strip.tsx`, `lib/blog.ts`, `lib/campaigns.ts` | Her yerde `business.category === sector.id` karşılaştırması; sektör düz liste varsayılıyordu. |

## 2. İşletme veri modeli

- `Business.category: CategoryId` tek değer; `subcategory: string` serbest metin ("Tesisatçı", "Balık", "Diş kliniği" …).
- Çoklu sektör, kuruluş türü (kamu/özel) ve profil türü (işletme / usta / içerik üreticisi …) alanı yoktu.
- "Kamu" ancak ad ya da özet metnine yazılarak ifade edilebiliyordu; doğrulama kavramı yoktu.
- Sunucu kayıtları (`lib/listings.ts` → `StoredListing`) aynı alanları taşıyordu; `acceptListing` kategoriyi doğrulamıyordu (bilinmeyen id kabul ediliyordu).

## 3. Excel içe aktarma

- `lib/listings-import.ts` → `sectorOf()` yalnızca `seedSectors` ile ad/id eşleşmesi yapıyordu.
- "Alt kategori" sütunu serbest metin olarak yazılıyor, ağaçla bağ kurulmuyordu.
- Kuruluş türü / profil türü sütunu yoktu. Hata raporu (`report`) ve ön izleme (`classifyGrid`) zaten vardı ve korunabilir durumdaydı.

## 4. SEO ve yönlendirme

- Sektör adresi `/ara?kategori=<id>`; sitemap'te sektör adresi yoktu.
- `/ara` sayfası sabit başlık ve açıklama taşıyordu.
- Sektör yeniden adlandırılırsa veya birleştirilirse eski bağlantı için yönlendirme kavramı yoktu.

## 5. Yetki ve denetim

- Yönetici oturumu `lib/admin-gate.ts` ile çerezde; `/api/ilan` buna göre yetki ayırıyordu.
- Sektör işlemleri için sunucu ucu yoktu; dolayısıyla denetim izi (kim, ne zaman, neyi değiştirdi) de yoktu.

## 6. Belgedeki isteklerin karşılığı — boşluk listesi

| Belge maddesi | Mevcut | Boşluk |
| --- | --- | --- |
| Çok seviyeli dinamik ağaç | Düz liste | Üst/alt ilişki, sunucu kaydı |
| Mevcut sektörler kök olarak korunsun | ≈80 çekirdek | Kimlikler korunarak kök yapılmalı |
| Kuruluş türü kamu/özel + doğrulama | Yok | Alan + yönetici onayı + rozet |
| Profil / hizmet sunucu türü | Yok | Alan + süzgeç |
| Birden fazla kategoride işletme | Tek `category` | `categories[]` |
| Yönetim: ekle / düzenle / sırala / görsel yükle / pasife al / kontrollü sil | Gizle/sil | Tamamı |
| Türkçe alfabetik A–Z | `localeCompare` yok | `Intl.Collator("tr")` |
| Süzgeçler (sektör, alt sektör, kamu/özel, durum) | Yalnız sektör | Alt sektör, kamu/özel, profil türü, durum |
| Ana sayfadan "Sektör ekle" kaldırılsın | Düğme var | Kaldır |
| Excel: sektör eşleştirme, ön izleme, hata raporu | Düz ad eşleşmesi | Ağaç eşleşmesi, yeni sütunlar |
| SEO: takma ad / yönlendirme | Yok | `aliases`, `remap`, sitemap, meta |
| Durum + denetim kaydı | Yok | `status`, `log` |
| Yetki | Yönetici kapısı var | Sektör ucu yönetici-only |

## 7. Riskler ve korunması gerekenler

- **Kimlikler değişmemeli.** `yeme`, `usta`, `saglik` gibi id'ler işletme kayıtlarında, blog kategorilerinde, kampanyalarda ve dış bağlantılarda geçiyor.
- **Sorgu çözümleme kırılmamalı.** `parseQuery` sektör ifadelerini (`phrases`) kök sektörlerden okur; alt sektör ifadeleri eklenirse "tesisatçı" aramasının `usta` köküne düşmesi korunmalı.
- **Yerel sektörler kaybolmamalı.** Eski akışta tarayıcıya yazılmış özel sektörler yönetici tarafından sunucuya taşınabilmeli, ardından yerel kayıt silinmeli.
- **Veri göçü gerektirmemeli.** Alt sektör etiketleri mevcut `subcategory` metinleriyle aynı yazılırsa işletmeler kendiliğinden bağlanır.
