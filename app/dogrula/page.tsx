import type { Metadata } from "next"
import { Suspense } from "react"
import { VerifyScreen } from "@/components/auth/verify-screen"

export const metadata: Metadata = {
  title: "E-posta doğrulama",
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg px-4 py-16 text-sm text-muted-foreground">Bağlantı kontrol ediliyor</div>}>
      <VerifyScreen />
    </Suspense>
  )
}
