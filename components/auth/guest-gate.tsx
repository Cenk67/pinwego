"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { createContext, useCallback, useContext, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"

const COPY =
  "Misafir olarak işletmeleri izleyebilirsin. Telefon, site, yol tarifi, randevu, mesaj, kayıt ve talep için müşteri kaydı gerekir."

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
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <p className="text-sm font-medium text-primary">Misafir</p>
      <h1 className="mt-2 font-heading text-4xl text-balance">Bu özellik müşteri kaydı ister.</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{COPY}</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button className="h-11 rounded-xl" nativeButton={false} render={<Link href="/hesap?kayit=musteri" />}>
          Müşteri kaydı oluşturun
        </Button>
        <Button variant="outline" className="h-11 rounded-xl" nativeButton={false} render={<Link href="/" />}>
          İzlemeye dön
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
            <DialogTitle className="font-heading text-2xl">Misafir izleme</DialogTitle>
            <DialogDescription className="leading-6">{COPY}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setOpen(false)}>
              İzlemeye devam
            </Button>
            <Button
              type="button"
              className="h-11 rounded-xl"
              onClick={() => {
                setOpen(false)
                router.push("/hesap?kayit=musteri")
              }}
            >
              Müşteri kaydı oluşturun
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </GuestGateContext.Provider>
  )
}
