import type { Metadata } from "next"
import { Suspense } from "react"
import { AccountScreen } from "@/components/auth/account-screen"

export const metadata: Metadata = {
  title: "Hesap",
  description: "Doğrulama bilgileri ve yüklenen belgeler.",
}

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-xl px-4 py-16 text-sm text-muted-foreground">Hesap açılıyor</div>}>
      <AccountScreen />
    </Suspense>
  )
}
