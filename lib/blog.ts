import { slugifyKey } from "./format"
import type { Business } from "./types"

function blogSlug(value: string) {
  return slugifyKey(value.normalize("NFD").replace(/\p{M}/gu, ""))
}

export const BLOG_ORIGIN = "https://pinwego.com"
export const MIN_CLUSTER = 3

export type BlogKind = "editorial" | "programmatic" | "custom"

export type BlogCategory = {
  id: string
  slug: string
  name: string
  description: string
  order: number
}

export type BlogSubcategory = {
  id: string
  categoryId: string
  slug: string
  name: string
  description: string
  order: number
}

export type BlogLink = {
  href: string
  label: string
  note: string
}

export type BlogPost = {
  id: string
  slug: string
  categoryId: string
  subcategoryId: string
  title: string
  description: string
  body: string
  image: string
  imageAlt: string
  published: boolean
  kind: BlogKind
  publishedAt: string
  updatedAt: string
  related?: BlogLink[]
}

export type BlogArticle = BlogPost & {
  categorySlug: string
  categoryName: string
  subcategorySlug: string
  subcategoryName: string
}

export type BlogState = {
  categoryPatches: Record<string, Partial<BlogCategory>>
  subcategoryPatches: Record<string, Partial<BlogSubcategory>>
  postPatches: Record<string, Partial<BlogPost>>
  deletedCategoryIds: string[]
  deletedSubcategoryIds: string[]
  deletedPostIds: string[]
  customCategories: BlogCategory[]
  customSubcategories: BlogSubcategory[]
  customPosts: BlogPost[]
}

export type BlogDocument = {
  categories: BlogCategory[]
  subcategories: BlogSubcategory[]
  articles: BlogArticle[]
}

type SectorSeed = { id: string; label: string; photo: string }

const CITY_CATEGORY = "cat-sehir"
const GUIDE_CATEGORY = "cat-rehber"

export function emptyBlogState(): BlogState {
  return {
    categoryPatches: {},
    subcategoryPatches: {},
    postPatches: {},
    deletedCategoryIds: [],
    deletedSubcategoryIds: [],
    deletedPostIds: [],
    customCategories: [],
    customSubcategories: [],
    customPosts: [],
  }
}

export function normalizeBlogState(value: unknown): BlogState {
  const raw = value && typeof value === "object" ? (value as Partial<BlogState>) : {}
  return {
    categoryPatches: record(raw.categoryPatches),
    subcategoryPatches: record(raw.subcategoryPatches),
    postPatches: record(raw.postPatches),
    deletedCategoryIds: strings(raw.deletedCategoryIds),
    deletedSubcategoryIds: strings(raw.deletedSubcategoryIds),
    deletedPostIds: strings(raw.deletedPostIds),
    customCategories: Array.isArray(raw.customCategories) ? raw.customCategories.filter(isCategory) : [],
    customSubcategories: Array.isArray(raw.customSubcategories) ? raw.customSubcategories.filter(isSubcategory) : [],
    customPosts: Array.isArray(raw.customPosts) ? raw.customPosts.filter(isPost) : [],
  }
}

export function articlePath(article: Pick<BlogArticle, "categorySlug" | "subcategorySlug" | "slug">) {
  return `/blog/${article.categorySlug}/${article.subcategorySlug}/${article.slug}`
}

export function subcategoryPath(categorySlug: string, subcategorySlug: string) {
  return `/blog/${categorySlug}/${subcategorySlug}`
}

export function categoryPath(categorySlug: string) {
  return `/blog/${categorySlug}`
}

export function absoluteUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path
  return `${BLOG_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`
}

export function formatBlogDate(value: string) {
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
}

export function contentBlocks(body: string) {
  const blocks: Array<{ type: "p"; text: string } | { type: "ul"; items: string[] }> = []
  for (const chunk of body.trim().split(/\n{2,}/)) {
    const lines = chunk
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
    const listAt = lines.findIndex((line) => line.startsWith("- "))
    const list = listAt >= 0 ? lines.slice(listAt) : []
    if (list.length && list.every((line) => line.startsWith("- "))) {
      if (listAt > 0) blocks.push({ type: "p", text: lines.slice(0, listAt).join(" ") })
      blocks.push({ type: "ul", items: list.map((line) => line.slice(2)) })
      continue
    }
    if (lines.length) blocks.push({ type: "p", text: lines.join(" ") })
  }
  return blocks
}

export function assembleBlog(state: BlogState, businesses: Business[], sectors: SectorSeed[]): BlogDocument {
  const categories = merge(seedCategories(), state.customCategories, state.categoryPatches, state.deletedCategoryIds)
  const subcategories = merge(
    [...seedSubcategories(), ...citySubcategories(businesses, sectors)],
    state.customSubcategories,
    state.subcategoryPatches,
    state.deletedSubcategoryIds,
  ).filter((item) => categories.some((category) => category.id === item.categoryId))
  const posts = merge(
    [...editorialPosts(), ...programmaticPosts(businesses, sectors)],
    state.customPosts,
    state.postPatches,
    state.deletedPostIds,
  )
  const articles = posts
    .map((post) => attach(post, categories, subcategories))
    .filter((post): post is BlogArticle => Boolean(post))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title, "tr"))
  return {
    categories: categories.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "tr")),
    subcategories: subcategories.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "tr")),
    articles,
  }
}

export function publicArticles(document: BlogDocument) {
  return document.articles.filter((article) => article.published)
}

export function stripArticles(document: BlogDocument, limit = 12) {
  const published = publicArticles(document).filter((article) => article.image)
  const editorial = published.filter((article) => article.kind !== "programmatic")
  const programmatic = published.filter((article) => article.kind === "programmatic")
  const lead: BlogArticle[] = []
  const seen = new Set<string>()
  for (const article of programmatic) {
    if (seen.has(article.subcategoryId)) continue
    seen.add(article.subcategoryId)
    lead.push(article)
  }
  const rest = programmatic.filter((article) => !lead.includes(article))
  return [...editorial, ...lead, ...rest].slice(0, limit)
}

export function findCategory(document: BlogDocument, slug: string) {
  return document.categories.find((category) => category.slug === slug) ?? null
}

export function findSubcategory(document: BlogDocument, categorySlug: string, subcategorySlug: string) {
  const category = findCategory(document, categorySlug)
  if (!category) return null
  const subcategory = document.subcategories.find(
    (item) => item.categoryId === category.id && item.slug === subcategorySlug,
  )
  return subcategory ? { category, subcategory } : null
}

export function findArticle(document: BlogDocument, categorySlug: string, subcategorySlug: string, slug: string) {
  return (
    publicArticles(document).find(
      (article) =>
        article.categorySlug === categorySlug && article.subcategorySlug === subcategorySlug && article.slug === slug,
    ) ?? null
  )
}

export function baseArticles(businesses: Business[], sectors: SectorSeed[]) {
  return assembleBlog(emptyBlogState(), businesses, sectors).articles
}

export function postProblem(document: BlogDocument, post: BlogPost) {
  if (!post.title.trim()) return "Başlık gerekli."
  if (!post.description.trim()) return "Kısa açıklama gerekli. Bu metin Google başlığının altında durur."
  if (!post.body.trim()) return "Yazı gerekli."
  const category = document.categories.find((item) => item.id === post.categoryId)
  if (!category) return "Kategori seç."
  const subcategory = document.subcategories.find((item) => item.id === post.subcategoryId)
  if (!subcategory || subcategory.categoryId !== category.id) return "Alt kategori bu kategoriye bağlı değil."
  const slug = blogSlug(post.slug || post.title)
  if (!slug) return "Adres gerekli."
  if (post.published && !post.image.trim()) return "Yayın için görsel gerekli."
  if (post.published && !post.imageAlt.trim()) return "Görselin ne olduğunu anlatan alt metin gerekli."
  const clash = document.articles.some(
    (article) => article.id !== post.id && article.subcategoryId === post.subcategoryId && article.slug === slug,
  )
  if (clash) return "Bu alt kategoride aynı adres kullanılıyor."
  return null
}

export function categoryProblem(document: BlogDocument, category: BlogCategory) {
  if (!category.name.trim()) return "Kategori adı gerekli."
  const slug = blogSlug(category.slug || category.name)
  if (!slug) return "Adres gerekli."
  if (document.categories.some((item) => item.id !== category.id && item.slug === slug)) return "Bu kategori adresi kullanılıyor."
  return null
}

export function subcategoryProblem(document: BlogDocument, subcategory: BlogSubcategory) {
  if (!subcategory.name.trim()) return "Alt kategori adı gerekli."
  if (!document.categories.some((item) => item.id === subcategory.categoryId)) return "Kategori seç."
  const slug = blogSlug(subcategory.slug || subcategory.name)
  if (!slug) return "Adres gerekli."
  const clash = document.subcategories.some(
    (item) => item.id !== subcategory.id && item.categoryId === subcategory.categoryId && item.slug === slug,
  )
  if (clash) return "Bu kategoride aynı alt kategori adresi var."
  return null
}

export function savePost(state: BlogState, post: BlogPost, businesses: Business[], sectors: SectorSeed[]) {
  const draft = { ...post, slug: blogSlug(post.slug || post.title), updatedAt: today() }
  const document = assembleBlog(state, businesses, sectors)
  const error = postProblem(document, draft)
  if (error) return { state, error }
  if (isCustom(state, draft.id) || draft.kind === "custom") {
    const customPosts = state.customPosts.some((item) => item.id === draft.id)
      ? state.customPosts.map((item) => (item.id === draft.id ? { ...item, ...draft, kind: "custom" as const } : item))
      : [...state.customPosts, { ...draft, kind: "custom" as const }]
    return { state: { ...state, customPosts }, error: null }
  }
  return {
    state: {
      ...state,
      postPatches: { ...state.postPatches, [draft.id]: draft },
      deletedPostIds: state.deletedPostIds.filter((id) => id !== draft.id),
    },
    error: null,
  }
}

export function removePost(state: BlogState, id: string) {
  if (state.customPosts.some((item) => item.id === id)) {
    return { ...state, customPosts: state.customPosts.filter((item) => item.id !== id) }
  }
  return {
    ...state,
    deletedPostIds: state.deletedPostIds.includes(id) ? state.deletedPostIds : [...state.deletedPostIds, id],
  }
}

export function restorePost(state: BlogState, id: string) {
  return { ...state, deletedPostIds: state.deletedPostIds.filter((item) => item !== id) }
}

export function saveCategory(state: BlogState, category: BlogCategory, businesses: Business[], sectors: SectorSeed[]) {
  const draft = { ...category, slug: blogSlug(category.slug || category.name) }
  const error = categoryProblem(assembleBlog(state, businesses, sectors), draft)
  if (error) return { state, error }
  if (state.customCategories.some((item) => item.id === draft.id) || draft.id.startsWith("custom-")) {
    const customCategories = state.customCategories.some((item) => item.id === draft.id)
      ? state.customCategories.map((item) => (item.id === draft.id ? draft : item))
      : [...state.customCategories, draft]
    return { state: { ...state, customCategories }, error: null }
  }
  return {
    state: {
      ...state,
      categoryPatches: { ...state.categoryPatches, [draft.id]: draft },
      deletedCategoryIds: state.deletedCategoryIds.filter((id) => id !== draft.id),
    },
    error: null,
  }
}

export function removeCategory(state: BlogState, id: string) {
  if (state.customCategories.some((item) => item.id === id)) {
    return {
      ...state,
      customCategories: state.customCategories.filter((item) => item.id !== id),
      customSubcategories: state.customSubcategories.filter((item) => item.categoryId !== id),
      customPosts: state.customPosts.filter((item) => item.categoryId !== id),
    }
  }
  return {
    ...state,
    deletedCategoryIds: state.deletedCategoryIds.includes(id) ? state.deletedCategoryIds : [...state.deletedCategoryIds, id],
  }
}

export function saveSubcategory(
  state: BlogState,
  subcategory: BlogSubcategory,
  businesses: Business[],
  sectors: SectorSeed[],
) {
  const draft = { ...subcategory, slug: blogSlug(subcategory.slug || subcategory.name) }
  const error = subcategoryProblem(assembleBlog(state, businesses, sectors), draft)
  if (error) return { state, error }
  if (state.customSubcategories.some((item) => item.id === draft.id) || draft.id.startsWith("custom-")) {
    const customSubcategories = state.customSubcategories.some((item) => item.id === draft.id)
      ? state.customSubcategories.map((item) => (item.id === draft.id ? draft : item))
      : [...state.customSubcategories, draft]
    return { state: { ...state, customSubcategories }, error: null }
  }
  return {
    state: {
      ...state,
      subcategoryPatches: { ...state.subcategoryPatches, [draft.id]: draft },
      deletedSubcategoryIds: state.deletedSubcategoryIds.filter((id) => id !== draft.id),
    },
    error: null,
  }
}

export function removeSubcategory(state: BlogState, id: string) {
  if (state.customSubcategories.some((item) => item.id === id)) {
    return {
      ...state,
      customSubcategories: state.customSubcategories.filter((item) => item.id !== id),
      customPosts: state.customPosts.filter((item) => item.subcategoryId !== id),
    }
  }
  return {
    ...state,
    deletedSubcategoryIds: state.deletedSubcategoryIds.includes(id)
      ? state.deletedSubcategoryIds
      : [...state.deletedSubcategoryIds, id],
  }
}

export function seedCategories(): BlogCategory[] {
  return [
    {
      id: GUIDE_CATEGORY,
      slug: "rehber",
      name: "Rehber",
      description: "Seçim ve kayıt okuma notları. Editör yazar, yönetim metni ve görseli değiştirir.",
      order: 0,
    },
    {
      id: CITY_CATEGORY,
      slug: "sehir-rehberleri",
      name: "Şehir rehberleri",
      description: "Aynı şehir ve sektörde en az üç kayıt varsa sayfa katalogdan üretilir.",
      order: 1,
    },
  ]
}

export function seedSubcategories(): BlogSubcategory[] {
  return [
    {
      id: "sub-secim",
      categoryId: GUIDE_CATEGORY,
      slug: "secim",
      name: "Seçim notları",
      description: "Bir işletmeyi aramadan önce bakılacak somut ayrımlar.",
      order: 0,
    },
    {
      id: "sub-kayit",
      categoryId: GUIDE_CATEGORY,
      slug: "kayit-okuma",
      name: "Kayıt okuma",
      description: "Katalog kaydındaki adres, saat ve kaynak bilgisini okuma.",
      order: 1,
    },
  ]
}

export function editorialPosts(): BlogPost[] {
  return [
    {
      id: "edit-kahvalti",
      slug: "kahvalti-yeri-nasil-secilir",
      categoryId: GUIDE_CATEGORY,
      subcategoryId: "sub-secim",
      title: "Kahvaltı yeri seçerken bakılacak beş şey",
      description: "Saat, masa düzeni, çocukla geliş, fiyat düzeyi ve son yorum: kahvaltı seçimini aynı kartta toplama.",
      image: "/photos/breakfast.jpg",
      imageAlt: "Kalabalık bir kahvaltı masasında çay, peynir ve yumurta",
      published: true,
      kind: "editorial",
      publishedAt: "2026-09-12",
      updatedAt: "2026-09-12",
      body: [
        "Kahvaltı araması çoğu zaman semt ve saatle başlar. Öğlene kadar açık olan yerle akşam da süren kafe aynı listeye düşer; ayrım, kayıttaki çalışma saati ve alt türdedir.",
        "Beş soru seçimi kısaltır:\n- Öğleden sonra da kahvaltı var mı, yoksa mutfak öğlene kapanıyor mu?\n- Çocukla oturulacak bir masa notu var mı?\n- Fiyat düzeyi bir, iki ya da üç mü?\n- Son yorumlar servis süresinden mi, yoksa lezzetten mi söz ediyor?\n- Rezervasyon mu isteniyor, yoksa kapıdan mı oturuluyor?",
        "pinwego kartı bu beş bilgiyi yan yana koyar. Yazı, o kartı okumadan önce neye bakılacağını sabitler. Şehir rehberindeki kahvaltı sayfaları ise aynı soruları o şehirdeki kayıtlara uygular.",
      ].join("\n\n"),
    },
    {
      id: "edit-usta",
      slug: "usta-teklifinde-ne-olmali",
      categoryId: GUIDE_CATEGORY,
      subcategoryId: "sub-secim",
      title: "Usta çağırmadan önce teklifte ne olmalı",
      description: "Boya, tesisat ve elektrik teklifinde işin sınırı, malzeme ve dönüş süresi yazılmadan fiyat karşılaştırılmaz.",
      image: "/photos/plumber.jpg",
      imageAlt: "Tesisat çalışması için açılmış bir ev içi",
      published: true,
      kind: "editorial",
      publishedAt: "2026-09-20",
      updatedAt: "2026-09-20",
      body: [
        "Usta aramasında en düşük fiyat, işin sınırı yazılmamışsa bir teklif değildir. Boya iki odayı da, tüm daireyi de anlatabilir. Tesisat keşif ile parça değişimini aynı cümlede toplar.",
        "Teklifte üç satır yeter:\n- Hangi oda, hangi iş, neyin dışında kaldığı\n- Malzeme usta tarafından mı geliyor\n- Keşif ve iş için ayrı ayrı dönüş süresi",
        "Katalogdaki yanıt süresi ve fiyat aralığı bu üç satırın yerine geçmez. Talebi yazarken aynı üç satırı kullanmak, gelen kayıtları aynı ölçekte okumayı sağlar.",
      ].join("\n\n"),
    },
    {
      id: "edit-zonguldak",
      slug: "zonguldak-isletme-kaydi-nasil-okunur",
      categoryId: GUIDE_CATEGORY,
      subcategoryId: "sub-kayit",
      title: "Zonguldak işletme kaydı nasıl okunur",
      description: "Ereğli, Kozlu, Merkez ve ilçe adları kaydın neresinde durur; puan boşsa bu ne anlama gelir.",
      image: "/photos/lokanta.jpg",
      imageAlt: "Lokanta masaları ve servis alanı",
      published: true,
      kind: "editorial",
      publishedAt: "2026-10-02",
      updatedAt: "2026-10-02",
      body: [
        "Zonguldak kayıtlarının bir kısmı açık harita bilgisinden gelir. Ad, ilçe, adres ve çalışma saati vardır. Puan ve yorum kopyalanmamışsa kartta sıfır görünür; bu, işletmenin puansız olduğu anlamına gelmez, kaydın o alanı taşımadığı anlamına gelir.",
        "İlçe adı seçimi belirler. Karadeniz Ereğli, Kozlu, Merkez, Çaycuma ve Alaplı aynı ilin içinde ayrı listelerdir. Sokak adresindeki bir ilçe sözü, işletmenin o ilçede olduğu anlamına gelmez.",
        "Şehir rehberindeki Zonguldak sayfaları, aynı ilçede kümelenen sektörleri ayrıca açar. Üçten az kayıt olan sektör için ayrı sayfa üretilmez; ince sayfa arama sonucunda gürültü olur.",
      ].join("\n\n"),
    },
  ]
}

export function programmaticPosts(businesses: Business[], sectors: SectorSeed[]): BlogPost[] {
  const posts: BlogPost[] = []
  const usedSlugs = new Set<string>()
  for (const sector of sectors) {
    const groups = new Map<string, Business[]>()
    for (const business of businesses) {
      if (business.category !== sector.id || !business.city) continue
      const list = groups.get(business.city) ?? []
      list.push(business)
      groups.set(business.city, list)
    }
    for (const [city, group] of groups) {
      if (group.length < MIN_CLUSTER) continue
      const ranked = [...group].sort(
        (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount || a.name.localeCompare(b.name, "tr"),
      )
      const districts = [...new Set(ranked.map((item) => item.district).filter(Boolean))].slice(0, 6)
      const citySlug = blogSlug(city)
      const sectorSlug = blogSlug(sector.label)
      const subcategoryId = `sub-city-${citySlug}`
      let slug = `${citySlug}-${sectorSlug}`
      if (usedSlugs.has(`${subcategoryId}:${slug}`)) slug = `${slug}-${sector.id}`
      usedSlugs.add(`${subcategoryId}:${slug}`)
      posts.push({
        id: `prog-${citySlug}-${sector.id}`,
        slug,
        categoryId: CITY_CATEGORY,
        subcategoryId: `sub-city-${citySlug}`,
        title: `${city} ${sector.label.toLocaleLowerCase("tr-TR")} rehberi`,
        description: `${city} içinde ${sector.label.toLocaleLowerCase("tr-TR")} için katalogda ${group.length} kayıt var. İlçe, puan ve kısa özete göre sıralanır.`,
        image: ranked.find((item) => item.photo)?.photo || sector.photo,
        imageAlt: `${city} ${sector.label.toLocaleLowerCase("tr-TR")} rehberi için katalog görseli`,
        published: true,
        kind: "programmatic",
        publishedAt: "2026-10-10",
        updatedAt: "2026-10-10",
        related: ranked.slice(0, 6).map((item) => ({
          href: `/isletme/${item.slug}`,
          label: item.name,
          note: [item.district, item.rating ? `${item.rating.toFixed(1)} puan` : ""].filter(Boolean).join(" · "),
        })),
        body: [
          `${city} içinde ${sector.label.toLocaleLowerCase("tr-TR")} arayan biri pinwego kataloğunda ${group.length} kayıt bulur. Sayfa bu kayıtlardan üretilir: ad, ilçe ve özet metin işletmenin kendi kartından gelir.`,
          districts.length ? `Kayıtların geçtiği ilçeler: ${districts.join(", ")}.` : "",
          ranked
            .slice(0, 5)
            .map((item) => `- ${item.name}${item.district ? `, ${item.district}` : ""}: ${item.summary}`)
            .join("\n"),
          "Karttaki puan, fiyat düzeyi ve randevu bilgisi işletme sayfasında durur. Bu metin, görsel ve yayın durumu yönetim panelinden değiştirilebilir. Üç kayıttan az sektör için ayrı sayfa açılmaz.",
        ]
          .filter(Boolean)
          .join("\n\n"),
      })
    }
  }
  return posts
}

function citySubcategories(businesses: Business[], sectors: SectorSeed[]): BlogSubcategory[] {
  const posts = programmaticPosts(businesses, sectors)
  const cities = new Map<string, number>()
  for (const post of posts) {
    const citySlug = post.subcategoryId.replace("sub-city-", "")
    cities.set(citySlug, (cities.get(citySlug) ?? 0) + 1)
  }
  return [...cities.entries()].map(([citySlug, count], index) => {
    const sample = posts.find((post) => post.subcategoryId === `sub-city-${citySlug}`)
    const name = sample ? sample.title.split(" ")[0] : citySlug
    const cityName = businesses.find((item) => blogSlug(item.city) === citySlug)?.city ?? name
    return {
      id: `sub-city-${citySlug}`,
      categoryId: CITY_CATEGORY,
      slug: citySlug,
      name: cityName,
      description: `${cityName} için en az üç kaydı olan ${count} sektör sayfası.`,
      order: index,
    }
  })
}

function attach(post: BlogPost, categories: BlogCategory[], subcategories: BlogSubcategory[]): BlogArticle | null {
  const category = categories.find((item) => item.id === post.categoryId)
  const subcategory = subcategories.find((item) => item.id === post.subcategoryId && item.categoryId === post.categoryId)
  if (!category || !subcategory) return null
  return {
    ...post,
    categorySlug: category.slug,
    categoryName: category.name,
    subcategorySlug: subcategory.slug,
    subcategoryName: subcategory.name,
  }
}

function merge<T extends { id: string }>(
  base: T[],
  custom: T[],
  patches: Record<string, Partial<T>>,
  deleted: string[],
) {
  const map = new Map<string, T>()
  for (const item of base) map.set(item.id, { ...item, ...patches[item.id] })
  for (const item of custom) map.set(item.id, { ...item, ...patches[item.id] })
  return [...map.values()].filter((item) => !deleted.includes(item.id))
}

function isCustom(state: BlogState, id: string) {
  return state.customPosts.some((item) => item.id === id) || id.startsWith("custom-")
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function record<T>(value: unknown): Record<string, T> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, T>
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function isCategory(value: unknown): value is BlogCategory {
  if (!value || typeof value !== "object") return false
  const item = value as BlogCategory
  return typeof item.id === "string" && typeof item.name === "string" && typeof item.slug === "string"
}

function isSubcategory(value: unknown): value is BlogSubcategory {
  if (!value || typeof value !== "object") return false
  const item = value as BlogSubcategory
  return typeof item.id === "string" && typeof item.categoryId === "string" && typeof item.name === "string"
}

function isPost(value: unknown): value is BlogPost {
  if (!value || typeof value !== "object") return false
  const item = value as BlogPost
  return typeof item.id === "string" && typeof item.title === "string" && typeof item.categoryId === "string"
}
