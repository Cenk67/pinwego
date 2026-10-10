"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { CLAIM_KEY, claimListing } from "@/lib/claim"
import { useDirectory } from "@/lib/directory-context"
import { adoptListingThreads } from "@/lib/message-store"
import type { Business } from "@/lib/types"

export function ClaimPrompt({ business }: { business: Business }) {
  const { account } = useAuth()
  const { listings, addListing } = useDirectory()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  if (business.source !== "google") return null
  const claimed = listings.some((item) => item.slug === business.slug)

  if (claimed) {
    return <p className="text-sm text-primary">Bu işletme pinwego kaydına alındı.</p>
  }

  function remember() {
    sessionStorage.setItem(CLAIM_KEY, business.slug)
    setOpen(false)
  }

  function accept() {
    if (account?.role === "isletme" || account?.role === "admin") {
      addListing(claimListing(business, account.id))
      adoptListingThreads(business.id, account.id)
      setOpen(false)
      router.push(`/isletme/${business.slug}`)
      return
    }
    remember()
    router.push("/hesap?kayit=isletme")
  }

  function enterBusiness() {
    remember()
    router.push("/hesap?kayit=giris&kapi=isletme")
  }

  return (
    <div className="grid gap-2 rounded-2xl bg-secondary/70 px-3 py-3">
      <p className="text-sm font-medium">İşletme senin mi?</p>
      <Button type="button" variant="outline" className="h-10 rounded-xl bg-card" onClick={() => setOpen(true)}>
        İşletmeyi sahiplen
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">İşletme senin mi?</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-6 text-muted-foreground">
            {business.name} için işletme hesabı gerekir. Kayıtlı işletme hesabın varsa giriş yap. İlk kez
            sahipleniyorsan vergi levhası, imza sirküleri, sicil belgesi ve yetkili kimliğiyle işletme kaydı aç.
            {account?.role === "isletme" || account?.role === "admin"
              ? " Hesabın açık; kabul edince kayıt bu tarayıcıya yazılır."
              : ""}
          </p>
          <div className="grid gap-2">
            {account?.role === "isletme" || account?.role === "admin" ? (
              <Button type="button" className="h-11 rounded-xl" onClick={accept}>
                Kabul et, kaydı al
              </Button>
            ) : (
              <>
                <Button type="button" className="h-11 rounded-xl" onClick={accept}>
                  İşletme kaydı
                </Button>
                <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={enterBusiness}>
                  İşletme girişi
                </Button>
              </>
            )}
            <Button type="button" variant="ghost" className="h-11 rounded-xl" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
