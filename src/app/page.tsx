import Link from "next/link"
import {
  CalendarClock,
  FileSearch,
  MapPinned,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { BusinessCard } from "@/components/business-card"
import { CategoryGrid } from "@/components/category-grid"
import { SearchHero } from "@/components/search-hero"
import { featuredBusinesses, topReviewed } from "@/lib/businesses"
import { CITIES } from "@/lib/categories"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DirectorySynthesisSection } from "@/components/DirectorySynthesisSection"

const STEPS = [
  {
    icon: Sparkles,
    title: "Cümleyle sor",
    text: "“Kadıköy’de teraslı restoran” veya “acil tesisatçı” yaz. Lumina kategori, fiyat ve mahalleyi çıkarır.",
  },
  {
    icon: MapPinned,
    title: "Harita + reputasyon",
    text: "Yorum, fotoğraf, açık/kapalı ve yol tarifi aynı kartta. Puan tek başına sıralamaz; hacim de sayılır.",
  },
  {
    icon: CalendarClock,
    title: "Randevu veya teklif",
    text: "Kuaför ve klinikte slot seç. Usta ve B2B’de ihtiyacı yaz, eşleşen firmalara teklif gönder.",
  },
]

const INSPIRED = [
  { name: "Yelp", take: "Profil, fotoğraf, yorum" },
  { name: "Tripadvisor", take: "Reputasyon ağırlığı" },
  { name: "MapQuest", take: "Harita ve yol tarifi" },
  { name: "Booksy", take: "Hizmet → fiyat → randevu" },
  { name: "Thumbtack", take: "İhtiyaç eşleştirme" },
  { name: "D&B / Kompass", take: "B2B istihbarat kartı" },
  { name: "Hotfrog", take: "Ülke · şehir · sektör" },
  { name: "Manta", take: "Ücretsiz liste" },
]

export default function HomePage() {
  const featured = featuredBusinesses()
  const trending = topReviewed()

  return (
    <>
      <SearchHero />

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl">Kategoriler</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Restorandan ihracatçıya, randevudan teklife.
            </p>
          </div>
          <Link href="/dizin" className="text-sm text-primary hover:underline">
            Tüm dizin
          </Link>
        </div>
        <div className="mt-6">
          <CategoryGrid />
        </div>
      </section>

      <section className="bg-card/50 py-12 ring-1 ring-foreground/5">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl md:text-3xl">Öne çıkan işletmeler</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Doğrulanmış profil, yüksek yorum hacmi, açık randevu veya teklif.
          </p>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {featured.map((b) => (
              <BusinessCard key={b.slug} business={b} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl md:text-3xl">Nasıl çalışır</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
            >
              <s.icon className="size-6 text-primary" />
              <h3 className="mt-4 text-xl">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl md:text-3xl">En çok yorumlananlar</h2>
          <Link href="/ara?sort=reviews" className="text-sm text-primary hover:underline">
            Tümünü gör
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {trending.slice(0, 4).map((b) => (
            <BusinessCard key={b.slug} business={b} compact />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <h2 className="text-2xl md:text-3xl">Şehirlere göre</h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {CITIES.map((c) => (
            <Link
              key={c.slug}
              href={`/sehir/${c.slug}`}
              className="rounded-full bg-card px-4 py-2 text-sm ring-1 ring-foreground/10 hover:ring-foreground/25"
            >
              {c.label}
              <span className="ml-2 text-muted-foreground">{c.country}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-3xl bg-foreground px-6 py-10 text-background md:px-10">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <h2 className="text-3xl text-background md:text-4xl">
                Bu rehber hangi ürünlerden öğrendi?
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-background/70">
                Klasik sarı sayfalar ile modern pazaryerinin kesişimi: arama,
                yorum, fotoğraf, harita, randevu, teklif ve ticari istihbarat.
                Lumina bunları tek mobil akışta birleştirir.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/asistan"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-11 bg-primary text-primary-foreground"
                  )}
                >
                  Asistanı dene
                </Link>
                <Link
                  href="/kayit"
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "h-11 border-background/30 bg-transparent text-background hover:bg-background/10"
                  )}
                >
                  Ücretsiz listele
                </Link>
              </div>
            </div>
            <ul className="grid grid-cols-2 gap-3 text-sm">
              {INSPIRED.map((row) => (
                <li
                  key={row.name}
                  className="rounded-xl bg-background/10 p-3 ring-1 ring-background/10"
                >
                  <p className="font-medium">{row.name}</p>
                  <p className="text-background/65">{row.take}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3">
          <Stat icon={MessagesSquare} label="Yorum katmanı" value="Reputasyon + fotoğraf" />
          <Stat icon={ShieldCheck} label="Doğrulama" value="İşletme rozeti ve B2B kartı" />
          <Stat icon={FileSearch} label="Çift niyet" value="Randevu ve teklif aynı sitede" />
        </div>
      </section>

      {/* 20 GLOBAL DIRECTORIES MATRIX */}
      <DirectorySynthesisSection />
    </>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldCheck
  label: string
  value: string
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-5 text-primary" />
      <div>
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}
