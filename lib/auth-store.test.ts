import assert from "node:assert/strict"
import { digestPassword } from "./auth-session"

const local = new Map<string, string>()
const session = new Map<string, string>()
function box(store: Map<string, string>) {
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
}
Object.assign(globalThis, { localStorage: box(local), sessionStorage: box(session) })

const remoteAccount = {
  id: "efd03b96-239d-4c1a-abcc-3db8889ba9f4",
  role: "musteri" as const,
  email: "canli.musteri@pinwego.test",
  name: "Canli Musteri",
  phone: "05551234567",
  createdAt: "2026-10-13T02:07:54.580Z",
  customer: { nationalId: "10000000146", birthDate: "1990-05-05" },
}

globalThis.fetch = async (_input, init) => {
  const body = JSON.parse(String(init?.body ?? "{}")) as { email?: string; password?: string }
  if (body.email === "yerel.musteri@pinwego.test") return new Response("no", { status: 503 })
  if (body.email === remoteAccount.email && body.password === "sifre1234") {
    return Response.json({ ok: true, account: remoteAccount })
  }
  if (body.email === remoteAccount.email) return Response.json({ ok: false, reason: "mismatch" })
  return Response.json({ ok: false, reason: "unknown" })
}

const { getSnapshot, login, logout, previewLogin } = await import("./auth-store")

const opened = await login(remoteAccount.email, "sifre1234", "musteri")
assert.equal(opened, null)
assert.equal(getSnapshot().account?.id, remoteAccount.id)
assert.equal(local.get("pinwego.session.v1"), remoteAccount.id)
logout()
assert.equal(getSnapshot().account, null)

const wrongDoor = await login(remoteAccount.email, "sifre1234", "isletme")
assert.match(wrongDoor ?? "", /müşteri/)
assert.equal(getSnapshot().account, null)
assert.equal(local.get("pinwego.session.v1") ?? null, null)

const mismatch = await login(remoteAccount.email, "yanlis1234", "musteri")
assert.match(mismatch ?? "", /eşleşmedi/)
assert.equal(getSnapshot().account, null)

local.clear()
session.clear()
const onlyLocal = {
  id: "86f797a0-8655-44fa-b964-c1b5bc89160d",
  role: "musteri" as const,
  email: "yerel.musteri@pinwego.test",
  passwordHash: await digestPassword("yerel.musteri@pinwego.test", "sifre1234"),
  createdAt: "2026-10-13T00:00:00.000Z",
  name: "Yerel Musteri",
  phone: "05551234567",
  documents: [],
  customer: { nationalId: "10000000146", birthDate: "1990-05-05" },
}
local.set("pinwego.accounts.v1", JSON.stringify([onlyLocal]))
const offline = await login(onlyLocal.email, "sifre1234", "musteri")
assert.equal(offline, null)
assert.equal(getSnapshot().account?.id, onlyLocal.id)

const legacy = {
  id: "admin-pinwego",
  role: "admin" as const,
  email: "admin@pinwego.local",
  passwordHash: "a502141c77771259d7a0471270828e7b4dc7ba13a24669bf18f3f2b34b80933f",
  createdAt: "2026-01-01T00:00:00.000Z",
  name: "pinwego yönetici",
  phone: "05000000000",
  documents: [],
}
local.set("pinwego.accounts.v1", JSON.stringify([legacy]))
const blocked = await previewLogin(legacy.email, "pinwego-admin")
assert.match(String(blocked), /eşleşmedi/)
logout()
const stored = JSON.parse(local.get("pinwego.accounts.v1") || "[]") as { id: string }[]
assert.equal(stored.some((item) => item.id === "admin-pinwego"), false)
const oldDoor = await login(legacy.email, "pinwego-admin", "yonetici")
assert.match(String(oldDoor), /eşleşmedi|kapalı/)
assert.equal(getSnapshot().account, null)

console.log("giriş sunucudaki hesabı tarayıcı boşken açıyor")
