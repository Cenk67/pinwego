import Link from "next/link"
import type { FaqItem, SitePage } from "@/lib/site-pages"

function FaqList({ items }: { items: FaqItem[] }) {
  const groups = new Map<string, FaqItem[]>()
  for (const item of items) {
    const list = groups.get(item.category) ?? []
    list.push(item)
    groups.set(item.category, list)
  }
  return (
    <div className="mt-8 grid gap-8">
      {[...groups.entries()].map(([category, rows]) => (
        <section key={category}>
          <h2 className="font-heading text-2xl">{category}</h2>
          <div className="mt-3 grid gap-2">
            {rows.map((item) => (
              <details key={item.id} className="rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10">
                <summary className="cursor-pointer font-medium">{item.question}</summary>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
                {item.related ? (
                  <Link href={item.related} className="mt-2 inline-block text-sm text-primary">
                    İlgili sayfa
                  </Link>
                ) : null}
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export function TextPage({ page, faqs = [] }: { page: SitePage; faqs?: FaqItem[] }) {
  const data = page.slug === "sss" && faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      }
    : null
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <p className="text-sm font-medium text-primary">{page.legal ? "Hukuki metin taslağı" : "Pinwego"}</p>
      <h1 className="mt-2 font-heading text-4xl leading-tight text-balance">{page.title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{page.summary}</p>
      {page.legal ? (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Sürüm {page.version} · Yürürlük {page.effectiveAt} · Bağlayıcı dil Türkçedir.
        </p>
      ) : null}
      <div className="mt-8 grid gap-4 text-base leading-7">
        {page.blocks.map((block, index) => {
          if (block.type === "h2") return <h2 key={index} className="mt-4 font-heading text-2xl">{block.text}</h2>
          if (block.type === "ul") {
            return (
              <ul key={index} className="grid list-disc gap-2 pl-5 text-sm leading-6">
                {block.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )
          }
          if (block.type === "a") {
            return <Link key={index} href={block.href} className="text-sm text-primary">{block.label}</Link>
          }
          if (block.type === "img") {
            return (
              // Yerel /photos yolu. İyileştirici görsel katmanı bu taslakta yok.
              // eslint-disable-next-line @next/next/no-img-element
              <img key={index} src={block.src} alt={block.alt} className="max-h-80 w-full rounded-3xl object-cover" />
            )
          }
          return <p key={index}>{block.text}</p>
        })}
      </div>
      {page.slug === "sss" ? <FaqList items={faqs} /> : null}
      {page.related.length ? (
        <div className="mt-10 flex flex-wrap gap-3 text-sm">
          {page.related.map((href) => (
            <Link key={href} href={href.startsWith("/") ? href : `/${href}`} className="rounded-full bg-secondary px-3 py-1.5">
              {href.replace(/^\//, "").replaceAll("-", " ")}
            </Link>
          ))}
        </div>
      ) : null}
      {data ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replaceAll("<", "\\u003c") }} />
      ) : null}
    </article>
  )
}
