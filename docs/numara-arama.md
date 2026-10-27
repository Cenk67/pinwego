# Numaradan işletme bulma

Arama çubuğu bir işletme numarası görünce önce Pinwego kataloğuna bakar. Ücretli dış servis kendiliğinden çağrılmaz.

## Ne eşleşir

Yayımlanmış `phone`, sabit hat, GSM ve WhatsApp alanları. Aynı alandaki birden fazla numara `;`, `|`, `,` veya `ve` ile ayrılmışsa ayrı ayrı bakılır. `0532…`, `0`lı sabit hat, `+90`, `0090` ve `444` kısa numarası aynı kayda düşer. Yedi haneli yerel numara yalnızca yazıldığı gibi, ayraçlıysa eşleşir.

Müşteri hesaplarındaki kişisel GSM bu aramaya girmez. Numara eksikse hiçbir kayıt seçilmez. Metnin içinde geçen numara, işletmenin kendi telefonu değilse sonuç olmaz. Aynı numara birden fazla kayıttaysa hepsi listelenir; doğrulanmış kayıt üstte durur. Şehir ve sektör süzgeci numarayı gizlemez.

## Ne yapılmaz

Google Places API numarayla otomatik sorgulanmaz. Telefon numarası `/api/kesif` metin aramasına da gitmez. Haritalar ve web bağlantısı yalnızca ziyaretçi tıklayınca açılır ve dönen sayfa kataloğa yazılmaz. Analitik ve “son aramalar” ham numarayı saklamaz; sayaç `numara` etiketiyle tutulur.

Kayıt düğmesi `/listele?tel=` ile yalnızca biçimlenmiş numarayı taslak olarak taşır. İlan, işletme hesabı formu gönderince oluşur.

## Neden belgedeki ikinci katman kapalı

Belge, eşleşme yoksa Google Places ile telefon aramasını önerir. Bu repoda Places zaten metin keşfi için vardır ve alan maskesi dardır. Numarayla otomatik çağrı üç riski birlikte açar: istek başına ücret, Google gösterim ve saklama koşulları, kişisel numaradan kişi bilgisi çıkması. Bu yüzden ikinci katman tıklama anına bırakıldı. Anahtar ve kota değişmeden mevcut ihtiyaç araması aynı kalır.
