# Akıllı işletme keşfi

Pinwego araması önce kendi kataloğunda kalır. Az sonuçta veya hiç sonuç yokken kullanıcı platformdan çıkmadan üç yol görür: Google Haritalar, Pinwego içindeki dış liste, işletme kaydı.

## Arama

`/ara` mevcut sıralama ve süzgeçle çalışır. Sorgu boşken keşif alanı açılmaz. Sonuç sayısı yönetici eşiğinin altındaysa alan açılır. Eşik varsayılanı 3’tür. Katalog sonuçları silinmez ve yerini dış listeye bırakmaz.

Haritalar adresi `https://www.google.com/maps/search/?api=1&query=` biçimindedir. Şehir sorguya bir kez eklenir. Bağlantı yeni sekmede, `noopener` ile açılır. API anahtarı gerekmez.

Yayındaki blog yazıları asistanın kaynağıdır. Başlık, özet veya metin cümleyle örtüşürse en fazla üç Pinwego rehberi kartı açılır. Yayında olmayan yazı gelmez. Dış bağlantıdan önce durur.

Arama kutusunun altında üç kapsam vardır. “Pinwego ve gerektiğinde dış kaynaklar” az sonuçta Haritalar, Google araması ve YouTube bağlantısını açar. “Önce yalnızca Pinwego işletmeleri” bu bağlantıları gizler. “Bilgi, rehber ve video içerikleri de ara” kayıt çok olsa da aynı bağlantıları gösterir. Dönen sayfalar Pinwego kaydı değildir; içerik kopyalanmaz. Kombi gibi iş adı geçmeyen ihtiyaç cümlesi, mevcut sektör eşleşmesi yoksa enerji gibi ilgili sektöre gider. Sesli arama aynı kutudadır. Sponsor sıralaması değişmez.

## Keşif sayfası

Adres `/kesif?q=&sehir=` şeklindedir. Sayfa `noindex` alır. Yeni arama kutusu vardır. Places listesi `GET /api/kesif` üzerinden gelir.

Anahtar yoksa yanıt `unconfigured` olur. Sayfa bunu söyler ve Haritalar bağlantısını açık tutar. Kota veya ağ hatasında da Haritalar durur. Google hata metni ve anahtar yanıtta yoktur.

Anahtar varsa Text Search (New) çağrılır. FieldMask yalnızca kimlik, ad, adres, Haritalar bağlantısı ve işletme durumudur. Kalıcı kapalı kayıtlar listeye girmez. Sayfa başına en fazla 8 sonuç. Aynı sorgu 30 saniye bu çalışan kopyada tutulur; bu bir katalog değildir ve KV’ye yazılmaz. Dakikada 12 istek sınırı da bu kopyayadır, bütün ziyaretçilerin ortak defteri değildir.

## Veri ayrımı

Google’dan gelen ad ve adres Pinwego kataloğuna yazılmaz. Kayıt düğmesi `/listele` formuna yalnızca taslak ad ve adres notu taşır. Kayıt, işletme sahibi formu gönderince oluşur. Doğrulama ve yönetici onayı mevcut akıştadır.

## Yönetim

Yönetimdeki Keşif sekmesi bu tarayıcıda durur: özelliği, Places denemesini ve Haritalar bağlantısını açıp kapatır. Ülke, eşik, sonuç sayısı ve kayıt yolu da buradadır. API anahtarı gösterilmez. Sayaçlar: sonuçsuz arama, Places isteği, bulunan sayı, Haritalar tıklaması, kayıt sayfası, kayıt oluşumu. Kişi verisi yoktur. Başka tarayıcının sayacı buraya düşmez.

## Ortam

`.env.example` içinde `GOOGLE_MAPS_API_KEY` boştur. Gerçek anahtar Google Cloud’da Places API (New) açıldıktan sonra sunucu ortamına konur ve kısıtlanır. Bu depoda anahtar yoktur.

## Test

`lib/discover.test.ts` Haritalar adresini, şehir yinelemesini, kötü sorguyu, eşiği, ülke kodunu, taslak yolu ve istek sınırını doğrular.
