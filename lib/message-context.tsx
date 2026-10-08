"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { useAuth } from "@/lib/auth-context"
import { useDirectory } from "@/lib/directory-context"
import {
  adoptListingThreads,
  blockedByMe as accountBlockedThread,
  blockedByPeer as peerBlockedThread,
  blockedListingIds,
  blockThread,
  getMessageServerSnapshot,
  getMessageSnapshot,
  isThreadBlocked,
  markThreadRead,
  openListingThread,
  recipientIdsFor,
  sendMessage,
  subscribeMessages,
  takeNotices,
  unblockThread,
  unreadCount,
  unreadInThread,
  visibleThreads,
} from "@/lib/message-store"
import { showBrowserNotice } from "@/lib/notify"
import type { Account } from "@/lib/auth-store"
import type { Business, ChatMessage, ChatThread } from "@/lib/types"

type Toast = {
  title: string
  body: string
  href: string
}

type MessageState = {
  threads: ChatThread[]
  unread: number
  messagesFor: (threadId: string) => ChatMessage[]
  unreadIn: (threadId: string) => number
  openWithBusiness: (business: Business) => ChatThread | null
  send: (threadId: string, text: string, business?: Business) => ChatMessage | null
  markRead: (threadId: string) => void
  adoptListing: (listingId: string) => void
  block: (threadId: string) => void
  unblock: (threadId: string) => void
  blockedByMe: (threadId: string) => boolean
  blockedByPeer: (threadId: string) => boolean
  threadClosed: (threadId: string) => boolean
  blockedListings: Set<string>
  toast: Toast | null
  dismissToast: () => void
}

const MessageContext = createContext<MessageState | null>(null)

function ownedIds(account: Account | null, listings: Business[]) {
  if (!account) return []
  return listings.filter((item) => item.ownerAccountId === account.id).map((item) => item.id)
}

export function MessageProvider({ children }: { children: ReactNode }) {
  const { account, accounts } = useAuth()
  const { listings } = useDirectory()
  const persisted = useSyncExternalStore(subscribeMessages, getMessageSnapshot, getMessageServerSnapshot)
  const [toast, setToast] = useState<Toast | null>(null)
  const owned = useMemo(() => ownedIds(account, listings), [account, listings])

  useEffect(() => {
    if (!account) return
    const notices = takeNotices(account.id)
    if (!notices.length) return
    const last = notices[0]
    const href = `/mesajlar?konusma=${encodeURIComponent(last.threadId)}`
    const extra = notices.length > 1 ? ` ve ${notices.length - 1} mesaj daha` : ""
    const timer = window.setTimeout(() => {
      setToast({ title: last.title, body: last.body, href })
      showBrowserNotice(last.title, `${last.body}${extra}`, href)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [account, persisted.notices.length])

  const value = useMemo<MessageState>(() => {
    const threads = account ? visibleThreads(account, owned) : []
    return {
      threads,
      unread: account ? unreadCount(account, owned) : 0,
      messagesFor: (threadId) =>
        persisted.messages
          .filter((item) => item.threadId === threadId)
          .slice()
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      unreadIn: (threadId) => (account ? unreadInThread(account.id, threadId, owned) : 0),
      openWithBusiness: (business) => (account ? openListingThread(account, business) : null),
      send: (threadId, text, business) => {
        if (!account) return null
        const thread = getMessageSnapshot().threads.find((item) => item.id === threadId)
        if (!thread) return null
        const extra = accounts
          .filter(
            (item) =>
              item.id !== account.id &&
              (item.role === "admin" || item.id === business?.ownerAccountId),
          )
          .map((item) => item.id)
        return sendMessage({
          account,
          threadId,
          text,
          recipientIds: [
            ...recipientIdsFor(thread, account.id, business?.ownerAccountId),
            ...extra,
          ],
        })
      },
      markRead: (threadId) => {
        if (account) markThreadRead(account.id, threadId)
      },
      adoptListing: (listingId) => {
        if (account) adoptListingThreads(listingId, account.id)
      },
      block: (threadId) => {
        if (account) blockThread(account.id, threadId)
      },
      unblock: (threadId) => {
        if (account) unblockThread(account.id, threadId)
      },
      blockedByMe: (threadId) => (account ? accountBlockedThread(account.id, threadId) : false),
      blockedByPeer: (threadId) => (account ? peerBlockedThread(account.id, threadId) : false),
      threadClosed: (threadId) => isThreadBlocked(threadId),
      blockedListings: account ? blockedListingIds(account.id) : new Set<string>(),
      toast,
      dismissToast: () => setToast(null),
    }
  }, [account, accounts, owned, persisted, toast])

  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
}

export function useMessages() {
  const value = useContext(MessageContext)
  if (!value) throw new Error("pinwego mesaj sağlayıcısı bulunamadı")
  return value
}
