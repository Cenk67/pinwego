# Pinwego CRM ön inceleme notu

Pinwego Next.js 16 ve React 19 ile çalışır. Kalıcı işletme kataloğu dosyadadır. Hesaplar `pinwego-accounts` KV alanındadır. Ayrı bir SQL veritabanı veya ORM yoktur.

CRM yeni tablo açmaz. Kayıtlar aynı hesap alanında `crm:v1` anahtarıyla durur. Blog ve önbellek alanlarına yazılmaz. Kişisel kayıtlar katalog, arama ve işletme sayfalarına bağlanmaz.

Erişim yalnızca yönetici oturum çerezidir. Müşteri ve işletme rolleri bu kayıtlara API’den ulaşamaz. Yeni bir kimlik sistemi eklenmedi.

Para kuruş olarak tam sayı tutulur. Teklif toplamı, vergi ve kalan tahsilat sunucuda hesaplanır. Kazanılan fırsat, teklif ve tahsilat ayrıdır. Elle işaretlenen ödeme banka teyidi sayılmaz. Abonelik kaydı site erişimi açmaz.

Hatırlatma aynı anahtarla bir kez yazılır. CRM her okunduğunda sunucu taraması çalışır. Canlı Worker zamanlayıcısı bu ön izlemede bağlanmadı; bağlamak site giriş dosyasını değiştirir ve ancak canlıya alma sırasında yapılır.
