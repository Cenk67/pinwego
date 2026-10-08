import type { Account } from "@/lib/auth-store"
import type { Business, ChatBlock, ChatKind, ChatMessage, ChatNotice, ChatThread } from "@/lib/types"

const STORAGE_KEY = "pinwego.messages.v1"
const CHANNEL = "pinwego-messages"

type Persisted = {
  threads: ChatThread[]
  messages: ChatMessage[]
  notices: ChatNotice[]
  blocks: ChatBlock[]
}

const empty: Persisted = { threads: [], messages: [], notices: [], blocks: [] }

let memory = empty
let loaded = false
const listeners = new Set<() => void>()
let channel: BroadcastChannel | null = null

function listingPeer(business: Business) {
  return business.ownerAccountId || `listing:${business.id}`
}

function threadIdFor(accountId: string, business: Business) {
  return [accountId, listingPeer(business)].sort().join("::")
}

function isRecord(value: unknown): value is ChatThread {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<ChatThread>
  return typeof item.id === "string" && Array.isArray(item.members) && typeof item.listingId === "string"
}

function isMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<ChatMessage>
  return typeof item.id === "string" && typeof item.threadId === "string" && typeof item.text === "string"
}

function isBlock(value: unknown): value is ChatBlock {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<ChatBlock>
  return typeof item.id === "string" && typeof item.threadId === "string" && typeof item.blockerId === "string"
}

function readStorage(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty
    const data = JSON.parse(raw) as Partial<Persisted>
    return {
      threads: Array.isArray(data.threads) ? data.threads.filter(isRecord) : [],
      messages: Array.isArray(data.messages) ? data.messages.filter(isMessage) : [],
      notices: Array.isArray(data.notices)
        ? data.notices.filter((item) => item && typeof item === "object" && typeof (item as ChatNotice).accountId === "string")
        : [],
      blocks: Array.isArray(data.blocks) ? data.blocks.filter(isBlock) : [],
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return empty
  }
}

function commit(next: Persisted) {
  memory = next
  loaded = true
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  listeners.forEach((listener) => listener())
}

function bootChannel() {
  if (channel || typeof BroadcastChannel === "undefined") return
  channel = new BroadcastChannel(CHANNEL)
  channel.onmessage = () => {
    memory = readStorage()
    loaded = true
    listeners.forEach((listener) => listener())
  }
}

export function subscribeMessages(listener: () => void) {
  listeners.add(listener)
  bootChannel()
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return
    memory = readStorage()
    loaded = true
    listeners.forEach((item) => item())
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

export function getMessageSnapshot() {
  if (!loaded) {
    loaded = true
    memory = readStorage()
    bootChannel()
  }
  return memory
}

export function getMessageServerSnapshot() {
  return empty
}

export function listingMailboxId(business: Business) {
  return listingPeer(business)
}

export function ownsListing(account: Account, business: Business) {
  return business.ownerAccountId === account.id
}

export function visibleThreads(account: Account, ownedListingIds: string[]) {
  const mailboxes = new Set(ownedListingIds.map((id) => `listing:${id}`))
  return getMessageSnapshot()
    .threads.filter((thread) => {
      if (account.role === "admin") return true
      if (thread.members.includes(account.id)) return true
      return thread.members.some((member) => mailboxes.has(member))
    })
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function threadMessages(threadId: string) {
  return getMessageSnapshot()
    .messages.filter((item) => item.threadId === threadId)
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function unreadCount(account: Account, ownedListingIds: string[]) {
  const ids = new Set(visibleThreads(account, ownedListingIds).map((item) => item.id))
  const me = new Set([account.id, ...ownedListingIds.map((id) => `listing:${id}`)])
  return getMessageSnapshot().messages.filter(
    (item) =>
      ids.has(item.threadId) &&
      !blockedByMe(account.id, item.threadId) &&
      !me.has(item.fromId) &&
      !item.readBy.includes(account.id),
  ).length
}

export function unreadInThread(accountId: string, threadId: string, ownedListingIds: string[]) {
  if (blockedByMe(accountId, threadId)) return 0
  const me = new Set([accountId, ...ownedListingIds.map((id) => `listing:${id}`)])
  return getMessageSnapshot().messages.filter(
    (item) => item.threadId === threadId && !me.has(item.fromId) && !item.readBy.includes(accountId),
  ).length
}

export function openListingThread(account: Account, business: Business): ChatThread | null {
  if (listingPeer(business) === account.id) return null
  const current = getMessageSnapshot()
  const id = threadIdFor(account.id, business)
  const existing = current.threads.find((item) => item.id === id)
  if (existing) return existing
  const kind: ChatKind = account.role === "musteri" ? "musteri-isletme" : "isletme-isletme"
  const thread: ChatThread = {
    id,
    kind,
    listingId: business.id,
    listingSlug: business.slug,
    listingName: business.name,
    members: [account.id, listingPeer(business)],
    updatedAt: new Date().toISOString(),
    lastText: "",
    lastFromId: account.id,
  }
  commit({ ...current, threads: [thread, ...current.threads] })
  return thread
}

export function sendMessage(input: {
  account: Account
  threadId: string
  text: string
  recipientIds: string[]
}) {
  const text = input.text.trim()
  if (!text) return null
  const current = getMessageSnapshot()
  const thread = current.threads.find((item) => item.id === input.threadId)
  if (!thread) return null
  if (isThreadBlocked(thread.id)) return null
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    threadId: thread.id,
    fromId: input.account.id,
    fromName: input.account.name,
    text: text.slice(0, 2000),
    createdAt: new Date().toISOString(),
    readBy: [input.account.id],
  }
  const members = thread.members.includes(input.account.id)
    ? thread.members
    : [input.account.id, ...thread.members]
  const nextThread: ChatThread = {
    ...thread,
    members,
    updatedAt: message.createdAt,
    lastText: message.text,
    lastFromId: message.fromId,
  }
  const notices: ChatNotice[] = input.recipientIds
    .filter((id) => id && !id.startsWith("listing:") && id !== input.account.id)
    .map((accountId) => ({
      id: crypto.randomUUID(),
      accountId,
      title: input.account.name,
      body: message.text,
      threadId: thread.id,
    }))
  commit({
    threads: [nextThread, ...current.threads.filter((item) => item.id !== thread.id)],
    messages: [...current.messages, message],
    notices: [...notices, ...current.notices],
    blocks: current.blocks,
  })
  channel?.postMessage({ type: "message", threadId: thread.id, recipientIds: input.recipientIds })
  return message
}

export function markThreadRead(accountId: string, threadId: string) {
  const current = getMessageSnapshot()
  let changed = false
  const messages = current.messages.map((item) => {
    if (item.threadId !== threadId || item.readBy.includes(accountId)) return item
    changed = true
    return { ...item, readBy: [...item.readBy, accountId] }
  })
  if (!changed) return
  commit({ ...current, messages })
}

export function adoptListingThreads(listingId: string, accountId: string) {
  const current = getMessageSnapshot()
  const mailbox = `listing:${listingId}`
  let changed = false
  const threads = current.threads.map((thread) => {
    if (!thread.members.includes(mailbox) || thread.members.includes(accountId)) return thread
    changed = true
    return { ...thread, members: [...thread.members, accountId] }
  })
  if (!changed) return
  commit({ ...current, threads })
}

export function takeNotices(accountId: string) {
  const current = getMessageSnapshot()
  const mine = current.notices.filter((item) => item.accountId === accountId)
  if (!mine.length) return []
  commit({ ...current, notices: current.notices.filter((item) => item.accountId !== accountId) })
  return mine.filter((item) => !blockedByMe(accountId, item.threadId))
}

export function blockedByMe(accountId: string, threadId: string) {
  return getMessageSnapshot().blocks.some((item) => item.threadId === threadId && item.blockerId === accountId)
}

export function blockedByPeer(accountId: string, threadId: string) {
  return getMessageSnapshot().blocks.some((item) => item.threadId === threadId && item.blockerId !== accountId)
}

export function isThreadBlocked(threadId: string) {
  return getMessageSnapshot().blocks.some((item) => item.threadId === threadId)
}

export function blockedListingIds(accountId: string) {
  const current = getMessageSnapshot()
  const threadIds = new Set(
    current.blocks.filter((item) => item.blockerId === accountId).map((item) => item.threadId),
  )
  return new Set(current.threads.filter((thread) => threadIds.has(thread.id)).map((thread) => thread.listingId))
}

export function blockThread(accountId: string, threadId: string) {
  const current = getMessageSnapshot()
  if (!current.threads.some((item) => item.id === threadId)) return
  if (blockedByMe(accountId, threadId)) return
  const block: ChatBlock = {
    id: crypto.randomUUID(),
    threadId,
    blockerId: accountId,
    createdAt: new Date().toISOString(),
  }
  commit({
    ...current,
    blocks: [block, ...current.blocks],
    notices: current.notices.filter((item) => !(item.accountId === accountId && item.threadId === threadId)),
  })
  channel?.postMessage({ type: "block", threadId })
}

export function unblockThread(accountId: string, threadId: string) {
  const current = getMessageSnapshot()
  const blocks = current.blocks.filter((item) => !(item.threadId === threadId && item.blockerId === accountId))
  if (blocks.length === current.blocks.length) return
  commit({ ...current, blocks })
  channel?.postMessage({ type: "unblock", threadId })
}

export function recipientIdsFor(thread: ChatThread, senderId: string, ownerAccountId?: string) {
  return [
    ...thread.members.filter((id) => id !== senderId && !id.startsWith("listing:")),
    ownerAccountId && ownerAccountId !== senderId ? ownerAccountId : "",
  ].filter((id, index, list) => id && list.indexOf(id) === index)
}
