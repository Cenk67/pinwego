import type { Metadata } from "next"
import { Suspense } from "react"
import { DiscoverScreen } from "@/components/discover/discover-screen"

export const metadata: Metadata = {
  title: "Keşif",
  robots: { index: false, follow: true },
}

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-16"><div className="h-40 animate-pulse rounded-3xl bg-foreground/5" /></div>}>
      <DiscoverScreen />
    </Suspense>
  )
}
