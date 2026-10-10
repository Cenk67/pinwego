import type { Metadata } from "next"
import { Fraunces, Outfit } from "next/font/google"
import { BlogProvider } from "@/components/blog/blog-context"
import { Shell } from "@/components/directory/shell"
import { AuthProvider } from "@/lib/auth-context"
import { readBlogState } from "@/lib/blog-file"
import { DirectoryProvider } from "@/lib/directory-context"
import { MessageProvider } from "@/lib/message-context"
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
  metadataBase: new URL("https://pinwego.com"),
  title: {
    default: "pinwego",
    template: "%s · pinwego",
  },
  description:
    "Yakındaki işletmeyi yorum, fiyat, mesafe ve randevuyla bulun. pinwego, yazdığınız cümleye göre eşleştirir.",
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const blogState = await readBlogState()
  return (
    <html lang="tr" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <BlogProvider initial={blogState}>
          <DirectoryProvider>
            <AuthProvider>
              <MessageProvider>
                <Shell>{children}</Shell>
              </MessageProvider>
            </AuthProvider>
          </DirectoryProvider>
        </BlogProvider>
      </body>
    </html>
  )
}
