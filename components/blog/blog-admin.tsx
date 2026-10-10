"use client"

import Link from "next/link"
import { useMemo, useState, type ReactNode } from "react"
import { useBlog } from "@/components/blog/blog-context"
import { fieldClass } from "@/components/directory/bits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ADMIN_PASSWORD } from "@/lib/auth-store"
import {
  articlePath,
  categoryProblem,
  postProblem,
  removeCategory,
  removePost,
  removeSubcategory,
  restorePost,
  saveCategory,
  savePost,
  saveSubcategory,
  subcategoryProblem,
  type BlogCategory,
  type BlogPost,
  type BlogSubcategory,
} from "@/lib/blog"
import { businesses } from "@/lib/catalog"
import { scaleImageFile } from "@/lib/image-scale"
import { seedSectors } from "@/lib/sectors"

type Panel = "yazilar" | "kategoriler" | "alt"

export function BlogAdmin() {
  const blog = useBlog()
  const [panel, setPanel] = useState<Panel>("yazilar")
  const [notice, setNotice] = useState("")
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<BlogPost | null>(null)
  const [category, setCategory] = useState<BlogCategory | null>(null)
  const [subcategory, setSubcategory] = useState<BlogSubcategory | null>(null)

  async function persist(next: typeof blog.state) {
    blog.replace(next)
    try {
      const response = await fetch("/api/blog", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: ADMIN_PASSWORD, state: next }),
      })
      setNotice(response.ok ? "Kaydedildi." : "Değişiklik ekranda duruyor, dosyaya yazılamadı.")
    } catch {
      setNotice("Değişiklik ekranda duruyor, dosyaya yazılamadı.")
    }
  }

  const articles = useMemo(() => {
    const needle = query.toLocaleLowerCase("tr-TR")
    return blog.document.articles.filter((article) => {
      if (!needle) return true
      return `${article.title} ${article.categoryName} ${article.subcategoryName}`.toLocaleLowerCase("tr-TR").includes(needle)
    })
  }, [blog.document.articles, query])

  return (
    <div className="mt-8">
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
        Yazı, kategori, alt kategori ve görsel buradan değişir. Adres sırası kategori, alt kategori, yazı şeklindedir.
        Görsel yüklenince uzun kenar 1600 piksele iner. Programatik sayfalar, bir şehir ve sektörde en az üç kayıt varsa
        katalogdan gelir; metnini değiştirebilir veya gizleyebilirsin.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ["yazilar", "Yazılar"],
            ["kategoriler", "Kategoriler"],
            ["alt", "Alt kategoriler"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPanel(id)}
            className={panel === id ? "rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground" : "rounded-full bg-secondary px-3 py-1.5 text-sm"}
          >
            {label}
          </button>
        ))}
      </div>
      {notice ? <p className="mt-4 text-sm text-primary">{notice}</p> : null}

      {panel === "yazilar" ? (
        <div className="mt-6">
          {editing ? (
            <PostForm
              post={editing}
              categories={blog.document.categories}
              subcategories={blog.document.subcategories}
              onCancel={() => setEditing(null)}
              onSave={async (post) => {
                const saved = savePost(blog.state, post, businesses, seedSectors)
                if (saved.error) {
                  setNotice(saved.error)
                  return
                }
                await persist(saved.state)
                setEditing(null)
              }}
            />
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Yazı veya şehir ara" className="h-11 sm:max-w-72" />
                <Button
                  type="button"
                  className="h-11 rounded-xl"
                  onClick={() =>
                    setEditing({
                      id: `custom-${crypto.randomUUID()}`,
                      slug: "",
                      categoryId: blog.document.categories[0]?.id ?? "",
                      subcategoryId: blog.document.subcategories[0]?.id ?? "",
                      title: "",
                      description: "",
                      body: "",
                      image: "",
                      imageAlt: "",
                      published: true,
                      kind: "custom",
                      publishedAt: new Date().toISOString().slice(0, 10),
                      updatedAt: new Date().toISOString().slice(0, 10),
                    })
                  }
                >
                  Yazı ekle
                </Button>
              </div>
              <div className="mt-4 grid gap-3">
                {articles.slice(0, 40).map((article) => (
                  <article key={article.id} className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      {article.image ? <img src={article.image} alt="" className="h-20 w-32 shrink-0 rounded-2xl object-cover" /> : null}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-primary">
                          {article.categoryName} · {article.subcategoryName} · {kindLabel(article.kind)}
                          {article.published ? "" : " · taslak"}
                        </p>
                        <h3 className="mt-1 font-heading text-xl">{article.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{articlePath(article)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => setEditing(article)}>
                          Düzenle
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 rounded-xl"
                          onClick={() => persist(removePost(blog.state, article.id))}
                        >
                          {article.kind === "custom" ? "Sil" : "Gizle"}
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {articles.length > 40 ? <p className="mt-3 text-sm text-muted-foreground">İlk 40 yazı listeleniyor. Aramayı daralt.</p> : null}
              {blog.hiddenArticles.length ? (
                <div className="mt-6">
                  <h3 className="font-heading text-xl">Gizlenen katalog yazıları</h3>
                  <div className="mt-3 grid gap-2">
                    {blog.hiddenArticles.map((article) => (
                      <div key={article.id} className="flex items-center justify-between gap-3 rounded-2xl bg-secondary px-3 py-2 text-sm">
                        <span>{article.title}</span>
                        <Button type="button" variant="outline" className="h-8 rounded-xl" onClick={() => persist(restorePost(blog.state, article.id))}>
                          Geri al
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {panel === "kategoriler" ? (
        <TaxonomyList
          items={blog.document.categories.map((item) => ({ id: item.id, title: item.name, note: item.description }))}
          editing={category}
          onCreate={() =>
            setCategory({ id: `custom-${crypto.randomUUID()}`, slug: "", name: "", description: "", order: blog.document.categories.length })
          }
          onEdit={(id) => setCategory(blog.document.categories.find((item) => item.id === id) ?? null)}
          onDelete={(id) => persist(removeCategory(blog.state, id))}
          form={
            category ? (
              <CategoryForm
                category={category}
                onCancel={() => setCategory(null)}
                onSave={async (next) => {
                  const error = categoryProblem(blog.document, { ...next, slug: next.slug || next.name })
                  if (error) {
                    setNotice(error)
                    return
                  }
                  const saved = saveCategory(blog.state, next, businesses, seedSectors)
                  if (saved.error) {
                    setNotice(saved.error)
                    return
                  }
                  await persist(saved.state)
                  setCategory(null)
                }}
              />
            ) : null
          }
        />
      ) : null}

      {panel === "alt" ? (
        <TaxonomyList
          items={blog.document.subcategories.map((item) => ({
            id: item.id,
            title: item.name,
            note: blog.document.categories.find((category) => category.id === item.categoryId)?.name ?? "",
          }))}
          editing={subcategory}
          onCreate={() =>
            setSubcategory({
              id: `custom-${crypto.randomUUID()}`,
              categoryId: blog.document.categories[0]?.id ?? "",
              slug: "",
              name: "",
              description: "",
              order: blog.document.subcategories.length,
            })
          }
          onEdit={(id) => setSubcategory(blog.document.subcategories.find((item) => item.id === id) ?? null)}
          onDelete={(id) => persist(removeSubcategory(blog.state, id))}
          form={
            subcategory ? (
              <SubcategoryForm
                subcategory={subcategory}
                categories={blog.document.categories}
                onCancel={() => setSubcategory(null)}
                onSave={async (next) => {
                  const error = subcategoryProblem(blog.document, next)
                  if (error) {
                    setNotice(error)
                    return
                  }
                  const saved = saveSubcategory(blog.state, next, businesses, seedSectors)
                  if (saved.error) {
                    setNotice(saved.error)
                    return
                  }
                  await persist(saved.state)
                  setSubcategory(null)
                }}
              />
            ) : null
          }
        />
      ) : null}
    </div>
  )
}

function PostForm({
  post,
  categories,
  subcategories,
  onSave,
  onCancel,
}: {
  post: BlogPost
  categories: BlogCategory[]
  subcategories: BlogSubcategory[]
  onSave: (post: BlogPost) => Promise<void>
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(post)
  const [scaleNote, setScaleNote] = useState("")
  const [busy, setBusy] = useState(false)
  const choices = subcategories.filter((item) => item.categoryId === draft.categoryId)
  const error = postProblem(
    {
      categories,
      subcategories,
      articles: [],
    },
    draft,
  )
  return (
    <form
      className="grid gap-4 rounded-3xl bg-card p-5 ring-1 ring-foreground/10"
      onSubmit={async (event) => {
        event.preventDefault()
        setBusy(true)
        await onSave(draft)
        setBusy(false)
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Başlık">
          <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="h-11" required />
        </Field>
        <Field label="Adres">
          <Input value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} placeholder="otomatik" className="h-11" />
        </Field>
        <Field label="Kategori">
          <select
            className={fieldClass}
            value={draft.categoryId}
            onChange={(event) => {
              const categoryId = event.target.value
              const nextSub = subcategories.find((item) => item.categoryId === categoryId)
              setDraft({ ...draft, categoryId, subcategoryId: nextSub?.id ?? "" })
            }}
          >
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Alt kategori">
          <select className={fieldClass} value={draft.subcategoryId} onChange={(event) => setDraft({ ...draft, subcategoryId: event.target.value })}>
            {choices.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Kısa açıklama">
        <Textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="min-h-20" />
      </Field>
      <Field label="Yazı">
        <Textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} className="min-h-48" />
      </Field>
      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
        {draft.image ? <img src={draft.image} alt={draft.imageAlt || ""} className="aspect-[16/10] w-full rounded-2xl object-cover" /> : <div className="grid aspect-[16/10] place-items-center rounded-2xl bg-secondary text-sm text-muted-foreground">Görsel yok</div>}
        <div className="grid content-start gap-3">
          <Field label="Görsel">
            <input
              type="file"
              accept="image/*"
              className="text-sm"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                event.target.value = ""
                if (!file) return
                try {
                  const scaled = await scaleImageFile(file)
                  setDraft((current) => ({ ...current, image: scaled.dataUrl }))
                  const same = scaled.sourceWidth === scaled.width && scaled.sourceHeight === scaled.height
                  setScaleNote(
                    same
                      ? `Görsel ${scaled.width}×${scaled.height}, ölçek gerekmedi.`
                      : `Görsel ${scaled.sourceWidth}×${scaled.sourceHeight} geldi, ${scaled.width}×${scaled.height} olarak kaydedildi.`,
                  )
                } catch (reason) {
                  setScaleNote(reason instanceof Error ? reason.message : "Görsel ölçeklenemedi.")
                }
              }}
            />
          </Field>
          <Field label="Görsel alt metni">
            <Input value={draft.imageAlt} onChange={(event) => setDraft({ ...draft, imageAlt: event.target.value })} className="h-11" />
          </Field>
          {scaleNote ? <p className="text-sm text-primary">{scaleNote}</p> : null}
        </div>
      </div>
      <Label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={draft.published} onChange={(event) => setDraft({ ...draft, published: event.target.checked })} />
        Yayında
      </Label>
      {draft.title && error ? <p className="text-sm text-destructive">{error}</p> : null}
      {draft.published && draft.slug ? (
        <p className="text-sm text-muted-foreground">
          Önizleme adresi kayıt sonrası{" "}
          <Link href={articlePath({ categorySlug: categories.find((item) => item.id === draft.categoryId)?.slug ?? "", subcategorySlug: choices.find((item) => item.id === draft.subcategoryId)?.slug ?? "", slug: draft.slug })} className="text-primary">
            açılır
          </Link>
          .
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" className="h-11 rounded-xl" disabled={busy}>
          Kaydet
        </Button>
        <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={onCancel}>
          Vazgeç
        </Button>
      </div>
    </form>
  )
}

function CategoryForm({
  category,
  onSave,
  onCancel,
}: {
  category: BlogCategory
  onSave: (category: BlogCategory) => Promise<void>
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(category)
  return (
    <form
      className="mt-4 grid gap-3 rounded-3xl bg-card p-5 ring-1 ring-foreground/10"
      onSubmit={async (event) => {
        event.preventDefault()
        await onSave(draft)
      }}
    >
      <Field label="Ad">
        <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="h-11" required />
      </Field>
      <Field label="Açıklama">
        <Textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" className="h-11 rounded-xl">Kaydet</Button>
        <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={onCancel}>Vazgeç</Button>
      </div>
    </form>
  )
}

function SubcategoryForm({
  subcategory,
  categories,
  onSave,
  onCancel,
}: {
  subcategory: BlogSubcategory
  categories: BlogCategory[]
  onSave: (subcategory: BlogSubcategory) => Promise<void>
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(subcategory)
  return (
    <form
      className="mt-4 grid gap-3 rounded-3xl bg-card p-5 ring-1 ring-foreground/10"
      onSubmit={async (event) => {
        event.preventDefault()
        await onSave(draft)
      }}
    >
      <Field label="Kategori">
        <select className={fieldClass} value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Ad">
        <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="h-11" required />
      </Field>
      <Field label="Açıklama">
        <Textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" className="h-11 rounded-xl">Kaydet</Button>
        <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={onCancel}>Vazgeç</Button>
      </div>
    </form>
  )
}

function TaxonomyList({
  items,
  editing,
  form,
  onCreate,
  onEdit,
  onDelete,
}: {
  items: { id: string; title: string; note: string }[]
  editing: unknown
  form: ReactNode
  onCreate: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="mt-6">
      <Button type="button" className="h-11 rounded-xl" onClick={onCreate}>Ekle</Button>
      {editing ? form : null}
      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.note}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => onEdit(item.id)}>Düzenle</Button>
              <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => onDelete(item.id)}>Sil</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Label className="grid gap-1.5 text-sm">
      {label}
      {children}
    </Label>
  )
}

function kindLabel(kind: BlogPost["kind"]) {
  if (kind === "programmatic") return "Programatik"
  if (kind === "custom") return "Yeni"
  return "Editoryal"
}
