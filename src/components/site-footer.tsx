import Link from "next/link"
import { CATEGORIES, CITIES } from "@/lib/categories"
import { LuminaMark } from "@/components/logo"

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2">
            <LuminaMark className="size-7" />
            <span className="font-heading text-lg">Lumina</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Yelp’ten randevuya, D&amp;B’den haritaya: yerel ve ticari işletmeleri
            tek yapay zekâ katmanında birleştiren rehber.
          </p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Kategoriler
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {CATEGORIES.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link href={`/kategori/${c.id}`} className="hover:text-primary">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Şehirler
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {CITIES.filter((c) => c.country === "Türkiye").map((c) => (
              <li key={c.slug}>
                <Link href={`/sehir/${c.slug}`} className="hover:text-primary">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Ürün
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li>
              <Link href="/asistan" className="hover:text-primary">
                AI asistan
              </Link>
            </li>
            <li>
              <Link href="/teklif" className="hover:text-primary">
                Hizmet teklifi
              </Link>
            </li>
            <li>
              <Link href="/dizin" className="hover:text-primary">
                Ülke / şehir / sektör
              </Link>
            </li>
            <li>
              <Link href="/kayit" className="hover:text-primary">
                Ücretsiz kayıt
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
        Lumina demo kataloğu · canlı veri bağlı değildir · 2026
      </div>
    </footer>
  )
}
