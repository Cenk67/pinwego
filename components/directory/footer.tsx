import Link from "next/link"

export function Footer() {
  return (
    <footer className="mt-16 border-t border-foreground/10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-heading text-2xl">Pinora</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Yakındaki ticari kaydı arama, itibar, fiyat ve randevuyla aynı ekranda toplar.
            Eşleştirme bu tarayıcıda, örnek katalog üzerinden çalışır.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-medium">Gez</p>
          <div className="mt-3 grid gap-2 text-muted-foreground">
            <Link href="/ara">Arama</Link>
            <Link href="/talep">Uzman talebi</Link>
            <Link href="/listele">İşletme kaydı</Link>
            <Link href="/kaydedilenler">Karşılaştırma</Link>
          </div>
        </div>
        <div className="text-sm">
          <p className="font-medium">Not</p>
          <p className="mt-3 leading-6 text-muted-foreground">
            İşletmeler, yorumlar ve fiyatlar ürünü göstermek için hazırlanmış örnek kayıtlardır. Hesap doğrulaması
            ve yüklenen belgeler bu tarayıcıda kalır.
            Yol tarifi harici haritayı açar. Fotoğraflar Unsplash kaynaklıdır.
          </p>
        </div>
      </div>
    </footer>
  )
}
