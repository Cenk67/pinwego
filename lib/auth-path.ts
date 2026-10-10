import type { Role } from "@/lib/auth-store"

export type AuthMode = "choose" | "login" | "admin" | "musteri" | "isletme"
export type AuthDoor = "musteri" | "isletme" | "yonetici"

export function authMode(kayit: string | null): AuthMode {
  if (kayit === "musteri") return "musteri"
  if (kayit === "isletme") return "isletme"
  if (kayit === "giris") return "login"
  if (kayit === "yonetici") return "admin"
  return "choose"
}

export function authDoor(kapi: string | null, mode: AuthMode): AuthDoor {
  if (mode === "admin" || kapi === "yonetici") return "yonetici"
  if (kapi === "isletme") return "isletme"
  return "musteri"
}

export function loginDoorProblem(door: AuthDoor, role: Role) {
  if (door === "yonetici" && role !== "admin") return "Bu giriş yalnızca yönetici hesabı içindir."
  if (door === "isletme" && role !== "isletme" && role !== "admin") {
    return "Bu e-posta müşteri hesabı. İşletme girişi için işletme kaydı gerekir."
  }
  if (door === "musteri" && role !== "musteri") {
    return "Bu e-posta müşteri hesabı değil. İşletme veya yönetici girişini kullan."
  }
  return null
}
