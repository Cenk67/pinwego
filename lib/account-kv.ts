import type { AccountStore } from "@/lib/account-record"

type Row = { value: string; exp?: number }
type Memory = Map<string, Row>

function memoryStore(): AccountStore {
  const holder = globalThis as typeof globalThis & { __pinwegoAccounts?: Memory }
  if (!holder.__pinwegoAccounts) holder.__pinwegoAccounts = new Map()
  const memory = holder.__pinwegoAccounts
  return {
    async get(key) {
      const row = memory.get(key)
      if (!row) return null
      if (row.exp && row.exp <= Date.now()) {
        memory.delete(key)
        return null
      }
      return row.value
    },
    async put(key, value, options) {
      const ttl = options?.expirationTtl
      memory.set(key, { value, exp: ttl ? Date.now() + ttl * 1000 : undefined })
    },
    async delete(key) {
      memory.delete(key)
    },
  }
}

export async function accountStore(): Promise<AccountStore | null> {
  try {
    const loaded = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "cloudflare:workers")) as {
      env?: { ACCOUNTS?: AccountStore }
    }
    if (loaded.env?.ACCOUNTS) return loaded.env.ACCOUNTS
  } catch {
    // Local Next has no worker binding. Development keeps a process memory store.
  }
  if (process.env.NODE_ENV === "production") return null
  return memoryStore()
}
