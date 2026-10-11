type Role = "musteri" | "isletme" | "admin"

export function normalizeEmail(value: string) {
  return value.trim().normalize("NFKC").replace(/\u0130/g, "I").replace(/\u0307/g, "").toLowerCase()
}

export function sameEmail(stored: string, input: string) {
  if (stored === input.trim().toLowerCase()) return true
  return normalizeEmail(stored) === normalizeEmail(input)
}

export async function digestPassword(email: string, password: string) {
  const data = new TextEncoder().encode(`${email}\0${password}`)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function passwordMatches(email: string, passwordHash: string, password: string) {
  if ((await digestPassword(email, password)) === passwordHash) return true
  const trimmed = password.trim()
  if (trimmed !== password && (await digestPassword(email, trimmed)) === passwordHash) return true
  return false
}

export function safeReturnPath(value: string | null) {
  if (!value) return null
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("://")) return null
  if (value.startsWith("/hesap") || value.startsWith("/yonetim")) return null
  return value
}

export function destinationFor(role: Role, claimSlug: string | null, returnPath: string | null) {
  if (claimSlug && (role === "isletme" || role === "admin")) return `/isletme/${claimSlug}`
  if (role === "admin") return "/yonetim"
  if (role === "isletme") return returnPath && returnPath.startsWith("/panel") ? returnPath : "/panel"
  return safeReturnPath(returnPath) ?? "/"
}

export function withReturn(path: string, current: string) {
  const back = safeReturnPath(current)
  if (!back || back === "/") return path
  const [base, query = ""] = path.split("?")
  const params = new URLSearchParams(query)
  params.set("donus", back)
  return `${base}?${params.toString()}`
}

export function submittedField(form: HTMLFormElement | null, name: string, id: string, state: string) {
  if (form) {
    const raw = new FormData(form).get(name)
    if (typeof raw === "string" && raw.length > 0) return raw
  }
  if (typeof document !== "undefined") {
    const element = document.getElementById(id)
    if (element instanceof HTMLInputElement && element.value.length > 0) return element.value
  }
  return state
}

export function canonicalRedirectUrl(hostHeader: string | null, pathAndQuery: string) {
  const host = hostHeader?.split(",")[0]?.trim().split(":")[0]?.toLowerCase()
  if (host !== "www.pinwego.com") return null
  if (!pathAndQuery.startsWith("/") || pathAndQuery.startsWith("//")) return null
  return `https://pinwego.com${pathAndQuery}`
}
