import type { Metadata } from "next"
import { Suspense } from "react"
import { SearchScreen } from "@/components/directory/search-screen"

export const metadata: Metadata = {
  title: "Arama",
  description: "Şehir, kategori, puan ve fiyat süzgeciyle işletme ara.",
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="h-12 animate-pulse rounded-3xl bg-foreground/5" />
        </div>
      }
    >
      <SearchScreen />
    </Suspense>
  )
}
