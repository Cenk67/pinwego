import assert from "node:assert/strict"
import test from "node:test"
import { assembleBlog, emptyBlogState, findArticle, publicArticles, removeCategory, searchGuides } from "./blog"
import { NEWS_CATEGORY_ID } from "./blog"
import { applyDesk, postStatus, projectPublicState, releaseDue, sealBusinessLayer, type DeskBusiness } from "./blog-desk"

const now = Date.parse("2026-10-20T09:00:00Z")
const today = "2026-10-20"
const image = "data:image/png;base64,aaaa"
const business: DeskBusiness = { id: "biz-1", slug: "yesil-cinar", name: "Yeşil Çınar", ownerAccountId: "owner-1" }
const other: DeskBusiness = { id: "biz-2", slug: "mavi-sofra", name: "Mavi Sofra", ownerAccountId: "owner-2" }
const owner = { role: "business" as const, id: "owner-1" }
const admin = { role: "admin" as const, id: "yonetici" }
const sectors = [{ id: "yeme", label: "Yeme-İçme", photo: "/photos/lokanta.jpg" }]

const draft = {
  businessId: business.id,
  title: "Yeni yaz menümüz açıldı",
  description: "Zonguldak Kozlu'da yeni yaz menüsü ve sabah rezervasyonu başladı.",
  body: "Yeşil Çınar'ın yaz mutfağı bu hafta açılıyor. Menüde peynir, zeytin ve günlük ekmek var. Cumartesi sabahı rezervasyon açılır.",
  image,
  imageAlt: "Yaz kahvaltı tabağı",
  tags: "menü, kahvaltı",
}

function must<T extends { ok: true }>(result: { ok: true } | { ok: false; error: string }) {
  assert.equal(result.ok, true, result.ok ? "" : result.error)
  return result as T
}

test("a business draft stays private until an admin publishes it", () => {
  const saved = must<{ ok: true; state: ReturnType<typeof emptyBlogState>; post: { id: string } }>(
    applyDesk(emptyBlogState(), owner, { op: "save", post: draft }, [business], now),
  )
  assert.equal(saved.post && postStatus(saved.state.customPosts[0]), "draft")
  assert.equal(projectPublicState(saved.state, today).customPosts.length, 0)
  const submitted = must<{ ok: true; state: ReturnType<typeof emptyBlogState> }>(
    applyDesk(saved.state, owner, { op: "submit", id: saved.post.id }, [business], now),
  )
  assert.equal(postStatus(submitted.state.customPosts[0]), "pending_review")
  assert.equal(publicView(submitted.state), null)
  const stranger = applyDesk(submitted.state, { role: "business", id: "owner-2" }, { op: "approve", id: saved.post.id }, [business, other], now)
  assert.equal(stranger.ok, false)
  const published = must<{ ok: true; state: ReturnType<typeof emptyBlogState> }>(
    applyDesk(submitted.state, admin, { op: "approve", id: saved.post.id }, [business], now),
  )
  const article = publicView(published.state)
  assert.equal(article?.title, draft.title)
  assert.equal(article?.categorySlug, "isletmelerden-haberler")
  assert.equal(article?.subcategorySlug, "yesil-cinar")
  assert.equal(article?.source, "business")
  const hits = searchGuides(publicArticles(assembleBlog(published.state, [], sectors)), "Yeşil Çınar yaz mutfağı rezervasyon")
  assert.equal(hits.some((item) => item.href.includes("isletmelerden-haberler")), false)
})

test("editing a live post keeps the old text public until the new text is approved", () => {
  let state = publish(emptyBlogState())
  const id = state.customPosts[0].id
  const edited = must<{ ok: true; state: ReturnType<typeof emptyBlogState> }>(
    applyDesk(state, owner, { op: "save", post: { ...draft, id, title: "Kış menüsü duyurusu", body: `${draft.body} Kış menüsünde çorba da var.` } }, [business], now),
  )
  state = edited.state
  assert.equal(postStatus(state.customPosts[0]), "pending_review")
  assert.equal(publicView(state)?.title, draft.title)
  assert.equal(state.customPosts[0].title, "Kış menüsü duyurusu")
  const rejected = must<{ ok: true; state: ReturnType<typeof emptyBlogState> }>(
    applyDesk(state, admin, { op: "reject", id, note: "Menü fiyatı yazılmamış." }, [business], now),
  )
  assert.equal(publicView(rejected.state)?.title, draft.title)
  const again = must<{ ok: true; state: ReturnType<typeof emptyBlogState> }>(
    applyDesk(rejected.state, owner, { op: "submit", id }, [business], now),
  )
  const approved = must<{ ok: true; state: ReturnType<typeof emptyBlogState> }>(
    applyDesk(again.state, admin, { op: "approve", id }, [business], now),
  )
  assert.equal(publicView(approved.state)?.title, "Kış menüsü duyurusu")
  assert.equal(approved.state.customPosts[0].live, undefined)
  assert.ok(approved.state.audit[0])
})

test("a future publish date keeps the previous text public, and withdrawing an update restores it", () => {
  let state = publish(emptyBlogState())
  const id = state.customPosts[0].id
  state = must<{ ok: true; state: ReturnType<typeof emptyBlogState> }>(
    applyDesk(state, owner, { op: "save", post: { ...draft, id, title: "Gelecek duyuru" } }, [business], now),
  ).state
  const pulled = must<{ ok: true; state: ReturnType<typeof emptyBlogState> }>(
    applyDesk(state, owner, { op: "withdraw", id }, [business], now),
  )
  assert.equal(postStatus(pulled.state.customPosts[0]), "published")
  assert.equal(publicView(pulled.state)?.title, draft.title)
  state = must<{ ok: true; state: ReturnType<typeof emptyBlogState> }>(
    applyDesk(pulled.state, owner, { op: "save", post: { ...draft, id, title: "Gelecek duyuru" } }, [business], now),
  ).state
  state = must<{ ok: true; state: ReturnType<typeof emptyBlogState> }>(
    applyDesk(state, admin, { op: "approve", id, scheduledAt: "2026-11-01" }, [business], now),
  ).state
  assert.equal(postStatus(state.customPosts[0]), "approved")
  assert.equal(publicView(state)?.title, draft.title)
  assert.equal(publicView(state)?.title === "Gelecek duyuru", false)
  const opened = releaseDue(state, Date.parse("2026-11-02T09:00:00Z"))
  assert.equal(opened.changed, true)
  assert.equal(postStatus(opened.state.customPosts[0]), "published")
  assert.equal(publicView(opened.state)?.title, "Gelecek duyuru")
})

test("unsafe html and foreign posts are refused, and editorial saves cannot erase business posts", () => {
  const script = applyDesk(emptyBlogState(), owner, { op: "save", post: { ...draft, body: "<script>alert(1)</script>" } }, [business], now)
  assert.equal(script.ok, false)
  const svg = applyDesk(emptyBlogState(), owner, { op: "save", post: { ...draft, image: "data:image/svg+xml;base64,aaaa" } }, [business], now)
  assert.equal(svg.ok, false)
  const state = publish(emptyBlogState())
  const stolen = applyDesk(state, { role: "business", id: "owner-2" }, { op: "save", post: { ...draft, id: state.customPosts[0].id, businessId: other.id } }, [business, other], now)
  assert.equal(stolen.ok, false)
  const wiped = sealBusinessLayer(state, emptyBlogState())
  assert.equal(wiped.customPosts.length, 1)
  assert.equal(removeCategory(state, NEWS_CATEGORY_ID), state)
})

function publish(state: ReturnType<typeof emptyBlogState>) {
  const saved = must<{ ok: true; state: ReturnType<typeof emptyBlogState>; post: { id: string } }>(
    applyDesk(state, owner, { op: "save", post: draft }, [business], now),
  )
  const submitted = must<{ ok: true; state: ReturnType<typeof emptyBlogState> }>(
    applyDesk(saved.state, owner, { op: "submit", id: saved.post.id }, [business], now),
  )
  return must<{ ok: true; state: ReturnType<typeof emptyBlogState> }>(
    applyDesk(submitted.state, admin, { op: "approve", id: saved.post.id }, [business], now),
  ).state
}

function publicView(state: ReturnType<typeof emptyBlogState>) {
  return findArticle(assembleBlog(projectPublicState(state, today), [], sectors), "isletmelerden-haberler", "yesil-cinar", "yeni-yaz-menumuz-acildi")
}
