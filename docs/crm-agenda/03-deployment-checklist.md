# Canlıya alma kontrolü

Canlıya alma onayı bu listeyle yapılır.

- Yönetici çerezi olmayan istek 401 döner.
- `crm:v1` dışında KV anahtarı yazılmaz.
- Blog ve önbellek anahtarları silinmez.
- Kişisel kayıt arama sonucunda görünmez.
- Eski yönetim sekmeleri açılır.
- Hatırlatma taraması aynı bildirimi ikinci kez açmaz.
- Posta yalnızca ayar açıkken ve kaydın mail işareti varken gider. Aynı kayıt ikinci kez postalanmaz.
- Worker zamanlayıcısı her gün 08:00 ve 15:00 İstanbul saatinde hatırlatma postasını hazırlar. Site isteği aynı girişten geçer.
