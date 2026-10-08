"use client"

import { FileText } from "lucide-react"
import { useEffect, useState } from "react"
import { openChatAttachment } from "@/lib/chat-files"
import type { ChatAttachment } from "@/lib/types"
import { cn } from "cn"

export function ChatAttachmentView({ attachment, mine }: { attachment: ChatAttachment; mine: boolean }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    let current = ""
    openChatAttachment(attachment.id)
      .then((next) => {
        if (!active) {
          if (next) URL.revokeObjectURL(next)
          return
        }
        if (!next) {
          setFailed(true)
          return
        }
        current = next
        setUrl(next)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
      if (current) URL.revokeObjectURL(current)
    }
  }, [attachment.id])

  if (failed) {
    return <p className="text-xs opacity-80">{attachment.name} açılamadı.</p>
  }
  if (!url) {
    return <p className="text-xs opacity-80">{attachment.name}</p>
  }
  if (attachment.kind === "image") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 block">
        {/* Blob from this browser’s chat file store; next/image cannot size it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={attachment.name} className="max-h-48 max-w-full rounded-xl object-cover" />
      </a>
    )
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "mt-1 flex items-center gap-2 rounded-xl px-2 py-2 text-xs",
        mine ? "bg-primary-foreground/15" : "bg-background",
      )}
    >
      <FileText className="size-4 shrink-0" />
      <span className="min-w-0 truncate">{attachment.name}</span>
    </a>
  )
}
