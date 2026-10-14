import assert from "node:assert/strict"
import { openAdminSession } from "./admin-gate"
import { accountStore } from "./account-kv"
import { registerFlow } from "./account-flow"
import { consentsKey, pageBySlug, pagesKey, parseBook, sayfaGetFlow, sayfaPostFlow } from "./pages-flow"
import { bumpVersion, contentPaths, footerPages, parseBlocks, publishedPages, seedFaqs, seedPages } from "./site-pages"

const holder = globalThis as typeof globalThis & { __pinwegoAccounts?: Map<string, unknown> }
holder.__pinwegoAccounts = new Map()
const store = await accountStore()
assert.ok(store)

const slugs = seedPages.map((item) => item.slug)
assert.equal(new Set(slugs).size, slugs.length)
assert.deepEqual(contentPaths, slugs.map((slug) => `/${slug}`))
for (const page of seedPages) {
  assert.ok(page.blocks.length > 0, page.slug)
  assert.equal(page.version, "1.0")
  assert.equal(page.source.includes("hayatbes"), false)
  assert.equal(/<|>|javascript:/.test(page.source), false)
  if (page.legal) {
    assert.equal(page.source.includes("taslağıdır"), true, page.slug)
    assert.equal(page.effectiveAt, "2026-10-14")
  }
}
assert.equal(seedPages.some((item) => item.source.includes("MERSİS")), true)
assert.equal(seedPages.some((item) => /\b\d{10,}\b/.test(item.source) && item.source.includes("MERSİS no")), false)
assert.equal(footerPages(seedPages).some((item) => item.slug === "uyelik-sozlesmesi-iade"), false)
assert.equal(footerPages(seedPages).some((item) => item.slug === "uyelik-sozlesmesi"), true)
assert.equal(footerPages(seedPages).some((item) => item.slug === "iade-cayma"), true)
assert.equal(publishedPages([{ ...seedPages[0], status: "taslak" }]).length, 0)
assert.equal(seedFaqs.filter((item) => item.status === "yayinda").length, seedFaqs.length)
assert.equal(bumpVersion("1.0"), "1.1")
assert.equal(parseBlocks("## Başlık\n- satır\n[Pinwego](https://pinwego.com/hakkimizda)\n![ofis](/photos/office.jpg)")?.length, 4)
assert.equal(parseBlocks("<p>html</p>"), null)
assert.equal(parseBlocks("[dış](javascript:void)"), null)
assert.equal(parseBlocks("[dış](https://evil.example)"), null)
assert.equal(parseBlocks("![x](data:image/png;base64,aaaa)"), null)
assert.equal(parseBook(null)?.pages.length, seedPages.length)
assert.equal(parseBook("{"), null)

function call(path: string, body?: unknown, cookie = "") {
  return new Request(`http://127.0.0.1:43123${path}`, {
    method: body ? "POST" : "GET",
    headers: { origin: "http://127.0.0.1:43123", "content-type": "application/json", cookie },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const customer = {
  role: "musteri",
  email: "sozlesme@pinwego.test",
  password: "sifre1234",
  name: "Sozlesme Deneme",
  phone: "05551234567",
  locale: "tr",
  customer: { nationalId: "10000000146", birthDate: "1990-05-05" },
}

const refused = await registerFlow(call("/api/kayit", customer))
assert.equal(refused.status, 400)
assert.equal((await refused.json()).reason, "sozlesme")

const opened = await registerFlow(call("/api/kayit", { ...customer, acceptTerms: true }))
const openedBody = (await opened.json()) as { ok?: boolean; account?: { id: string; email?: string } }
assert.equal(opened.status, 200)
assert.equal(openedBody.ok, true)
const accountId = openedBody.account?.id ?? ""
const consentRaw = (await store.get(consentsKey)) ?? ""
assert.equal(consentRaw.includes(customer.email), false)
assert.equal(consentRaw.includes("1.0"), true)
const consents = JSON.parse(consentRaw) as { items: Array<{ accountId: string; pageId: string; version: string; kind: string; accepted: boolean }> }
const membership = consents.items.find((item) => item.pageId === "uyelik-sozlesmesi" && item.accountId === accountId)
const promo = consents.items.find((item) => item.kind === "pazarlama" && item.accountId === accountId)
assert.equal(membership?.version, "1.0")
assert.equal(membership?.accepted, true)
assert.equal(promo?.accepted, false)

const links = await sayfaGetFlow(call("/api/sayfa"))
const linkBody = (await links.json()) as { links?: Array<{ slug: string }> }
assert.equal(linkBody.links?.some((item) => item.slug === "kvkk-aydinlatma-metni"), true)
assert.equal(linkBody.links?.some((item) => item.slug === "uyelik-sozlesmesi-iade"), false)
const hidden = await sayfaPostFlow(call("/api/sayfa", { op: "save", id: "hakkimizda" }))
assert.equal(hidden.status, 401)

const token = await openAdminSession(store)
const cookie = `pinwego_admin=${encodeURIComponent(token)}`
const current = seedPages.find((item) => item.id === "hakkimizda")
assert.ok(current)
const saved = await sayfaPostFlow(call("/api/sayfa", {
  op: "save",
  id: current.id,
  title: current.title,
  summary: current.summary,
  source: `${current.source}\nGüncellenmiş taslak cümlesi.`,
  seoTitle: current.seoTitle,
  seoDescription: current.seoDescription,
  status: "yayinda",
  effectiveAt: current.effectiveAt,
  footer: true,
  order: current.order,
  index: true,
}, cookie))
const savedBody = (await saved.json()) as { ok?: boolean; page?: { version: string } }
assert.equal(savedBody.ok, true)
assert.equal(savedBody.page?.version, "1.1")
const consentAfter = (await store.get(consentsKey)) ?? ""
assert.equal(JSON.parse(consentAfter).items.find((item: { pageId: string }) => item.pageId === "uyelik-sozlesmesi").version, "1.0")

const draft = await sayfaPostFlow(call("/api/sayfa", {
  op: "save",
  id: "sss",
  title: "Sıkça sorulan sorular",
  source: seedPages.find((item) => item.id === "sss")?.source,
  status: "taslak",
  footer: true,
  order: 40,
}, cookie))
assert.equal((await draft.json()).ok, true)
assert.equal(await pageBySlug("sss"), null)
const missing = await sayfaGetFlow(call("/api/sayfa?slug=sss"))
assert.equal(missing.status, 404)
const listed = await sayfaGetFlow(call("/api/sayfa"))
assert.equal(((await listed.json()) as { links: Array<{ slug: string }> }).links.some((item) => item.slug === "sss"), false)

const bad = await sayfaPostFlow(call("/api/sayfa", {
  op: "save",
  id: "hakkimizda",
  title: "Hakkımızda",
  source: "<script>alert(1)</script>",
  status: "yayinda",
}, cookie))
assert.equal((await bad.json()).ok, false)

await store.put(pagesKey, "{")
const broken = await sayfaGetFlow(call("/api/sayfa", undefined, cookie))
assert.equal(broken.status, 500)
assert.equal(await store.get(pagesKey), "{")

console.log("yasal sayfalar, sözleşme sürümü ve gizli taslak")
