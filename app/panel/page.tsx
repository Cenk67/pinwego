import type { Metadata } from "next"
import { OwnerScreen } from "@/components/directory/owner-screen"

export const metadata: Metadata = {
  title: "İşletme paneli",
  description: "İşletme profilini, hizmetleri, galeriyi ve iletişim bilgilerini düzenle.",
}

export default function Page() {
  return <OwnerScreen />
}
