"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createContext, useCallback, useContext, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { customerLoginPath } from "@/lib/auth-path"
import { withReturn } from "@/lib/auth-session"
import { useLocale } from "@/lib/use-locale"

type Gate = {
  member: boolean
  allow: (action: () => void) => void
}

const GuestGateContext = createContext<Gate | null>(null)

export function useGuestGate() {
  const value = useContext(GuestGateContext)
  if (!value) throw new Error("misafir kapısı yok")
  return value
}

export function GuestNotice() {
  const pathname = usePathname()
  const { t } = useLocale()
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <p className="text-sm font-medium text-primary">{t("guest.kicker")}</p>
      <h1 className="mt-2 font-heading text-4xl text-balance">{t("guest.title")}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("guest.copy")}</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button className="h-11 rounded-xl" nativeButton={false} render={<Link href={withReturn(customerLoginPath, pathname)} />}>
          {t("nav.login")}
        </Button>
        <Button variant="outline" className="h-11 rounded-xl" nativeButton={false} render={<Link href={withReturn("/hesap?kayit=musteri", pathname)} />}>
          {t("guest.register")}
        </Button>
        <Button variant="ghost" className="h-11 rounded-xl" nativeButton={false} render={<Link href="/" />}>
          {t("guest.back")}
        </Button>
      </div>
    </div>
  )
}

export function GuestGateProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const member = Boolean(account)
  const { t } = useLocale()
  const allow = useCallback(
    (action: () => void) => {
      if (!account) {
        setOpen(true)
        return
      }
      action()
    },
    [account],
  )

  return (
    <GuestGateContext.Provider value={{ member, allow }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">{t("guest.dialogTitle")}</DialogTitle>
            <DialogDescription className="leading-6">{t("guest.copy")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button
              type="button"
              className="h-11 rounded-xl"
              onClick={() => {
                setOpen(false)
                const current = `${window.location.pathname}${window.location.search}`
                router.push(withReturn(customerLoginPath, current))
              }}
            >
              {t("nav.login")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => {
                setOpen(false)
                const current = `${window.location.pathname}${window.location.search}`
                router.push(withReturn("/hesap?kayit=musteri", current))
              }}
            >
              {t("guest.register")}
            </Button>
            <Button type="button" variant="ghost" className="h-11 rounded-xl" onClick={() => setOpen(false)}>
              {t("guest.back")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </GuestGateContext.Provider>
  )
}
