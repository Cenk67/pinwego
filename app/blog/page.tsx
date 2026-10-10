import type { Metadata } from "next"
import { BlogIndex } from "@/components/blog/blog-screens"

export const metadata: Metadata = {
  title: "Blog",
  description: "Şehir rehberleri ve seçim notları. Kategori, alt kategori, görsel ve yazı aynı adreste.",
  alternates: { canonical: "/blog" },
}

export default function Page() {
  return <BlogIndex />
}
