import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { canonicalRedirectUrl } from "@/lib/auth-session"
import { devPreviewPath } from "@/lib/mail-policy"
import { contentPaths } from "@/lib/site-pages"

const appRoots = new Set([
  "/ara",
  "/blog",
  "/dogrula",
  "/hesap",
  "/iletisim",
  "/isletme",
  "/kampanyalar",
  "/kaydedilenler",
  "/kesif",
  "/listele",
  "/mesajlar",
  "/onizleme",
  "/panel",
  "/q",
  "/sifre",
  "/talep",
  "/yonetim",
])

function missingPage() {
  const html = "<!doctype html><html lang=\"tr\"><meta charset=\"utf-8\"><meta name=\"robots\" content=\"noindex\"><title>Sayfa yok</title><body style=\"font-family:sans-serif;padding:4rem 1rem;text-align:center\"><h1>Sayfa yok</h1><p>Bu adres yayında değil.</p><a href=\"/\">Ana sayfa</a></body></html>"
  return new NextResponse(html, { status: 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } })
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (process.env.NODE_ENV === "production" && devPreviewPath(pathname)) {
    return new NextResponse(null, { status: 404, headers: { "cache-control": "no-store" } })
  }
  const parts = pathname.split("/").filter(Boolean)
  if (parts.length === 1 && !pathname.includes(".") && !appRoots.has(pathname) && !contentPaths.includes(pathname)) {
    return missingPage()
  }
  if (contentPaths.includes(pathname)) {
    const { pageBySlug } = await import("@/lib/pages-flow")
    if (!(await pageBySlug(parts[0] ?? ""))) return missingPage()
  }
  const host = request.headers.get("host") ?? request.headers.get("x-forwarded-host")
  const target = canonicalRedirectUrl(host, `${pathname}${request.nextUrl.search}`)
  if (!target) return NextResponse.next()
  return NextResponse.redirect(target, 308)
}
