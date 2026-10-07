import { Suspense } from "react"
import { SearchClient } from "./search-client"

export const instant = false

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-16 text-muted-foreground">
          Sonuçlar hazırlanıyor…
        </div>
      }
    >
      <SearchClient />
    </Suspense>
  )
}
