import { jsonReply, readJson, requestIp, takeIpSlot } from "@/lib/account-route"
import { accountStore } from "@/lib/account-kv"
import { adminSessionOpen, readAdminCookie } from "@/lib/admin-gate"
import { normalizeBlogState, type BlogState } from "@/lib/blog"
import { readBlogState, writeBlogState } from "@/lib/blog-file"
import {
  applyDesk,
  deskStats,
  isBusinessPost,
  projectPublicState,
  releaseDue,
  sealBusinessLayer,
  deskDay,
  type DeskActor,
  type DeskBusiness,
  type DeskCommand,
  type DeskDraft,
} from "@/lib/blog-desk"
import { listingsKey, parseBook } from "@/lib/listings"
import { memberEmail, publicAccount, readMemberCookie } from "@/lib/member-session"

type Store = NonNullable<Awaited<ReturnType<typeof accountStore>>>

export type BlogIo = {
  readState: () => Promise<BlogState>
  writeState: (state: BlogState) => Promise<BlogState>
  businesses: (store: Store) => Promise<DeskBusiness[]>
  now: number
}

function defaultIo(): BlogIo {
  return {
    readState: readBlogState,
    writeState: writeBlogState,
    businesses: readDeskBusinesses,
    now: Date.now(),
  }
}

export async function readDeskBusinesses(store: Store): Promise<DeskBusiness[]> {
  const book = parseBook(await store.get(listingsKey))
  if (!book) return []
  return book.listings.map((item) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    ownerAccountId: item.ownerAccountId,
    hidden: item.hidden === true,
  }))
}

async function actor(store: Store, request: Request): Promise<DeskActor | null> {
  if (await adminSessionOpen(store, readAdminCookie(request.headers.get("cookie")))) return { role: "admin", id: "yonetici" }
  const email = await memberEmail(store, readMemberCookie(request.headers.get("cookie")))
  if (!email) return null
  const account = await publicAccount(store, email)
  if (!account || account.role !== "isletme") return account ? { role: "business", id: "" } : null
  return { role: "business", id: account.id }
}

async function currentState(io: BlogIo) {
  const loaded = normalizeBlogState(await io.readState())
  const released = releaseDue(loaded, io.now)
  if (!released.changed) return loaded
  return normalizeBlogState(await io.writeState(released.state))
}

export async function blogStateGetFlow(request: Request, io: BlogIo = defaultIo()) {
  const state = await currentState(io)
  const store = await accountStore()
  const admin = Boolean(store && (await adminSessionOpen(store, readAdminCookie(request.headers.get("cookie")))))
  return jsonReply(admin ? state : projectPublicState(state, deskDay(io.now)))
}

export async function blogStatePutFlow(request: Request, io: BlogIo = defaultIo()) {
  const store = await accountStore()
  if (!store) return jsonReply({ error: "Kayıt şu an kapalı" }, 503)
  const open = await adminSessionOpen(store, readAdminCookie(request.headers.get("cookie")))
  if (!open) return jsonReply({ error: "Yetki yok" }, 401)
  const body = await readJson(request, 1_600_000)
  if (!body) return jsonReply({ error: "Kayıt okunamadı" }, 400)
  const current = await currentState(io)
  const incoming = normalizeBlogState(body.state)
  const state = await io.writeState(sealBusinessLayer(current, incoming))
  return jsonReply({ ok: true, state })
}

export async function blogDeskGetFlow(request: Request, io: BlogIo = defaultIo()) {
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, error: "Kayıt şu an kapalı" }, 503)
  const who = await actor(store, request)
  if (!who) return jsonReply({ ok: false, error: "Giriş gerekli." }, 401)
  if (who.role === "business" && !who.id) return jsonReply({ ok: false, error: "Bu işlem işletme hesabı ister." }, 403)
  const state = await currentState(io)
  const businesses = await io.businesses(store)
  return jsonReply(present(state, who, businesses))
}

export async function blogDeskPostFlow(request: Request, io: BlogIo = defaultIo()) {
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, error: "Kayıt şu an kapalı" }, 503)
  if (!(await takeIpSlot(requestIp(request), "blog-yazi", io.now, 30))) return jsonReply({ ok: false, error: "Çok sık denendi. Biraz sonra yeniden dene." }, 429)
  const who = await actor(store, request)
  if (!who) return jsonReply({ ok: false, error: "Giriş gerekli." }, 401)
  if (who.role === "business" && !who.id) return jsonReply({ ok: false, error: "Bu işlem işletme hesabı ister." }, 403)
  const body = await readJson(request, 1_600_000)
  if (!body) return jsonReply({ ok: false, error: "Kayıt okunamadı." }, 400)
  const command = commandFrom(body)
  if (!command) return jsonReply({ ok: false, error: "İşlem tanınmıyor." }, 400)
  const current = await currentState(io)
  const businesses = await io.businesses(store)
  const result = applyDesk(current, who, command, businesses, io.now)
  if (!result.ok) return jsonReply({ ok: false, error: result.error }, 400)
  const state = await io.writeState(result.state)
  return jsonReply({ ...present(state, who, businesses), post: result.post })
}

function present(state: BlogState, actor: DeskActor, businesses: DeskBusiness[]) {
  const posts =
    actor.role === "admin"
      ? state.customPosts.filter(isBusinessPost)
      : state.customPosts.filter((post) => isBusinessPost(post) && post.ownerAccountId === actor.id)
  const visibleBusinesses =
    actor.role === "admin"
      ? businesses.filter((item) => posts.some((post) => post.businessId === item.id))
      : businesses.filter((item) => item.ownerAccountId === actor.id)
  const audit = (state.audit ?? []).filter((entry) => actor.role === "admin" || posts.some((post) => post.id === entry.postId)).slice(0, 40)
  return { ok: true, posts, audit, stats: deskStats(posts), businesses: visibleBusinesses }
}

function commandFrom(body: Record<string, unknown>): DeskCommand | null {
  const op = body.op
  const id = text(body.id)
  const note = text(body.note)
  const scheduledAt = text(body.scheduledAt)
  if (op === "save" || op === "admin-save") {
    const raw = body.post
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
    const post = raw as Record<string, unknown>
    const draft: DeskDraft = {
      id: text(post.id),
      businessId: text(post.businessId),
      title: text(post.title),
      description: text(post.description),
      body: text(post.body),
      image: text(post.image),
      imageAlt: text(post.imageAlt),
      tags: text(post.tags),
      slug: text(post.slug),
      scheduledAt: text(post.scheduledAt),
    }
    return op === "admin-save" ? { op, post: draft, publish: body.publish === true } : { op, post: draft }
  }
  if (!id) return null
  if (op === "submit" || op === "withdraw" || op === "remove" || op === "archive") return { op, id }
  if (op === "approve") return { op, id, scheduledAt }
  if (op === "revise" || op === "reject") return { op, id, note }
  if (op === "unpublish") return { op, id, note }
  return null
}

function text(value: unknown) {
  return typeof value === "string" ? value : ""
}
