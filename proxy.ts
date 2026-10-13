import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { canonicalRedirectUrl } from "@/lib/auth-session"
import { devPreviewPath } from "@/lib/mail-policy"

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === "production" && devPreviewPath(request.nextUrl.pathname)) {
    return new NextResponse(null, { status: 404, headers: { "cache-control": "no-store" } })
  }
  const host = request.headers.get("host") ?? request.headers.get("x-forwarded-host")
  const target = canonicalRedirectUrl(host, `${request.nextUrl.pathname}${request.nextUrl.search}`)
  if (!target) return NextResponse.next()
  return NextResponse.redirect(target, 308)
}
