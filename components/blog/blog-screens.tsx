"use client"

import Link from "next/link"
import {
  absoluteUrl,
  articlePath,
  categoryPath,
  contentBlocks,
  findArticle,
  findCategory,
  findSubcategory,
  formatBlogDate,
  publicArticles,
  subcategoryPath,
  type BlogArticle,
} from "@/lib/blog"
import { useBlog } from "@/components/blog/blog-context"

export function BlogIndex() {
  const { document } = useBlog()
  const articles = publicArticles(document)
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm font-medium text-primary">Blog</p>
      <h1 className="mt-2 max-w-3xl font-heading text-4xl leading-tight md:text-5xl">Kategori, alt kategori, görsel, yazı.</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
        Rehber yazıları editörden gelir. Şehir sayfaları, aynı sektörde en az üç kayıt varsa katalogdan üretilir.
        Her sayfanın adresi kategori ve alt kategoriye bağlıdır.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {document.categories.map((category) => {
          const count = articles.filter((article) => article.categoryId === category.id).length
          return (
            <Link key={category.id} href={categoryPath(category.slug)} className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
              <p className="text-xs text-primary">{count} yazı</p>
              <h2 className="mt-2 font-heading text-2xl">{category.name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{category.description}</p>
            </Link>
          )
        })}
      </div>
      <section className="mt-12">
        <h2 className="font-heading text-3xl">Son yazılar</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {articles.slice(0, 9).map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>
    </div>
  )
}

export function CategoryScreen({ slug }: { slug: string }) {
  const { document } = useBlog()
  const category = findCategory(document, slug)
  if (!category) return <Missing title="Kategori yok" />
  const subs = document.subcategories.filter((item) => item.categoryId === category.id)
  const articles = publicArticles(document).filter((article) => article.categoryId === category.id)
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Crumbs items={[{ href: "/blog", label: "Blog" }, { label: category.name }]} />
      <h1 className="mt-4 font-heading text-4xl">{category.name}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{category.description}</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subs.map((subcategory) => {
          const count = articles.filter((article) => article.subcategoryId === subcategory.id).length
          return (
            <Link
              key={subcategory.id}
              href={subcategoryPath(category.slug, subcategory.slug)}
              className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10"
            >
              <p className="text-xs text-primary">{count} yazı</p>
              <h2 className="mt-1 font-heading text-xl">{subcategory.name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{subcategory.description}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function SubcategoryScreen({ categorySlug, subcategorySlug }: { categorySlug: string; subcategorySlug: string }) {
  const { document } = useBlog()
  const match = findSubcategory(document, categorySlug, subcategorySlug)
  if (!match) return <Missing title="Alt kategori yok" />
  const articles = publicArticles(document).filter((article) => article.subcategoryId === match.subcategory.id)
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Crumbs
        items={[
          { href: "/blog", label: "Blog" },
          { href: categoryPath(match.category.slug), label: match.category.name },
          { label: match.subcategory.name },
        ]}
      />
      <h1 className="mt-4 font-heading text-4xl">{match.subcategory.name}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{match.subcategory.description}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  )
}

export function ArticleScreen({
  categorySlug,
  subcategorySlug,
  slug,
}: {
  categorySlug: string
  subcategorySlug: string
  slug: string
}) {
  const { document } = useBlog()
  const article = findArticle(document, categorySlug, subcategorySlug, slug)
  if (!article) return <Missing title="Yazı yok" />
  const blocks = contentBlocks(article.body)
  const data = articleJsonLd(article)
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
      <Crumbs
        items={[
          { href: "/blog", label: "Blog" },
          { href: categoryPath(article.categorySlug), label: article.categoryName },
          { href: subcategoryPath(article.categorySlug, article.subcategorySlug), label: article.subcategoryName },
          { label: article.title },
        ]}
      />
      <header className="mt-4">
        <p className="text-sm font-medium text-primary">
          {article.categoryName} · {article.subcategoryName}
        </p>
        <h1 className="mt-2 font-heading text-4xl leading-tight">{article.title}</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">{article.description}</p>
        <time className="mt-3 block text-sm text-muted-foreground" dateTime={article.publishedAt}>
          {formatBlogDate(article.publishedAt)}
          {article.updatedAt !== article.publishedAt ? ` · güncellendi ${formatBlogDate(article.updatedAt)}` : ""}
        </time>
      </header>
      <figure className="mt-6 overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10">
        <img src={article.image} alt={article.imageAlt} className="aspect-[16/9] w-full object-cover" />
        <figcaption className="px-4 py-3 text-sm text-muted-foreground">{article.imageAlt}</figcaption>
      </figure>
      <div className="mt-8 grid gap-4 text-base leading-7">
        {blocks.map((block, index) =>
          block.type === "ul" ? (
            <ul key={index} className="grid list-disc gap-2 pl-5">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p key={index}>{block.text}</p>
          ),
        )}
      </div>
      {article.kind === "programmatic" ? (
        <p className="mt-8 text-sm leading-6 text-muted-foreground">
          Bu sayfa katalogdaki kayıtlardan üretildi. Metin ve görsel yönetim panelinden değiştirilebilir.
        </p>
      ) : null}
      {article.related?.length ? (
        <aside className="mt-8 rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
          <h2 className="font-heading text-2xl">Katalog kayıtları</h2>
          <ul className="mt-3 grid gap-2">
            {article.related.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="font-medium text-primary">
                  {item.label}
                </Link>
                {item.note ? <span className="text-sm text-muted-foreground"> · {item.note}</span> : null}
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </article>
  )
}

function ArticleCard({ article }: { article: BlogArticle }) {
  return (
    <Link href={articlePath(article)} className="overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10">
      <img src={article.image} alt="" className="aspect-[16/10] w-full object-cover" />
      <div className="p-4">
        <p className="text-xs text-primary">
          {article.categoryName} · {article.subcategoryName}
        </p>
        <h3 className="mt-1 font-heading text-xl leading-tight">{article.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{article.description}</p>
      </div>
    </Link>
  )
}

function Crumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="İçerik yolu" className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
          {index ? <span aria-hidden>/</span> : null}
          {item.href ? (
            <Link href={item.href} className="hover:text-primary">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

function Missing({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-heading text-4xl">{title}</h1>
      <Link href="/blog" className="mt-4 inline-block text-sm text-primary">
        Bloga dön
      </Link>
    </div>
  )
}

function articleJsonLd(article: BlogArticle) {
  const url = absoluteUrl(articlePath(article))
  const image = article.image.startsWith("/") ? absoluteUrl(article.image) : undefined
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: article.title,
        description: article.description,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
        inLanguage: "tr",
        articleSection: article.categoryName,
        keywords: article.subcategoryName,
        ...(image ? { image } : {}),
        mainEntityOfPage: url,
        author: { "@type": "Organization", name: "pinwego", url: "https://pinwego.com" },
        publisher: { "@type": "Organization", name: "pinwego", url: "https://pinwego.com" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana sayfa", item: "https://pinwego.com" },
          { "@type": "ListItem", position: 2, name: "Blog", item: "https://pinwego.com/blog" },
          { "@type": "ListItem", position: 3, name: article.categoryName, item: absoluteUrl(categoryPath(article.categorySlug)) },
          {
            "@type": "ListItem",
            position: 4,
            name: article.subcategoryName,
            item: absoluteUrl(subcategoryPath(article.categorySlug, article.subcategorySlug)),
          },
          { "@type": "ListItem", position: 5, name: article.title, item: url },
        ],
      },
    ],
  }
}
