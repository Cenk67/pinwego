import Link from "next/link"
import { BUSINESSES } from "@/lib/businesses"
import { CATEGORIES, CITIES } from "@/lib/categories"

export default function DirectoryPage() {
  const countries = [...new Set(CITIES.map((c) => c.country))]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm text-muted-foreground">Hotfrog · Brownbook · Infobel</p>
      <h1 className="mt-1 text-3xl md:text-5xl">Ülke, şehir, sektör</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Klasik firma rehberi hiyerarşisi: coğrafya ile kategori kesişir. Her
        düğüm canlı katalogdaki kayıtlara gider.
      </p>

      <div className="mt-10 space-y-10">
        {countries.map((country) => (
          <section key={country}>
            <h2 className="text-2xl">{country}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CITIES.filter((c) => c.country === country).map((city) => {
                const count = BUSINESSES.filter((b) => b.citySlug === city.slug).length
                return (
                  <Link
                    key={city.slug}
                    href={`/sehir/${city.slug}`}
                    className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10 hover:shadow-md"
                  >
                    <p className="font-heading text-xl">{city.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {count} işletme · {city.country}
                    </p>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-2xl">Sektörler</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const count = BUSINESSES.filter((b) => b.category === c.id).length
            return (
              <Link
                key={c.id}
                href={`/kategori/${c.id}`}
                className="flex items-center justify-between rounded-2xl bg-card p-4 ring-1 ring-foreground/10 hover:shadow-md"
              >
                <div>
                  <p className="font-medium">{c.label}</p>
                  <p className="text-sm text-muted-foreground">{c.inspiredBy}</p>
                </div>
                <span className="text-sm text-muted-foreground">{count}</span>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
