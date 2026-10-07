"use client"

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react"
import { getServerSnapshot, getSnapshot, login, logout, registerAccount, subscribe } from "@/lib/auth-store"

type AuthState = {
  ready: boolean
  account: ReturnType<typeof getSnapshot>["account"]
  registerAccount: typeof registerAccount
  login: typeof login
  logout: typeof logout
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const value = useMemo<AuthState>(
    () => ({
      ready: snapshot.ready,
      account: snapshot.account,
      registerAccount,
      login,
      logout,
    }),
    [snapshot],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error("Pinora hesap sağlayıcısı bulunamadı")
  return value
}
