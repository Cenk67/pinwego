import { adminSessionOpen, readAdminCookie } from "@/lib/admin-gate"
import { accountStore } from "@/lib/account-kv"
import { jsonReply, readJson } from "@/lib/account-route"
import {
  bumpVersion,
  footerPages,
  parseBlocks,
  publishedFaqs,
  publishedPages,
  seedFaqs,
  seedPages,
  type Consent,
  type FaqItem,
  type PageGroup,
  type PageStatus,
  type PageVersion,
  type SitePage,
} from "@/lib/site-pages"

export const pagesKey = "pages:v1"
export const consentsKey = "consents:v1"
const versionCap = 30

export type PageBook = { pages: SitePage[]; faqs: FaqItem[]; versions: PageVersion[] }

function seedBook(): PageBook {
  return { pages: seedPages, faqs: seedFaqs, versions: [] }
}

function asStatus(value: unknown): PageStatus | null {
  return value === "taslak" || value === "incelemede" || value === "yayinda" || value === "arsiv" ? value : null
}

function asPage(value: unknown): SitePage | null {
  if (!value || typeof value !== "object") return null
  const row = value as Partial<SitePage>
  if (typeof row.id !== "string" || typeof row.slug !== "string" || typeof row.source !== "string" || typeof row.title !== "string") return null
  const blocks = parseBlocks(row.source)
  if (!blocks) return null
  const status = asStatus(row.status)
  if (!status) return null
  return {
    id: row.id,
    slug: row.slug,
    title: row.title.slice(0, 120),
    summary: typeof row.summary === "string" ? row.summary.slice(0, 240) : "",
    source: row.source,
    blocks,
    seoTitle: typeof row.seoTitle === "string" ? row.seoTitle.slice(0, 160) : row.title.slice(0, 160),
    seoDescription: typeof row.seoDescription === "string" ? row.seoDescription.slice(0, 240) : "",
    canonical: typeof row.canonical === "string" ? row.canonical.slice(0, 200) : `https://pinwego.com/${row.slug}`,
    status,
    publishedAt: typeof row.publishedAt === "string" ? row.publishedAt.slice(0, 20) : "",
    effectiveAt: typeof row.effectiveAt === "string" ? row.effectiveAt.slice(0, 20) : "",
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt.slice(0, 20) : "",
    version: typeof row.version === "string" ? row.version.slice(0, 12) : "1.0",
    updatedBy: typeof row.updatedBy === "string" ? row.updatedBy.slice(0, 40) : "yonetici",
    footer: row.footer === true,
    group: row.group === "hukuk" ? "hukuk" : "kurumsal",
    order: typeof row.order === "number" ? row.order : 100,
    legal: row.legal === true,
    index: row.index !== false,
    related: Array.isArray(row.related) ? row.related.filter((item) => typeof item === "string").slice(0, 8) : [],
  }
}

function asFaq(value: unknown): FaqItem | null {
  if (!value || typeof value !== "object") return null
  const row = value as Partial<FaqItem>
  const status = asStatus(row.status)
  if (!status || typeof row.id !== "string" || typeof row.question !== "string" || typeof row.answer !== "string") return null
  return {
    id: row.id.slice(0, 40),
    category: typeof row.category === "string" ? row.category.slice(0, 60) : "Genel",
    question: row.question.slice(0, 180),
    answer: row.answer.slice(0, 800),
    order: typeof row.order === "number" ? row.order : 100,
    status,
    related: typeof row.related === "string" ? row.related.slice(0, 160) : "",
  }
}

export function parseBook(raw: string | null): PageBook | null {
  if (raw === null) return seedBook()
  try {
    const data = JSON.parse(raw) as { pages?: unknown; faqs?: unknown; versions?: unknown }
    if (!data || typeof data !== "object" || !Array.isArray(data.pages)) return null
    const pages = data.pages.map(asPage).filter((item): item is SitePage => item !== null)
    if (pages.length !== data.pages.length) return null
    const faqs = Array.isArray(data.faqs) ? data.faqs.map(asFaq).filter((item): item is FaqItem => item !== null) : seedFaqs
    const versions = Array.isArray(data.versions)
      ? data.versions.filter((item): item is PageVersion => {
          if (!item || typeof item !== "object") return false
          const row = item as Partial<PageVersion>
          return typeof row.pageId === "string" && typeof row.version === "string" && typeof row.source === "string"
        }).slice(-200)
      : []
    return { pages, faqs, versions }
  } catch {
    return null
  }
}

async function readBook(store: NonNullable<Awaited<ReturnType<typeof accountStore>>>) {
  return parseBook(await store.get(pagesKey))
}

function publicPage(page: SitePage): Omit<SitePage, "source"> {
  const visible = { ...page }
  delete (visible as { source?: string }).source
  return visible
}

export async function pageBySlug(slug: string) {
  const store = await accountStore()
  const book = store ? await readBook(store) : seedBook()
  if (!book) return null
  return publishedPages(book.pages).find((item) => item.slug === slug) ?? null
}

export async function publicFaqs() {
  const store = await accountStore()
  const book = store ? await readBook(store) : seedBook()
  if (!book) return publishedFaqs(seedFaqs)
  return publishedFaqs(book.faqs)
}

export async function sayfaGetFlow(request: Request) {
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  const book = await readBook(store)
  if (!book) return jsonReply({ ok: false, reason: "bozuk" }, 500)
  const admin = await adminSessionOpen(store, readAdminCookie(request.headers.get("cookie")))
  const slug = new URL(request.url).searchParams.get("slug") ?? ""
  if (admin) {
    const consents = parseConsents(await store.get(consentsKey)).slice(-40).reverse()
    return jsonReply({ ok: true, pages: book.pages, faqs: book.faqs, versions: book.versions.slice(-80), consents })
  }
  if (slug) {
    const page = publishedPages(book.pages).find((item) => item.slug === slug)
    if (!page) return jsonReply({ ok: false, reason: "yok" }, 404)
    return jsonReply({ ok: true, page: publicPage(page), faqs: slug === "sss" ? publishedFaqs(book.faqs) : [] })
  }
  return jsonReply({
    ok: true,
    links: footerPages(book.pages).map((item) => ({ slug: item.slug, title: item.title, group: item.group satisfies PageGroup, order: item.order })),
  })
}

function snapshot(page: SitePage, at: string): PageVersion {
  return { pageId: page.id, version: page.version, at, by: page.updatedBy, title: page.title, source: page.source, status: page.status, effectiveAt: page.effectiveAt }
}

function keepVersions(versions: PageVersion[], consents: Consent[]) {
  const pinned = new Set(consents.map((item) => `${item.pageId}@${item.version}`))
  const byPage = new Map<string, PageVersion[]>()
  for (const item of versions) {
    const list = byPage.get(item.pageId) ?? []
    list.push(item)
    byPage.set(item.pageId, list)
  }
  const kept: PageVersion[] = []
  for (const [pageId, list] of byPage) {
    const must = list.filter((item) => pinned.has(`${pageId}@${item.version}`))
    const rest = list.filter((item) => !pinned.has(`${pageId}@${item.version}`))
    const room = Math.max(0, versionCap - must.length)
    kept.push(...must, ...rest.slice(-room))
  }
  return kept
}

export async function sayfaPostFlow(request: Request, now = Date.now()) {
  const body = await readJson(request, 24000)
  if (!body || typeof body.op !== "string") return jsonReply({ ok: false, reason: "invalid" }, 400)
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  if (!(await adminSessionOpen(store, readAdminCookie(request.headers.get("cookie"))))) return jsonReply({ ok: false, reason: "yetki" }, 401)
  const book = await readBook(store)
  if (!book) return jsonReply({ ok: false, reason: "bozuk" }, 500)
  const at = new Date(now).toISOString().slice(0, 10)
  if (body.op === "save") {
    const current = book.pages.find((item) => item.id === body.id)
    const source = typeof body.source === "string" ? body.source : ""
    const blocks = parseBlocks(source)
    const status = asStatus(body.status)
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : ""
    if (!current || !blocks || !status || title.length < 2) return jsonReply({ ok: false, reason: "invalid" })
    const next: SitePage = {
      ...current,
      title,
      summary: typeof body.summary === "string" ? body.summary.trim().slice(0, 240) : current.summary,
      source,
      blocks,
      seoTitle: typeof body.seoTitle === "string" && body.seoTitle.trim() ? body.seoTitle.trim().slice(0, 160) : `${title} | Pinwego`,
      seoDescription: typeof body.seoDescription === "string" ? body.seoDescription.trim().slice(0, 240) : current.seoDescription,
      status,
      effectiveAt: typeof body.effectiveAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.effectiveAt) ? body.effectiveAt : current.effectiveAt,
      publishedAt: status === "yayinda" ? current.publishedAt || at : current.publishedAt,
      footer: body.footer === true,
      order: typeof body.order === "number" ? Math.max(0, Math.min(999, body.order)) : current.order,
      index: body.index !== false,
      updatedAt: at,
      updatedBy: "yonetici",
      version: source !== current.source || title !== current.title || status !== current.status ? bumpVersion(current.version) : current.version,
    }
    const versions = next.version === current.version ? book.versions : keepVersions([...book.versions, snapshot(current, at)], parseConsents(await store.get(consentsKey)))
    const pages = book.pages.map((item) => (item.id === current.id ? next : item))
    await store.put(pagesKey, JSON.stringify({ pages, faqs: book.faqs, versions }))
    return jsonReply({ ok: true, page: next })
  }
  if (body.op === "restore") {
    const pageId = typeof body.id === "string" ? body.id : ""
    const version = typeof body.version === "string" ? body.version : ""
    const current = book.pages.find((item) => item.id === pageId)
    const prior = book.versions.find((item) => item.pageId === pageId && item.version === version)
    const blocks = prior ? parseBlocks(prior.source) : null
    if (!current || !prior || !blocks) return jsonReply({ ok: false, reason: "yok" }, 404)
    const next: SitePage = { ...current, title: prior.title, source: prior.source, blocks, status: prior.status, effectiveAt: prior.effectiveAt, version: bumpVersion(current.version), updatedAt: at, updatedBy: "yonetici" }
    const versions = keepVersions([...book.versions, snapshot(current, at)], parseConsents(await store.get(consentsKey)))
    await store.put(pagesKey, JSON.stringify({ pages: book.pages.map((item) => (item.id === current.id ? next : item)), faqs: book.faqs, versions }))
    return jsonReply({ ok: true, page: next })
  }
  if (body.op === "faq") {
    const status = asStatus(body.status)
    const question = typeof body.question === "string" ? body.question.trim().slice(0, 180) : ""
    const answer = typeof body.answer === "string" ? body.answer.trim().slice(0, 800) : ""
    if (!status || question.length < 4 || answer.length < 4) return jsonReply({ ok: false, reason: "invalid" })
    const id = typeof body.id === "string" && body.id.trim() ? body.id.trim().slice(0, 40) : `sss-${now.toString(36)}`
    const item: FaqItem = {
      id,
      category: typeof body.category === "string" && body.category.trim() ? body.category.trim().slice(0, 60) : "Genel",
      question,
      answer,
      order: typeof body.order === "number" ? body.order : 100,
      status,
      related: typeof body.related === "string" ? body.related.trim().slice(0, 160) : "",
    }
    const faqs = [item, ...book.faqs.filter((row) => row.id !== id)].slice(0, 80)
    await store.put(pagesKey, JSON.stringify({ ...book, faqs }))
    return jsonReply({ ok: true, faq: item })
  }
  return jsonReply({ ok: false, reason: "invalid" }, 400)
}

function parseConsents(raw: string | null): Consent[] {
  if (!raw) return []
  try {
    const data = JSON.parse(raw) as { items?: unknown }
    if (!Array.isArray(data.items)) return []
    return data.items.filter((item): item is Consent => {
      if (!item || typeof item !== "object") return false
      const row = item as Partial<Consent>
      return typeof row.accountId === "string" && typeof row.pageId === "string" && typeof row.version === "string" && typeof row.kind === "string"
    })
  } catch {
    return []
  }
}

export async function noteConsents(store: NonNullable<Awaited<ReturnType<typeof accountStore>>>, accountId: string, marketing: boolean, now = Date.now()) {
  const book = await readBook(store)
  if (!book) return
  const at = new Date(now).toISOString()
  const membership = book.pages.find((item) => item.id === "uyelik-sozlesmesi")
  const terms = book.pages.find((item) => item.id === "kullanim-kosullari")
  const promo = book.pages.find((item) => item.id === "pazarlama-politikasi")
  const rows: Consent[] = []
  for (const page of [membership, terms]) {
    if (!page) continue
    rows.push({ id: `${accountId}:${page.id}:${page.version}:uyelik`, accountId, pageId: page.id, version: page.version, kind: "uyelik", accepted: true, at, context: "kayit" })
  }
  if (promo) rows.push({ id: `${accountId}:${promo.id}:${promo.version}:pazarlama`, accountId, pageId: promo.id, version: promo.version, kind: "pazarlama", accepted: marketing, at, context: "kayit" })
  const current = parseConsents(await store.get(consentsKey))
  const seen = new Set(current.map((item) => item.id))
  const items = [...current, ...rows.filter((item) => !seen.has(item.id))].slice(-500)
  await store.put(consentsKey, JSON.stringify({ items }))
}

export async function sitemapPages() {
  const store = await accountStore()
  const book = store ? await readBook(store) : seedBook()
  if (!book) return publishedPages(seedPages).filter((item) => item.index)
  return publishedPages(book.pages).filter((item) => item.index)
}
