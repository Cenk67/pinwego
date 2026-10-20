import type { Metadata } from "next"
import { Fraunces, Outfit } from "next/font/google"
import { BlogProvider } from "@/components/blog/blog-context"
import { LocaleBoot } from "@/components/directory/locale-boot"
import { Shell } from "@/components/directory/shell"
import { localeBootScript } from "@/lib/i18n"
import { AuthProvider } from "@/lib/auth-context"
import { deskDay, projectPublicState } from "@/lib/blog-desk"
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
  // Epoch keeps this render cacheable. A scheduled post becomes public after the blog API marks it published.
  const blogState = projectPublicState(await readBlogState(), deskDay(0))
  return (
    <html lang="tr" suppressHydrationWarning className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <script dangerouslySetInnerHTML={{ __html: localeBootScript }} />
        <LocaleBoot />
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
