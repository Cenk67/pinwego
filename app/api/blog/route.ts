import { connection } from "next/server"
import { accountStore } from "@/lib/account-kv"
import { adminSessionOpen, readAdminCookie } from "@/lib/admin-gate"
import { readBlogState, writeBlogState } from "@/lib/blog-file"

export async function GET() {
  return Response.json(await readBlogState())
}

export async function PUT(request: Request) {
  await connection()
  const store = await accountStore()
  const open = Boolean(store && (await adminSessionOpen(store, readAdminCookie(request.headers.get("cookie")))))
  if (!open) return Response.json({ error: "Yetki yok" }, { status: 401 })
  try {
    const body = (await request.json()) as { state?: unknown }
    const state = await writeBlogState(body.state)
    return Response.json({ ok: true, state })
  } catch {
    return Response.json({ error: "Kayıt dosyaya yazılamadı" }, { status: 500 })
  }
}
