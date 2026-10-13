import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { MailPreview } from "@/components/auth/mail-preview"

export const metadata: Metadata = {
  title: "Giden posta",
  robots: { index: false, follow: false },
}

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound()
  return <MailPreview />
}
