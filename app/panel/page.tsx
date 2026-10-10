import type { Metadata } from "next"
import { OwnerScreen } from "@/components/directory/owner-screen"

export const metadata: Metadata = {
  title: "İşletme paneli",
  description: "İşletmenin sosyal medya ve site linklerini düzenle.",
}

export default function Page() {
  return <OwnerScreen />
}
