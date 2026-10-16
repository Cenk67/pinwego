# Sektör ve Alt Sektör Sistemi — Uygulama notu

"Pinwego Sektör ve Alt Sektör Sistemi" belgesindeki maddelerin kodda nereye oturduğu. Faz 0 raporu
`00-analiz.md` dosyasındadır. Çekirdek sektör kimlikleri değişmedi; eski adresler çalışmaya devam eder.

## Veri modeli

| Kavram | Kod |
| --- | --- |
| Ağaç düğümü | `lib/taxonomy.ts` → `TaxonomyNode = Sector & { parentId, status, order, seoTitle, seoDescription, aliases, seed, updatedAt }` |
| Sunucu kaydı | KV anahtarı `taxonomy:v1` → `TaxonomyState { overrides, nodes, remap, log }`. Yalnız **fark** saklanır: çekirdek sektörlere yapılan düzenlemeler `overrides`, yeni düğümler `nodes`, birleştirme yönlendirmeleri `remap`, denetim izi `log`. Ağaç her okumada `seedTaxonomy() + state` ile yeniden kurulur (`buildTaxonomy`). |
| Kök sektörler | `lib/sectors.ts` → `seedSectors` (40, kimlikleri sabit) |
| Başlangıç alt sektörleri | `lib/taxonomy.ts` → `seedChildren` (~100; `usta-tesisatci`, `saglik-dis-kligini` gibi `kök-slug` kimlikler). Etiketler katalogdaki `subcategory` metinleriyle aynı yazıldı; mevcut işletmeler veri göçü olmadan bağlanır (`businessInNode`, `businessLeaf`). |
| Kuruluş türü | `Business.orgKind: "kamu" \| "ozel"`, `orgVerified` (yalnız yönetici işaretler). Üye kamu seçerse "beyan" sayılır. |
| Profil türü | `Business.providerKind`: `isletme`, `kurum`, `usta`, `ulasim`, `icerik`, `serbest`, `diger` (`providerKinds`) |
| Çoklu sektör | `Business.categories?: CategoryId[]` (alt sektör ve ek kökler; en fazla 5 + ana). Arama, sayım ve süzgeçler `inSector(business, id)` ile ağaç duyarlı çalışır. |
| Türkçe sıralama | `collator = new Intl.Collator("tr")`, `sortTr`, `TR_LETTERS`, `letterGroups` |

## Sunucu

| Uç | Kod |
| --- | --- |
| `GET /api/sektor` | `lib/taxonomy-flow.ts` → `sektorGetFlow`. Ziyaretçiye aktif ağaç + `remap`; yönetici oturumuna tam ağaç, `log`, geçiş raporu (`migrationReport`) ve düğüm başına işletme sayısı. |
| `POST /api/sektor` (yönetici) | `sektorPostFlow` → `applyTaxonomyOp`: `upsert` (ekle/düzenle, üst değiştirme, döngü koruması), `durum` (aktif/pasif), `sira` (kardeş sırası), `sil` (`mode: sil \| pasif \| aktar`). Çekirdek sektör kalıcı silinmez (`409 seed`); bağlı alt sektör veya işletme varsa silinmez (`409 bagli`, `deps` döner). `aktar` bağlı sunucu kayıtlarını hedefe yazar ve `remap` ekler. `yerel-aktar` eski tarayıcı sektörlerini toplu taşır. Hız sınırı 120 işlem / 10 dk. |
| İşletme sınıflandırma | `/api/ilan` → `op: "sinif"` (yönetici veya kaydın sahibi). `lib/listings.ts` → `applyClassification`; `create` artık yalnızca ağaçtaki aktif kimlikleri kabul eder (`reason: "kategori"`). |
| Denetim izi | `TaxonomyState.log` (son 300): tarih, aktör, işlem, düğüm, ayrıntı. Yönetim → Sektörler → Geçmiş. |

Testler: `npx tsx lib/taxonomy.test.ts`, `npx tsx lib/taxonomy-flow.test.ts`, `npx tsx lib/listings-flow.test.ts`.

## İstemci

| Belge maddesi | Kod |
| --- | --- |
| Ağaç tarayıcıya iner | `lib/directory-context.tsx` → `startRemote` önce `/api/sektor`, sonra `/api/ilan` okur; `installTaxonomy()` ağacı `setLiveTaxonomy` ile tüm modüllere kurar. `allSectors()` aktif ağacı, `rootSectors()` kökleri döner. |
| Pasif sektör gizlenir | `activeNodes`; pasif sektördeki işletme (başka aktif sektörü yoksa) `sectorVisible` ile keşif/arama/talepten düşer. |
| Ana sayfadan "Sektör ekle" kaldırıldı | `components/directory/sector-strip.tsx` (düğme yerine "Aradığın sektör yok mu? Bize yaz." → `/iletisim`), `home-screen.tsx`, `sector-form.tsx` silindi. |
| Arama süzgeci kök → alt | `search-screen.tsx`: `<optgroup>` kök, altında "{kök} – tümü" + alt sektörler (Türkçe sıralı). `?kategori=<alt-id>` doğrudan çalışır. |
| Takma ad / birleştirme yönlendirmesi | `resolveNodeId(nodes, remap, id)`; eski id gelirse URL yeni id ile değiştirilir ve "Bu sektör taşındı" notu çıkar. |
| Sektör yolu | `SectorPath` (Sektör: Usta & tamir › Tesisatçı) |
| Kamu / profil rozetleri | `components/directory/class-badges.tsx` → kartta ve profilde "Kamu kurumu" (doğrulanmış) / "Kamu (doğrulanmadı)" / "Bağımsız usta" … 12 dilde (`kind.*` anahtarları). |
| `/listele` formu | `components/directory/classification-fields.tsx` → sektör, alt sektör, ek sektörler, kuruluş türü, profil türü. Üye kamu seçerse doğrulama notu görür. |

## Yönetim paneli

| Belge maddesi | Kod |
| --- | --- |
| Sektör sekmesi | `components/admin/sector-admin.tsx` |
| A–Z Türkçe harf çubuğu | `TR_LETTERS`, yalnız dolu harfler etkin |
| Süzgeçler | arama, seviye (ana/alt), durum (aktif/pasif), sıralama (A–Z / el sırası) |
| Ağaç görünümü | kök satırı açılır-kapanır; her satırda görsel, kimlik/adres, işletme sayısı, alt sayısı, pasif/özel rozeti |
| Ekle / düzenle | `NodeDialog`: ad, üst sektör (döngü koruması: kendi altı seçilemez), açıklama, arama sözcükleri, varsayılan işlem, durum, renk, simge, kapak |
| Görsel yükleme + otomatik ölçekleme | `lib/image-scale.ts` → `scaleCoverFile` (1280×720 çerçeve, ≤120 KB, WebP/JPEG); stok kapaklar da seçilebilir; boşsa üst sektörün görseli |
| Sıralama | el sırası modunda yukarı/aşağı (`op: "sira"`) |
| Pasife alma | satırdaki düğme ya da silme akışında |
| Kontrollü silme | `RemoveDialog`: bağlılık sayısı; seçenekler pasife al / başka sektöre aktar / kalıcı sil (yalnız bağlı kaydı olmayan özel sektör) |
| SEO | SEO başlığı, açıklaması, eski kimlikler (takma ad → yönlendirme) |
| Geçiş raporu | `ReportPanel`: ağaçta olmayan kimlikler, alt sektöre bağlanamayan serbest metinler, kamu beyanı bekleyenler, kök başına sayım |
| Denetim izi | `LogPanel` |
| Eski yerel sektörler | üst şerit: "Sunucuya taşı" (`yerel-aktar`) veya sil |
| İşletmeler sekmesi süzgeçleri | sektör/alt sektör, kamu/özel/(doğrulama bekleyen), profil türü, durum; satırda alt sektör + "Kamu ✓ / Kamu (beyan)" |
| İşletme düzenle / ekle | `ClassificationFields admin`; "Kamu kurumu doğrulandı" kutusu; sunucu kayıtlarında `op: "sinif"` çağrılır |

## Excel içe aktarma

| Belge maddesi | Kod |
| --- | --- |
| Sektör eşleştirme | `lib/listings-import.ts` → `sectorOf()` artık `matchNodeByText(aktif ağaç)`: kimlik, ad, takma ad veya "Ana > Alt" yolu. Alt sektör gelirse kategori = kök, `categories = [alt]`, `subcategory = alt etiketi`. "&", "ve", noktalama farkı yok sayılır (`labelKey`). |
| Alt kategori sütunu | kök altındaki alt sektörle eşleşirse bağlanır; eşleşmezse serbest metin kalır ve satır notu "ağaçta yok" uyarısıyla rapora düşer (satır reddedilmez). |
| Yeni sütunlar | `kurulus turu` (kamu/özel; hatalıysa satır hata), `profil turu` (kimlik ya da etiket; hatalıysa satır hata). Şablon `listingSheetSample` güncellendi. |
| Güncelleme | `guncelle` satırları `categories`, `orgKind`, `providerKind` farklarını da gösterir ve yazar. |

Test: `npx tsx lib/listings-import.test.ts`.

## SEO

| Belge maddesi | Kod |
| --- | --- |
| Sitemap | `app/sitemap.ts` → `/ara` + her aktif düğüm için `/ara?kategori=<id>` (kök 0.7, alt 0.5) |
| Sayfa başlığı / açıklaması | `app/ara/page.tsx` → `generateMetadata` + `lib/taxonomy-server.ts` → `sectorMetadata`: düğümün `seoTitle`/`seoDescription`, boşsa "Usta & tamir › Tesisatçı işletmeleri"; `canonical` çözümlenmiş kimliğe işaret eder; bilinmeyen kimlik `noindex` |
| Yönlendirme | takma ad ve `remap` hem sunucu (`canonical`) hem istemci (URL düzeltme) tarafında çözülür |

## Belgeden farklı yapılanlar (gerekçeli)

- **Fark saklama.** Ağacın tamamı yerine çekirdek + fark saklanır; böylece kod güncellemesiyle gelen yeni çekirdek sektörler otomatik görünür, yönetici düzenlemeleri korunur.
- **Çekirdek sektör silinmez.** Belge "kontrollü silme" ister; kimlikler dış bağlantılarda geçtiği için çekirdek düğümler yalnızca pasife alınır ya da aktarılır. Özel düğümler bağlılık yoksa kalıcı silinir.
- **Kamu beyanı.** Üye kamu seçebilir ama rozet yönetici doğrulamasından sonra "Kamu kurumu" olur; o ana kadar "Kamu (doğrulanmadı)" görünür. Böylece sahte kamu iddiası görünürlük avantajı sağlamaz.
- **Yerel sektörler.** Eski akışın tarayıcı kayıtları silinmez; yönetici görür, sunucuya taşır ya da siler.
- **Çeviri.** Çekirdek 40 sektörün çevirileri korunur; yeni alt sektörler Türkçe etiketleriyle gösterilir (çeviri tablosu sonradan eklenebilir).

## Canlıya alma

PR birleşince `npm run deploy:vinext` ile yayınlanır. KV'de `taxonomy:v1` yoksa ağaç çekirdekten kurulur; ilk yönetici işlemi anahtarı oluşturur. Geri dönüş: anahtar silinirse sistem çekirdek ağaca döner, işletme kayıtlarındaki `categories`/`orgKind`/`providerKind` alanları zararsız kalır.
