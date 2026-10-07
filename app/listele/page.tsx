import type { Metadata } from "next"
import { ListScreen } from "@/components/directory/list-screen"

export const metadata: Metadata = {
  title: "İşletme ekle",
  description: "Ücretsiz işletme kaydı oluştur.",
}

export default function Page() {
  return <ListScreen />
}
