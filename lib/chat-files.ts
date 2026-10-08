import type { ChatAttachment } from "./types"

export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024
export const MAX_ATTACHMENTS = 4

export type ClassifiedAttachment = { kind: "image" | "pdf"; type: string }

const IMAGE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
}

const ALLOWED_TYPES = new Set([...Object.values(IMAGE_TYPES), "application/pdf"])

export function attachmentExtension(name: string) {
  const match = /\.([a-z0-9]+)$/i.exec(name.trim())
  return match ? match[1].toLowerCase() : ""
}

export function classifyAttachment(file: { name: string; type: string; size: number }): ClassifiedAttachment | string {
  if (file.size <= 0) return "Dosya boş."
  if (file.size > MAX_ATTACHMENT_BYTES) return "Ek 4 MB’den büyük."
  const extension = attachmentExtension(file.name)
  const declared = file.type.trim().toLowerCase()
  if (extension === "pdf") {
    if (declared && declared !== "application/pdf") return "PDF dosyasının türü uyuşmuyor."
    return { kind: "pdf", type: "application/pdf" }
  }
  const imageType = IMAGE_TYPES[extension]
  if (!imageType) return "Yalnızca görsel (JPG, PNG, WEBP, GIF) veya PDF eklenebilir."
  if (declared && declared !== imageType && !(extension === "jpg" && declared === "image/jpg")) {
    return "Görselin türü uyuşmuyor."
  }
  return { kind: "image", type: imageType }
}

export function isChatAttachment(value: unknown): value is ChatAttachment {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<ChatAttachment>
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.name === "string" &&
    item.name.length > 0 &&
    typeof item.type === "string" &&
    ALLOWED_TYPES.has(item.type) &&
    typeof item.size === "number" &&
    item.size > 0 &&
    item.size <= MAX_ATTACHMENT_BYTES &&
    (item.kind === "image" || item.kind === "pdf") &&
    (item.kind === "pdf" ? item.type === "application/pdf" : item.type.startsWith("image/"))
  )
}

type StoredFile = {
  id: string
  name: string
  type: string
  size: number
  kind: "image" | "pdf"
  buffer: ArrayBuffer
}

function openChatFiles() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("pinwego-chat-files", 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("files")) request.result.createObjectStore("files")
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function storeChatAttachment(file: File): Promise<ChatAttachment> {
  const classified = classifyAttachment(file)
  if (typeof classified === "string") throw new Error(classified)
  const attachment: ChatAttachment = {
    id: crypto.randomUUID(),
    name: file.name.trim() || (classified.kind === "pdf" ? "dosya.pdf" : "gorsel"),
    type: classified.type,
    size: file.size,
    kind: classified.kind,
  }
  const record: StoredFile = { ...attachment, buffer: await file.arrayBuffer() }
  const db = await openChatFiles()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("files", "readwrite")
    tx.objectStore("files").put(record, record.id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  return attachment
}

export async function openChatAttachment(id: string) {
  const db = await openChatFiles()
  const record = await new Promise<StoredFile | null>((resolve, reject) => {
    const request = db.transaction("files", "readonly").objectStore("files").get(id)
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
  })
  db.close()
  if (!record || !isChatAttachment(record)) return null
  return URL.createObjectURL(new Blob([record.buffer], { type: record.type }))
}
