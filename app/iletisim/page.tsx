import type { Metadata } from "next"
import { connection } from "next/server"
import { ContactScreen } from "@/components/directory/contact-screen"
import { contactPublished, iletisimGetFlow } from "@/lib/inbox-flow"
import { publicSettings, seedSettings } from "@/lib/inbox"

export async function generateMetadata(): Promise<Metadata> {
  await connection()
  const page = await contactPublished()
  if (!page) return { title: "İletişim kapalı", robots: { index: false, follow: false } }
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: "https://pinwego.com/iletisim" },
  }
}

export default async function Page() {
  await connection()
  const response = await iletisimGetFlow(new Request("http://127.0.0.1/api/iletisim"))
  const data = (await response.json()) as { settings?: ReturnType<typeof publicSettings> }
  const settings = data.settings ?? publicSettings(seedSettings())
  return <ContactScreen initial={settings} siteKey={process.env.TURNSTILE_SITE_KEY ?? ""} />
}
