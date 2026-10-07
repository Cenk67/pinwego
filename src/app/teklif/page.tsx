import { Suspense } from "react"
import { QuoteClient } from "./quote-client"

export const instant = false

export default function Page() {
  return (
    <Suspense>
      <QuoteClient />
    </Suspense>
  )
}
