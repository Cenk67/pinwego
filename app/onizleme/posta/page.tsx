import type { Metadata } from "next"
import { connection } from "next/server"
import { notFound } from "next/navigation"
import { MailPreview } from "@/components/auth/mail-preview"

export const metadata: Metadata = {
  title: "Giden posta",
  robots: { index: false, follow: false },
}

export default async function Page() {
  await connection()
  if (process.env.NODE_ENV === "production") notFound()
  return <MailPreview />
}
