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
  const { account, logout } = useAuth()
  const { listings, addListing } = useDirectory()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  if (business.source !== "google") return null
  const claimed = listings.some((item) => item.slug === business.slug)

  if (claimed) {
    return <p className="text-sm text-primary">Bu işletme pinwego kaydına alındı.</p>
  }

  function accept() {
    if (account?.role === "isletme") {
      addListing(claimListing(business, account.id))
      adoptListingThreads(business.id, account.id)
      setOpen(false)
      router.push(`/isletme/${business.slug}`)
      return
    }
    sessionStorage.setItem(CLAIM_KEY, business.slug)
    setOpen(false)
    logout()
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
            {business.name} Google Haritalar bağlantılı bir Zonguldak kaydı. Sana aitse sahiplen. Kabul edersen bu ad,
            adres ve telefon pinwego işletme kaydına yazılır.
            {account?.role === "isletme"
              ? " İşletme hesabın açık; kayıt bu tarayıcıya eklenir."
              : " İşletme hesabın yok. Kabul edince vergi levhası, imza sirküleri, sicil belgesi ve yetkili kimliği istenir."}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button type="button" className="h-11 rounded-xl" onClick={accept}>
              {account?.role === "isletme" ? "Kabul et, kaydı al" : "Kabul et, işletme kaydını aç"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
