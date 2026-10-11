import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { canonicalRedirectUrl } from "@/lib/auth-session"

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? request.headers.get("x-forwarded-host")
  const target = canonicalRedirectUrl(host, `${request.nextUrl.pathname}${request.nextUrl.search}`)
  if (!target) return NextResponse.next()
  return NextResponse.redirect(target, 308)
}
