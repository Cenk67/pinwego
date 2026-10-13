import { loginDoorProblem, type AuthDoor } from "@/lib/auth-path"
import { digestPassword, normalizeEmail, passwordMatches, sameEmail } from "@/lib/auth-session"
import { fileProblem } from "@/lib/identity"

export type Role = "musteri" | "isletme" | "admin"

export const ADMIN_EMAIL = "admin@pinwego.local"
export const ADMIN_PASSWORD = "pinwego-admin"
const ADMIN_PASSWORD_HASH = "a502141c77771259d7a0471270828e7b4dc7ba13a24669bf18f3f2b34b80933f"

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
  accounts: Account[]
}

const ACCOUNTS_KEY = "pinwego.accounts.v1"
const SESSION_KEY = "pinwego.session.v1"

const loggedOut: Snapshot = { ready: false, account: null, accounts: [] }

const seededAdmin: Account = {
  id: "admin-pinwego",
  role: "admin",
  email: ADMIN_EMAIL,
  passwordHash: ADMIN_PASSWORD_HASH,
  createdAt: "2026-01-01T00:00:00.000Z",
  name: "pinwego yönetici",
  phone: "05000000000",
  documents: [],
}

function ensureAdmin(accounts: Account[]) {
  if (accounts.some((item) => item.role === "admin")) return accounts
  const next = [seededAdmin, ...accounts.filter((item) => item.email !== ADMIN_EMAIL)]
  writeAccounts(next)
  return next
}
let memory: Snapshot = loggedOut
let loaded = false
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

function readAccounts(): Account[] | null {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as Account[]
    return Array.isArray(data) ? data : null
  } catch {
    return null
  }
}

function writeAccounts(accounts: Account[]) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
  } catch {
    // The browser quota can fill. The server copy still opens the next sign-in.
  }
}

function readSessionId() {
  try {
    return localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)
  } catch {
    try {
      return sessionStorage.getItem(SESSION_KEY)
    } catch {
      return null
    }
  }
}

function writeSessionId(id: string | null) {
  for (const store of [localStorage, sessionStorage]) {
    try {
      if (id) store.setItem(SESSION_KEY, id)
      else store.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
  }
}

function load(): Snapshot {
  const read = readAccounts()
  if (!read) return { ready: true, account: null, accounts: [] }
  const accounts = ensureAdmin(read)
  const id = readSessionId()
  const account = accounts.find((item) => item.id === id) ?? null
  if (!account) writeSessionId(null)
  else writeSessionId(account.id)
  return { ready: true, account, accounts }
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
  writeSessionId(account.id)
  memory = { ready: true, account, accounts: readAccounts() ?? [account] }
  loaded = true
  notify()
}

type RemoteAccount = {
  id: string
  role: Exclude<Role, "admin">
  email: string
  name: string
  phone: string
  createdAt: string
  customer?: Account["customer"]
  business?: Account["business"]
}

type RemoteResult = { ok: true; account: RemoteAccount } | { ok: false; reason: string } | null

async function postAccount(path: string, body: unknown): Promise<RemoteResult> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    if (response.status === 503 || response.status === 429) return null
    const data = (await response.json()) as RemoteResult
    if (!data || typeof data !== "object" || !("ok" in data)) return null
    return data
  } catch {
    return null
  }
}

function accountBody(input: {
  id?: string
  role: Exclude<Role, "admin">
  email: string
  password: string
  name: string
  phone: string
  customer?: Account["customer"]
  business?: Account["business"]
}) {
  return {
    id: input.id,
    role: input.role,
    email: input.email,
    password: input.password,
    name: input.name,
    phone: input.phone,
    customer: input.customer,
    business: input.business,
  }
}

export async function registerAccount(input: {
  role: Exclude<Role, "admin">
  email: string
  password: string
  name: string
  phone: string
  uploads: Upload[]
  customer?: Account["customer"]
  business?: Account["business"]
}) {
  const email = normalizeEmail(input.email)
  const accounts = readAccounts() ?? []
  if (accounts.some((item) => sameEmail(item.email, email))) {
    return "Bu e-posta ile bir kayıt var. Giriş yap."
  }
  const remote = await postAccount("/api/kayit", accountBody({ ...input, email }))
  if (remote?.ok === false && remote.reason === "exists") return "Bu e-posta ile bir kayıt var. Giriş yap."
  if (remote?.ok === false && remote.reason === "invalid") return "Kayıt bilgisi kabul edilmedi."
  const id = remote?.ok ? remote.account.id : crypto.randomUUID()
  const documents = await storeFiles(id, input.uploads)
  const account: Account = {
    id,
    role: input.role,
    email,
    passwordHash: await digestPassword(email, input.password),
    createdAt: remote?.ok ? remote.account.createdAt : new Date().toISOString(),
    name: input.name.trim(),
    phone: input.phone.trim(),
    documents,
    customer: input.customer,
    business: input.business,
  }
  writeAccounts(ensureAdmin([account, ...accounts]))
  enter(account)
  return null
}

export async function previewLogin(email: string, password: string): Promise<Account | string> {
  const accounts = readAccounts()
  const account = accounts?.find((item) => sameEmail(item.email, email))
  if (!account) return "E-posta veya şifre eşleşmedi."
  if (!(await passwordMatches(account.email, account.passwordHash, password))) {
    return "E-posta veya şifre eşleşmedi."
  }
  return account
}

async function cacheRemote(account: RemoteAccount, password: string) {
  const email = normalizeEmail(account.email)
  const prior = readAccounts()?.find((item) => sameEmail(item.email, email))
  const next: Account = {
    id: account.id,
    role: account.role,
    email,
    passwordHash: await digestPassword(email, password.trim() || password),
    createdAt: account.createdAt,
    name: account.name,
    phone: account.phone,
    documents: prior?.documents ?? [],
    customer: account.customer,
    business: account.business,
  }
  const rest = (readAccounts() ?? []).filter((item) => item.id !== next.id && !sameEmail(item.email, email))
  writeAccounts(ensureAdmin([next, ...rest]))
  enter(next)
}

export async function login(email: string, password: string, door?: AuthDoor) {
  const remote = await postAccount("/api/giris", { email, password })
  if (remote?.ok) {
    const problem = door ? loginDoorProblem(door, remote.account.role) : null
    if (problem) return problem
    await cacheRemote(remote.account, password)
    return null
  }
  if (remote?.ok === false && remote.reason === "mismatch") return "E-posta veya şifre eşleşmedi."
  const local = await previewLogin(email, password)
  if (typeof local === "string") return "E-posta veya şifre eşleşmedi."
  const problem = door ? loginDoorProblem(door, local.role) : null
  if (problem) return problem
  if (remote?.ok === false && remote.reason === "unknown" && local.role !== "admin") {
    await postAccount("/api/kayit", accountBody({
      id: local.id,
      role: local.role === "isletme" ? "isletme" : "musteri",
      email: local.email,
      password,
      name: local.name,
      phone: local.phone,
      customer: local.customer,
      business: local.business,
    }))
  }
  enter(local)
  return null
}

export function logout() {
  writeSessionId(null)
  const read = readAccounts()
  memory = { ready: true, account: null, accounts: read ? ensureAdmin(read) : [] }
  loaded = true
  notify()
}

export function removeAccount(id: string) {
  const current = getSnapshot()
  if (current.account?.id === id) return "Oturumdaki hesabı silemezsin."
  const read = readAccounts()
  if (!read) return "Hesap bulunamadı."
  const accounts = ensureAdmin(read)
  const target = accounts.find((item) => item.id === id)
  if (!target) return "Hesap bulunamadı."
  if (target.role === "admin" && accounts.filter((item) => item.role === "admin").length < 2) {
    return "Son yönetici hesabı silinemez."
  }
  const next = accounts.filter((item) => item.id !== id)
  writeAccounts(next)
  memory = { ...current, accounts: next, ready: true }
  loaded = true
  notify()
  return null
}

export async function openStoredDocument(documentId: string) {
  const db = await openFiles()
  const record = await new Promise<{ buffer: ArrayBuffer; type: string; name: string } | null>(
    (resolve, reject) => {
      const tx = db.transaction("files", "readonly")
      const request = tx.objectStore("files").get(documentId)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    },
  )
  db.close()
  if (!record) return null
  return URL.createObjectURL(new Blob([record.buffer], { type: record.type }))
}
