import type { Metadata } from "next"
import { Suspense } from "react"
import { InboxScreen } from "@/components/messages/inbox-screen"

export const metadata: Metadata = {
  title: "Mesajlar",
  description: "Müşteri ve işletmeler pinwego içinde birbirine yazar.",
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
      <InboxScreen />
    </Suspense>
  )
}
