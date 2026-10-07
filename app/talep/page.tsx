import type { Metadata } from "next"
import { RequestScreen } from "@/components/directory/request-screen"

export const metadata: Metadata = {
  title: "Talep oluştur",
  description: "İhtiyacını yaz, fiyat aralığı belli işletmelerle eşleş.",
}

export default function Page() {
  return <RequestScreen />
}
