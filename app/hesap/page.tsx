import type { Metadata } from "next"
import { AccountScreen } from "@/components/auth/account-screen"

export const metadata: Metadata = {
  title: "Hesap",
  description: "Doğrulama bilgileri ve yüklenen belgeler.",
}

export default function Page() {
  return <AccountScreen />
}
