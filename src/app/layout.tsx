import type { Metadata } from "next"
import { Fraunces, Source_Sans_3, Geist_Mono } from "next/font/google"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import "./globals.css"

const heading = Fraunces({
  variable: "--font-heading",
  subsets: ["latin", "latin-ext"],
})

const sans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
})

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Lumina — Yapay zekâ ile işletme rehberi",
    template: "%s · Lumina",
  },
  description:
    "Yerel restoran, randevu, ev hizmeti ve B2B firma verisini tek katalogda toplayan mobil uyumlu yapay zekâ rehberi.",
  icons: { icon: "/logo.svg" },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${heading.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
