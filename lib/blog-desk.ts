import { slugifyKey } from "@/lib/format"
import { istanbulParts } from "@/lib/hours"
import {
  NEWS_CATEGORY_ID,
  type BlogArticle,
  type BlogAuditEntry,
  type BlogLive,
  type BlogPost,
  type BlogState,
  type BlogStatus,
  type BlogSubcategory,
} from "@/lib/blog"

export const POST_CAP = 30
export const AUDIT_CAP = 200

export const statusLabel: Record<BlogStatus, string> = {
  draft: "Taslak",
  pending_review: "Onay bekliyor",
  revision_requested: "Düzeltme bekliyor",
  approved: "Onaylandı",
  published: "Yayımlandı",
  rejected: "Reddedildi",
  archived: "Arşivlendi",
}

export type DeskBusiness = {
  id: string
  slug: string
  name: string
  ownerAccountId: string
  hidden?: boolean
}

export type DeskActor = { role: "admin" | "business"; id: string }

export type DeskDraft = {
  id?: string
  businessId?: string
  title?: string
  description?: string
  body?: string
  image?: string
  imageAlt?: string
  tags?: string
  slug?: string
  scheduledAt?: string
}

export type DeskCommand =
  | { op: "save"; post: DeskDraft }
  | { op: "submit"; id: string }
  | { op: "withdraw"; id: string }
  | { op: "remove"; id: string }
  | { op: "archive"; id: string }
  | { op: "approve"; id: string; scheduledAt?: string }
  | { op: "revise"; id: string; note: string }
  | { op: "reject"; id: string; note: string }
  | { op: "unpublish"; id: string; note?: string }
  | { op: "admin-save"; post: DeskDraft; publish?: boolean }

export type DeskResult = { ok: true; state: BlogState; post: BlogPost } | { ok: false; error: string }

const STATUSES: BlogStatus[] = [
  "draft",
  "pending_review",
  "revision_requested",
  "approved",
  "published",
  "rejected",
  "archived",
]

export function deskDay(now: number) {
  return istanbulParts(now).date
}

export function isBusinessPost(post: BlogPost) {
  return post.source === "business"
}

export function postStatus(post: BlogPost): BlogStatus {
  if (!isBusinessPost(post)) return post.published ? "published" : "draft"
  return post.status && STATUSES.includes(post.status) ? post.status : post.published ? "published" : "draft"
}

export function postsForBusiness(articles: BlogArticle[], business: { id: string; slug: string }) {
  return articles.filter(
    (article) => article.source === "business" && (article.businessId === business.id || article.businessSlug === business.slug),
  )
}

export function deskStats(posts: BlogPost[]) {
  const counts = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<BlogStatus, number>
  for (const post of posts) {
    if (isBusinessPost(post)) counts[postStatus(post)] += 1
  }
  return counts
}

/** Drop private business drafts from the payload sent to every visitor. Pinwego editorial posts stay as they are. */
/** Turns an approved post into a published one once its Istanbul day has arrived. */
export function releaseDue(state: BlogState, now: number): { state: BlogState; changed: boolean } {
  const today = deskDay(now)
  let changed = false
  const customPosts = state.customPosts.map((post) => {
    if (!isBusinessPost(post) || postStatus(post) !== "approved" || !post.scheduledAt || post.scheduledAt > today) return post
    changed = true
    return {
      ...post,
      status: "published" as const,
      published: true,
      scheduledAt: "",
      publishedAt: post.publishedAt || post.scheduledAt,
      updatedAt: today,
      live: undefined,
      reviewNote: "",
    }
  })
  return changed ? { state: { ...state, customPosts }, changed } : { state, changed }
}

export function projectPublicState(state: BlogState, today: string): BlogState {
  const posts = state.customPosts.flatMap((post) => {
    if (!isBusinessPost(post)) return [post]
    const visible = publicBusinessCopy(post, today)
    return visible ? [stripPrivate(visible)] : []
  })
  const shelves = new Set(posts.filter(isBusinessPost).map((post) => post.subcategoryId))
  return {
    ...state,
    audit: [],
    customPosts: posts,
    customSubcategories: state.customSubcategories.filter((item) => !item.id.startsWith("biz-") || shelves.has(item.id)),
  }
}

/** Editorial saves must not publish, delete or overwrite the business layer. */
export function sealBusinessLayer(current: BlogState, incoming: BlogState): BlogState {
  const businessPosts = current.customPosts.filter(isBusinessPost)
  const shelves = current.customSubcategories.filter((item) => item.id.startsWith("biz-"))
  return {
    ...incoming,
    audit: current.audit ?? [],
    customPosts: [...incoming.customPosts.filter((item) => !isBusinessPost(item)), ...businessPosts],
    customSubcategories: [...incoming.customSubcategories.filter((item) => !item.id.startsWith("biz-")), ...shelves],
    deletedCategoryIds: incoming.deletedCategoryIds.filter((id) => id !== NEWS_CATEGORY_ID),
  }
}

export function applyDesk(
  state: BlogState,
  actor: DeskActor,
  command: DeskCommand,
  businesses: DeskBusiness[],
  now = Date.now(),
): DeskResult {
  const today = deskDay(now)
  switch (command.op) {
    case "save":
    case "admin-save":
      return savePost(state, actor, command, businesses, today, now)
    case "submit":
      return transition(state, actor, command.id, businesses, today, now, (post, business) => submit(post, state, business, today))
    case "withdraw":
      return transition(state, actor, command.id, businesses, today, now, (post) => withdraw(post, today))
    case "remove":
      return remove(state, actor, command.id, businesses, now)
    case "archive":
      return transition(state, actor, command.id, businesses, today, now, (post) => archive(post, actor, today, "İşletme yayından kaldırdı."))
    case "approve":
      return adminOnly(actor) ?? transition(state, actor, command.id, businesses, today, now, (post, business) => approve(post, state, business, command.scheduledAt ?? "", today))
    case "revise":
      return adminOnly(actor) ?? transition(state, actor, command.id, businesses, today, now, (post) => askRevision(post, command.note, today))
    case "reject":
      return adminOnly(actor) ?? transition(state, actor, command.id, businesses, today, now, (post) => reject(post, command.note, today))
    case "unpublish":
      return adminOnly(actor) ?? transition(state, actor, command.id, businesses, today, now, (post) => archive(post, actor, today, command.note || "Yönetici yayından kaldırdı."))
    default:
      return { ok: false, error: "İşlem tanınmıyor." }
  }
}

function publicBusinessCopy(post: BlogPost, today: string): BlogPost | null {
  const status = postStatus(post)
  const due = !post.scheduledAt || post.scheduledAt <= today
  if (status === "published" || (status === "approved" && due && !post.live)) {
    return { ...post, published: true, status: "published" }
  }
  if (status === "approved" && due && post.live) {
    return { ...post, published: true, status: "published", live: undefined }
  }
  if (post.live && (status === "pending_review" || status === "revision_requested" || status === "approved" || status === "rejected")) {
    return { ...post, ...post.live, tags: post.live.tags, published: true, status: "published", live: undefined }
  }
  return null
}

function stripPrivate(post: BlogPost): BlogPost {
  const next: BlogPost = { ...post }
  delete next.live
  delete next.ownerAccountId
  delete next.reviewNote
  return next
}

function savePost(
  state: BlogState,
  actor: DeskActor,
  command: Extract<DeskCommand, { op: "save" | "admin-save" }>,
  businesses: DeskBusiness[],
  today: string,
  now: number,
): DeskResult {
  if (command.op === "admin-save") {
    const denied = adminOnly(actor)
    if (denied) return denied
  }
  const business = businesses.find((item) => item.id === command.post.businessId)
  if (!business) return { ok: false, error: "İşletme kaydı bulunamadı." }
  if (actor.role === "business" && business.ownerAccountId !== actor.id) return { ok: false, error: "Bu kayıt size ait değil." }
  const existing = command.post.id ? state.customPosts.find((item) => item.id === command.post.id) : undefined
  if (existing && !isBusinessPost(existing)) return { ok: false, error: "Bu yazı işletme haberi değil." }
  if (existing && actor.role === "business" && existing.ownerAccountId !== actor.id) return { ok: false, error: "Bu yazı size ait değil." }
  if (!existing && state.customPosts.filter((item) => item.businessId === business.id).length >= POST_CAP) {
    return { ok: false, error: `Bir işletme en fazla ${POST_CAP} yazı tutabilir.` }
  }
  const fields = cleanFields(command.post)
  if (fields.error !== null || !fields.value) return { ok: false, error: fields.error ?? "Yazı okunamadı." }
  const draft = fields.value
  if (draft.title.length < 3) return { ok: false, error: "Başlık en az 3 karakter olmalı." }

  let status: BlogStatus = existing ? postStatus(existing) : "draft"
  let live = existing?.live
  let published = false
  let publishedAt = existing?.publishedAt || today
  if (existing && actor.role === "business" && (status === "published" || live)) {
    live = live ?? snapshot(existing)
    status = "pending_review"
    published = false
  } else if (existing && actor.role === "business" && (status === "rejected" || status === "archived" || status === "approved")) {
    status = status === "approved" ? "pending_review" : "draft"
  } else if (command.op === "admin-save" && command.publish) {
    if (business.hidden) return { ok: false, error: "Gizli kaydın haberi yayına gidemez." }
    const ready = readyError(draft, state, existing?.id ?? "", business)
    if (ready) return { ok: false, error: ready }
    status = "published"
    published = true
    live = undefined
    publishedAt = existing?.publishedAt || today
  } else if (status === "published" && actor.role === "admin") {
    published = true
    live = undefined
  }

  const slug = lockedSlug(existing, draft.slug || draft.title, live)
  const unique = uniqueSlug(state, existing?.id ?? "", shelfId(business), slug)
  const post: BlogPost = {
    id: existing?.id ?? `bizpost-${crypto.randomUUID()}`,
    slug: unique,
    categoryId: NEWS_CATEGORY_ID,
    subcategoryId: shelfId(business),
    title: draft.title,
    description: draft.description,
    body: draft.body,
    image: draft.image,
    imageAlt: draft.imageAlt,
    published,
    kind: "custom",
    publishedAt,
    updatedAt: today,
    source: "business",
    status,
    ownerAccountId: existing?.ownerAccountId || business.ownerAccountId,
    businessId: business.id,
    businessSlug: business.slug,
    businessName: business.name,
    tags: draft.tags,
    reviewNote: status === "pending_review" || status === "published" ? "" : existing?.reviewNote ?? "",
    scheduledAt: command.op === "admin-save" ? cleanDate(command.post.scheduledAt) : existing?.scheduledAt ?? "",
    submittedAt: status === "pending_review" ? (existing?.status === "pending_review" ? existing.submittedAt || today : today) : existing?.submittedAt ?? "",
    related: [{ href: `/isletme/${business.slug}`, label: business.name, note: "İşletme kaydı" }],
    ...(live ? { live } : {}),
  }
  const next = withPost(ensureShelf(state, business), post)
  const action =
    command.op === "admin-save" && command.publish
      ? "Yönetici yayımladı"
      : !existing
        ? "Taslak açıldı"
        : live && existing.status === "published"
          ? "Yeniden incelemeye alındı"
          : "Kaydedildi"
  return {
    ok: true,
    post,
    state: withAudit(next, actor, post.id, action, existing ? diffNote(existing, post) : "Yeni taslak.", now),
  }
}

function submit(post: BlogPost, state: BlogState, business: DeskBusiness, today: string): DeskResult | BlogPost {
  const status = postStatus(post)
  if (business.hidden) return { ok: false, error: "Gizli kaydın haberi yayına gidemez." }
  if (status === "pending_review") return { ok: false, error: "Yazı zaten incelemede." }
  if (status !== "draft" && status !== "revision_requested" && status !== "rejected") {
    return { ok: false, error: "Bu aşamadaki yazı onaya gönderilemez." }
  }
  const ready = readyError(contentOf(post), state, post.id, business)
  if (ready) return { ok: false, error: ready }
  return { ...post, status: "pending_review", published: false, submittedAt: today, reviewNote: "", updatedAt: today }
}

function withdraw(post: BlogPost, today: string): BlogPost | DeskResult {
  if (postStatus(post) !== "pending_review") return { ok: false, error: "Yalnızca incelemedeki yazı geri çekilir." }
  if (post.live) {
    return {
      ...post,
      ...post.live,
      tags: post.live.tags,
      status: "published",
      published: true,
      live: undefined,
      reviewNote: "",
      updatedAt: today,
    }
  }
  return { ...post, status: "draft", published: false, updatedAt: today }
}

function approve(post: BlogPost, state: BlogState, business: DeskBusiness, scheduledAt: string, today: string): BlogPost | DeskResult {
  if (business.hidden) return { ok: false, error: "Gizli kaydın haberi yayına gidemez." }
  if (postStatus(post) !== "pending_review") return { ok: false, error: "Yalnızca onay bekleyen yazı yayımlanır." }
  const ready = readyError(contentOf(post), state, post.id, business)
  if (ready) return { ok: false, error: ready }
  const when = cleanDate(scheduledAt)
  if (when && when > today) {
    return { ...post, status: "approved", published: false, scheduledAt: when, reviewNote: "", updatedAt: today }
  }
  return {
    ...post,
    status: "published",
    published: true,
    scheduledAt: "",
    reviewNote: "",
    publishedAt: post.publishedAt || today,
    updatedAt: today,
    live: undefined,
  }
}

function askRevision(post: BlogPost, note: string, today: string): BlogPost | DeskResult {
  if (postStatus(post) !== "pending_review") return { ok: false, error: "Düzeltme isteği incelemedeki yazıya gider." }
  const text = plain(note, 500)
  if (text.length < 8) return { ok: false, error: "Düzeltme notu en az 8 karakter olmalı." }
  return { ...post, status: "revision_requested", published: false, reviewNote: text, updatedAt: today }
}

function reject(post: BlogPost, note: string, today: string): BlogPost | DeskResult {
  if (postStatus(post) !== "pending_review") return { ok: false, error: "Yalnızca incelemedeki yazı reddedilir." }
  const text = plain(note, 500)
  if (text.length < 8) return { ok: false, error: "Ret gerekçesi en az 8 karakter olmalı." }
  return { ...post, status: "rejected", published: false, reviewNote: text, updatedAt: today }
}

function archive(post: BlogPost, actor: DeskActor, today: string, note: string): BlogPost | DeskResult {
  const status = postStatus(post)
  if (actor.role === "business" && status !== "published" && status !== "approved") {
    return { ok: false, error: "Yayındaki yazıyı kaldırmak için arşiv kullanılır. Taslağı silebilirsiniz." }
  }
  if (status === "archived") return { ok: false, error: "Yazı zaten arşivde." }
  return { ...post, status: "archived", published: false, reviewNote: plain(note, 500), live: undefined, updatedAt: today }
}

function transition(
  state: BlogState,
  actor: DeskActor,
  id: string,
  businesses: DeskBusiness[],
  today: string,
  now: number,
  change: (post: BlogPost, business: DeskBusiness) => BlogPost | DeskResult,
): DeskResult {
  const found = findOwned(state, actor, id, businesses)
  if (!found.ok) return found
  const changed = change(found.post, found.business)
  if ("ok" in changed && changed.ok === false) return changed
  const post = changed as BlogPost
  const next = withPost(ensureShelf(state, found.business), post)
  return { ok: true, post, state: withAudit(next, actor, post.id, statusLabel[postStatus(post)], diffNote(found.post, post), now) }
}

function remove(state: BlogState, actor: DeskActor, id: string, businesses: DeskBusiness[], now: number): DeskResult {
  const found = findOwned(state, actor, id, businesses)
  if (!found.ok) return found
  const status = postStatus(found.post)
  if (actor.role === "business" && status !== "draft" && status !== "rejected" && status !== "archived" && status !== "revision_requested") {
    return { ok: false, error: "İncelemedeki veya yayındaki yazı silinmez. Önce geri çekin ya da yayından kaldırın." }
  }
  const customPosts = state.customPosts.filter((item) => item.id !== found.post.id)
  const still = customPosts.some((item) => item.subcategoryId === found.post.subcategoryId)
  return {
    ok: true,
    post: found.post,
    state: withAudit(
      {
        ...state,
        customPosts,
        customSubcategories: still ? state.customSubcategories : state.customSubcategories.filter((item) => item.id !== found.post.subcategoryId),
      },
      actor,
      found.post.id,
      "Silindi",
      found.post.title,
      now,
    ),
  }
}

function findOwned(
  state: BlogState,
  actor: DeskActor,
  id: string,
  businesses: DeskBusiness[],
): { ok: true; post: BlogPost; business: DeskBusiness } | { ok: false; error: string } {
  const post = state.customPosts.find((item) => item.id === id)
  if (!post || !isBusinessPost(post)) return { ok: false, error: "Yazı bulunamadı." }
  const business = businesses.find((item) => item.id === post.businessId)
  if (!business) return { ok: false, error: "İşletme kaydı bulunamadı." }
  if (actor.role === "business" && (post.ownerAccountId !== actor.id || business.ownerAccountId !== actor.id)) {
    return { ok: false, error: "Bu yazı size ait değil." }
  }
  return { ok: true, post, business }
}

function adminOnly(actor: DeskActor): DeskResult | null {
  return actor.role === "admin" ? null : { ok: false, error: "Bu işlem yalnızca yöneticiye açık." }
}

function ensureShelf(state: BlogState, business: DeskBusiness): BlogState {
  const shelf: BlogSubcategory = {
    id: shelfId(business),
    categoryId: NEWS_CATEGORY_ID,
    slug: business.slug,
    name: business.name,
    description: `${business.name} duyuru ve haberleri.`,
    order: 50,
  }
  const customSubcategories = state.customSubcategories.some((item) => item.id === shelf.id)
    ? state.customSubcategories.map((item) => (item.id === shelf.id ? shelf : item))
    : [...state.customSubcategories, shelf]
  return { ...state, customSubcategories }
}

function withPost(state: BlogState, post: BlogPost): BlogState {
  const customPosts = state.customPosts.some((item) => item.id === post.id)
    ? state.customPosts.map((item) => (item.id === post.id ? post : item))
    : [...state.customPosts, post]
  return { ...state, customPosts }
}

function withAudit(state: BlogState, actor: DeskActor, postId: string, action: string, note: string, now: number): BlogState {
  const entry: BlogAuditEntry = {
    id: `audit-${crypto.randomUUID()}`,
    at: new Date(now).toISOString(),
    actorRole: actor.role,
    actorId: actor.id,
    postId,
    action,
    note: plain(note, 500),
  }
  return { ...state, audit: [entry, ...(state.audit ?? [])].slice(0, AUDIT_CAP) }
}

function snapshot(post: BlogPost): BlogLive {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    body: post.body,
    image: post.image,
    imageAlt: post.imageAlt,
    tags: post.tags ?? [],
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
  }
}

function contentOf(post: BlogPost) {
  return {
    title: post.title,
    description: post.description,
    body: post.body,
    image: post.image,
    imageAlt: post.imageAlt,
    tags: post.tags ?? [],
    slug: post.slug,
  }
}

function lockedSlug(existing: BlogPost | undefined, requested: string, live: BlogLive | undefined) {
  if (live?.slug) return live.slug
  if (existing && (existing.status === "published" || existing.published)) return existing.slug
  return deskSlug(requested)
}

function uniqueSlug(state: BlogState, id: string, subcategoryId: string, slug: string) {
  const taken = new Set(
    state.customPosts.filter((item) => item.id !== id && item.subcategoryId === subcategoryId).map((item) => item.slug),
  )
  if (!taken.has(slug)) return slug
  let index = 2
  while (taken.has(`${slug}-${index}`)) index += 1
  return `${slug}-${index}`
}

function shelfId(business: DeskBusiness) {
  return `biz-${business.slug}`
}

function deskSlug(value: string) {
  return slugifyKey(value.normalize("NFD").replace(/\p{M}/gu, ""))
}

type Clean = {
  title: string
  description: string
  body: string
  image: string
  imageAlt: string
  tags: string[]
  slug: string
}

function cleanFields(input: DeskDraft): { value: Clean; error: null } | { value: null; error: string } {
  const image = (input.image ?? "").trim()
  if (image && !imageAllowed(image)) return { value: null, error: "Görsel JPEG, PNG veya WebP olmalı ve 1 MB altında kalmalı." }
  const body = plain(input.body ?? "", 12000)
  if (/javascript:/i.test(`${input.title ?? ""} ${input.body ?? ""}`) || /<script/i.test(input.body ?? "")) {
    return { value: null, error: "Metin içinde çalıştırılabilir kod kabul edilmez." }
  }
  return {
    error: null,
    value: {
      title: plain(input.title ?? "", 110),
      description: plain(input.description ?? "", 200),
      body,
      image,
      imageAlt: plain(input.imageAlt ?? "", 140),
      tags: tagsOf(input.tags ?? ""),
      slug: plain(input.slug ?? "", 80),
    },
  }
}

function readyError(fields: Clean, state: BlogState, id: string, business: DeskBusiness) {
  if (fields.title.length < 8) return "Yayın için başlık en az 8 karakter olmalı."
  if (fields.description.length < 40) return "Kısa açıklama en az 40 karakter olmalı. Bu metin arama sonucunda görünür."
  if (fields.body.length < 80) return "Yazı en az 80 karakter olmalı."
  if (!fields.image || !fields.imageAlt) return "Kapak görseli ve görselin alt metni gerekli."
  const links = fields.body.match(/https?:\/\//gi)?.length ?? 0
  if (links > 5) return "Yazıda en fazla beş bağlantı olabilir."
  const twin = state.customPosts.find(
    (item) => item.id !== id && item.businessId === business.id && sameText(item.body, fields.body),
  )
  if (twin) return "Aynı metin bu işletmede zaten var."
  return null
}

function sameText(left: string, right: string) {
  return left.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim() === right.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim()
}

function tagsOf(value: string) {
  return [...new Set(value.split(/[,\n;]/).map((item) => plain(item, 32)).filter(Boolean))].slice(0, 8)
}

function plain(value: string, max: number) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\s+\n/g, "\n")
    .trim()
    .slice(0, max)
}

function imageAllowed(value: string) {
  if (value.startsWith("/photos/") && value.length < 200 && !value.includes("..") && !value.includes("//")) return true
  return /^data:image\/(jpeg|jpg|png|webp);base64,[a-z0-9+/=\s]+$/i.test(value) && value.length < 1_200_000
}

function cleanDate(value: string | undefined) {
  const text = (value ?? "").trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ""
}

function diffNote(before: BlogPost, after: BlogPost) {
  const parts: string[] = []
  if (before.title !== after.title) parts.push("başlık")
  if (before.description !== after.description) parts.push("açıklama")
  if (before.body !== after.body) parts.push("metin")
  if (before.image !== after.image) parts.push("görsel")
  if (before.status !== after.status) parts.push(statusLabel[postStatus(after)])
  return parts.length ? `Değişen: ${parts.join(", ")}.` : "Kayıt güncellendi."
}
