import { loginDoorProblem, type AuthDoor } from "@/lib/auth-path"
import { digestPassword, normalizeEmail, passwordMatches, sameEmail } from "@/lib/auth-session"
import { fileProblem } from "@/lib/identity"

export type Role = "musteri" | "isletme" | "admin"

const legacyAdminHash = "a502141c77771259d7a0471270828e7b4dc7ba13a24669bf18f3f2b34b80933f"
const adminSessionId = "admin-session"

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
    nationalId?: string
    birthDate: string
    firstName?: string
    lastName?: string
    occupation?: string
  }
  business?: {
    owner: string
    taxId: string
    taxOffice: string
    city: string
    address: string
  }
  emailVerified?: boolean
  credentialVersion?: number
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

function keptAccounts(accounts: Account[]) {
  return accounts.filter((item) => {
    if (item.id === "admin-pinwego" || item.email === "admin@pinwego.local") return false
    if (item.passwordHash === legacyAdminHash) return false
    if (item.role === "admin" && item.id !== adminSessionId) return false
    return true
  })
}

function storeAccounts(accounts: Account[]) {
  const next = keptAccounts(accounts)
  if (next.length !== accounts.length) writeAccounts(next)
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
  const accounts = storeAccounts(read)
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
  emailVerified?: boolean
  credentialVersion?: number
}

type RemoteResult =
  | { ok: true; account: RemoteAccount; mail?: string }
  | { ok: false; reason: string; role?: "musteri" | "isletme"; mail?: string }
  | null

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
  turnstile?: string
  locale?: string
  acceptTerms?: boolean
  marketing?: boolean
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
    turnstile: input.turnstile,
    locale: input.locale,
    acceptTerms: input.acceptTerms === true,
    marketing: input.marketing === true,
  }
}

export type AuthNotice = { pending: string; mail?: string } | { code: string }

export async function registerAccount(input: {
  role: Exclude<Role, "admin">
  email: string
  password: string
  name: string
  phone: string
  uploads: Upload[]
  customer?: Account["customer"]
  business?: Account["business"]
  turnstile?: string
  locale?: string
  acceptTerms?: boolean
  marketing?: boolean
}): Promise<string | AuthNotice | null> {
  const email = normalizeEmail(input.email)
  const accounts = readAccounts() ?? []
  const duplicate = input.role === "musteri" ? "Bu bilgilerle kayıt açılamadı. Giriş yapmayı dene." : "Bu e-posta ile bir kayıt var. Giriş yap."
  if (accounts.some((item) => sameEmail(item.email, email))) return duplicate
  const remote = await postAccount("/api/kayit", accountBody({ ...input, email }))
  if (remote?.ok === false && remote.reason === "exists") return duplicate
  if (remote?.ok === false && remote.reason === "sozlesme") return "Üyelik sözleşmesini onaylamadan kayıt açılmaz."
  if (remote?.ok === false && remote.reason === "invalid") return "Kayıt bilgisi kabul edilmedi."
  if (remote?.ok === false && remote.reason === "challenge") return "Doğrulama tamamlanmadı. Yeniden dene."
  if (remote?.ok === false && remote.reason === "limited") return "Çok fazla deneme. Bir süre sonra tekrar dene."
  if (remote?.ok === false) return "Kayıt şu an tamamlanamadı."
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
    emailVerified: remote?.ok ? remote.account.emailVerified !== false : true,
    credentialVersion: remote?.ok ? remote.account.credentialVersion ?? 1 : 1,
  }
  writeAccounts(keptAccounts([account, ...accounts]))
  if (remote?.ok && remote.account.emailVerified === false) return { pending: email, mail: remote.mail === "failed" ? "failed" : undefined }
  enter(account)
  return null
}

export async function previewLogin(email: string, password: string): Promise<Account | string> {
  const accounts = readAccounts()
  const account = accounts?.find((item) => sameEmail(item.email, email))
  if (!account || account.role === "admin") return "E-posta veya şifre eşleşmedi."
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
    emailVerified: account.emailVerified !== false,
    credentialVersion: account.credentialVersion ?? 1,
  }
  const rest = (readAccounts() ?? []).filter((item) => item.id !== next.id && !sameEmail(item.email, email))
  writeAccounts(keptAccounts([next, ...rest]))
  enter(next)
}

async function postAdmin(path: string, body: unknown) {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    })
    const data = (await response.json().catch(() => null)) as { ok?: boolean; step?: string; reason?: string } | null
    return { status: response.status, data }
  } catch {
    return { status: 0, data: null }
  }
}

function adminFailure(status: number, reason?: string) {
  if (status === 0 || status === 503 || reason === "unavailable") return "Yönetici girişi şu an kapalı."
  if (reason === "limited") return "Çok fazla deneme. Bir süre sonra tekrar dene."
  if (reason === "expired") return "Kodun süresi doldu. Şifreyi yeniden yaz."
  return "E-posta veya şifre eşleşmedi."
}

export async function confirmAdminCode(code: string) {
  const { status, data } = await postAdmin("/api/yonetici/kod", { code })
  if (!data?.ok) {
    if (data?.reason === "invalid" || data?.reason === "expired") {
      return data.reason === "expired" ? "Kodun süresi doldu. Şifreyi yeniden yaz." : "Kod eşleşmedi."
    }
    return adminFailure(status, data?.reason)
  }
  const marker: Account = {
    id: adminSessionId,
    role: "admin",
    email: "yonetici@pinwego.local",
    passwordHash: "",
    createdAt: new Date().toISOString(),
    name: "pinwego yönetici",
    phone: "",
    documents: [],
  }
  const rest = keptAccounts(readAccounts() ?? []).filter((item) => item.id !== marker.id)
  writeAccounts([marker, ...rest])
  enter(marker)
  return null
}

export async function login(email: string, password: string, door?: AuthDoor, extra?: { turnstile?: string; locale?: string }): Promise<string | AuthNotice | null> {
  if (door === "yonetici") {
    const { status, data } = await postAdmin("/api/yonetici", { email, password, locale: extra?.locale })
    if (data?.ok && data.step === "code") return { code: "sent" }
    if (data?.reason === "mismatch" || data?.reason === "invalid") return "E-posta veya şifre eşleşmedi."
    return adminFailure(status, data?.reason)
  }
  const remote = await postAccount("/api/giris", { email, password, turnstile: extra?.turnstile, locale: extra?.locale })
  if (remote?.ok) {
    const problem = door ? loginDoorProblem(door, remote.account.role) : null
    if (problem) return problem
    await cacheRemote(remote.account, password)
    return null
  }
  if (remote?.ok === false && remote.reason === "limited") return "Çok fazla deneme. Bir süre sonra tekrar dene."
  if (remote?.ok === false && remote.reason === "askida") return "Hesap askıya alındı. destek@pinwego.com adresine yaz."
  if (remote?.ok === false && remote.reason === "silindi") return "Bu hesap kapatılmış."
  if (remote?.ok === false && remote.reason === "unverified") {
    const problem = door && remote.role ? loginDoorProblem(door, remote.role) : null
    if (problem) return problem
    return { pending: normalizeEmail(email) }
  }
  if (remote?.ok === false && remote.reason === "mismatch") return "E-posta veya şifre eşleşmedi."
  const local = await previewLogin(email, password)
  if (typeof local === "string") return "E-posta veya şifre eşleşmedi."
  const problem = door ? loginDoorProblem(door, local.role) : null
  if (problem) return problem
  if (remote?.ok === false && remote.reason === "unknown" && local.role !== "admin") {
    enter(local)
    return null
  }
  enter(local)
  return null
}

export async function confirmSession() {
  const account = getSnapshot().account
  if (!account) return false
  if (account.role === "admin") {
    try {
      const response = await fetch("/api/yonetici", { credentials: "include" })
      return response.status === 401
    } catch {
      return false
    }
  }
  const remote = await postAccount("/api/oturum", { email: account.email, credentialVersion: account.credentialVersion ?? 1 })
  if (!remote) return false
  return remote.ok === false
}

export function retireLocal(email: string) {
  const read = readAccounts()
  if (!read) return
  writeAccounts(read.map((item) => (sameEmail(item.email, email) ? { ...item, passwordHash: "" } : item)))
}

export function logout() {
  void fetch("/api/yonetici", { method: "DELETE", credentials: "include" }).catch(() => undefined)
  writeSessionId(null)
  const read = readAccounts()
  memory = { ready: true, account: null, accounts: read ? storeAccounts(read) : [] }
  loaded = true
  notify()
}

export function removeAccount(id: string) {
  const current = getSnapshot()
  if (current.account?.id === id) return "Oturumdaki hesabı silemezsin."
  const read = readAccounts()
  if (!read) return "Hesap bulunamadı."
  const accounts = storeAccounts(read)
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
