import type { Metadata } from "next"
import { Suspense } from "react"
import { ResetScreen } from "@/components/auth/reset-screen"

export const metadata: Metadata = {
  title: "Şifre",
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg px-4 py-16 text-sm text-muted-foreground">Şifre ekranı açılıyor</div>}>
      <ResetScreen siteKey={process.env.TURNSTILE_SITE_KEY ?? ""} />
    </Suspense>
  )
}
