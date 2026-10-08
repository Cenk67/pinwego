import type { Metadata } from "next"
import { Fraunces, Outfit } from "next/font/google"
import { Shell } from "@/components/directory/shell"
import { AuthProvider } from "@/lib/auth-context"
import { DirectoryProvider } from "@/lib/directory-context"
import "./globals.css"

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
})

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
})

export const metadata: Metadata = {
  title: {
    default: "pinwego",
    template: "%s · pinwego",
  },
  description:
    "Yakındaki işletmeyi yorum, fiyat, mesafe ve randevuyla bulun. pinwego, yazdığınız cümleye göre eşleştirir.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <DirectoryProvider>
          <AuthProvider>
            <Shell>{children}</Shell>
          </AuthProvider>
        </DirectoryProvider>
      </body>
    </html>
  )
}
