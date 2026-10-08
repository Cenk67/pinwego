import { fileProblem } from "@/lib/identity"

export type Role = "musteri" | "isletme"

export type AccountDocument = {
  id: string
  label: string
  name: string
  type: string
  size: number
}

export type Account = {
  id: string
  role: Role
  email: string
  passwordHash: string
  createdAt: string
  name: string
  phone: string
  documents: AccountDocument[]
  customer?: {
    nationalId: string
    birthDate: string
  }
  business?: {
    owner: string
    taxId: string
    taxOffice: string
    city: string
    address: string
  }
}

export type Upload = {
  label: string
  file: File
}

type Snapshot = {
  ready: boolean
  account: Account | null
}

const ACCOUNTS_KEY = "pinwego.accounts.v1"
const SESSION_KEY = "pinwego.session.v1"

const loggedOut: Snapshot = { ready: false, account: null }
let memory: Snapshot = loggedOut
let loaded = false
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

function readAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as Account[]
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function writeAccounts(accounts: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

function load(): Snapshot {
  const accounts = readAccounts()
  const id = localStorage.getItem(SESSION_KEY)
  const account = accounts.find((item) => item.id === id) ?? null
  if (!account) localStorage.removeItem(SESSION_KEY)
  return { ready: true, account }
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot() {
  if (!loaded) {
    loaded = true
    memory = load()
  }
  return memory
}

export function getServerSnapshot(): Snapshot {
  return loggedOut
}

async function hashPassword(email: string, password: string) {
  const data = new TextEncoder().encode(`${email}\0${password}`)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function openFiles() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("pinwego-files", 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore("files")
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function storeFiles(accountId: string, uploads: Upload[]) {
  const documents: AccountDocument[] = []
  const records: { id: string; accountId: string; buffer: ArrayBuffer; type: string; name: string }[] = []
  for (const upload of uploads) {
    const problem = fileProblem(upload.file)
    if (problem) throw new Error(problem)
    const id = crypto.randomUUID()
    documents.push({
      id,
      label: upload.label,
      name: upload.file.name,
      type: upload.file.type || "application/octet-stream",
      size: upload.file.size,
    })
    records.push({
      id,
      accountId,
      buffer: await upload.file.arrayBuffer(),
      type: upload.file.type || "application/octet-stream",
      name: upload.file.name,
    })
  }
  const db = await openFiles()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("files", "readwrite")
    const store = tx.objectStore("files")
    for (const record of records) store.put(record, record.id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  return documents
}

export async function openDocument(account: Account, documentId: string) {
  const owned = account.documents.some((item) => item.id === documentId)
  if (!owned) return null
  const db = await openFiles()
  const record = await new Promise<{ buffer: ArrayBuffer; type: string; name: string; accountId: string } | null>(
    (resolve, reject) => {
      const tx = db.transaction("files", "readonly")
      const request = tx.objectStore("files").get(documentId)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    },
  )
  db.close()
  if (!record || record.accountId !== account.id) return null
  return URL.createObjectURL(new Blob([record.buffer], { type: record.type }))
}

function enter(account: Account) {
  localStorage.setItem(SESSION_KEY, account.id)
  memory = { ready: true, account }
  loaded = true
  notify()
}

export async function registerAccount(input: {
  role: Role
  email: string
  password: string
  name: string
  phone: string
  uploads: Upload[]
  customer?: Account["customer"]
  business?: Account["business"]
}) {
  const email = input.email.trim().toLowerCase()
  const accounts = readAccounts()
  if (accounts.some((item) => item.email === email)) {
    return "Bu e-posta ile bir kayıt var. Giriş yap."
  }
  const id = crypto.randomUUID()
  const documents = await storeFiles(id, input.uploads)
  const account: Account = {
    id,
    role: input.role,
    email,
    passwordHash: await hashPassword(email, input.password),
    createdAt: new Date().toISOString(),
    name: input.name.trim(),
    phone: input.phone.trim(),
    documents,
    customer: input.customer,
    business: input.business,
  }
  writeAccounts([account, ...accounts])
  enter(account)
  return null
}

export async function login(email: string, password: string) {
  const normalized = email.trim().toLowerCase()
  const account = readAccounts().find((item) => item.email === normalized)
  if (!account) return "E-posta veya şifre eşleşmedi."
  const hash = await hashPassword(normalized, password)
  if (hash !== account.passwordHash) return "E-posta veya şifre eşleşmedi."
  enter(account)
  return null
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
  memory = { ready: true, account: null }
  loaded = true
  notify()
}
