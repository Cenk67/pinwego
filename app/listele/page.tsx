import type { Metadata } from "next"
import { Suspense } from "react"
import { ListScreen } from "@/components/directory/list-screen"

export const metadata: Metadata = {
  title: "İşletme ekle",
  description: "Ücretsiz işletme kaydı oluştur.",
}

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-xl px-4 py-16"><div className="h-40 animate-pulse rounded-3xl bg-foreground/5" /></div>}>
      <ListScreen />
    </Suspense>
  )
}
