import type { Metadata } from "next"
import { SavedScreen } from "@/components/directory/saved-screen"

export const metadata: Metadata = {
  title: "Kayıtlılar",
  description: "Kaydettiğin işletmeleri karşılaştır.",
}

export default function Page() {
  return <SavedScreen />
}
