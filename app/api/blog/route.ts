import { ADMIN_PASSWORD } from "@/lib/auth-store"
import { readBlogState, writeBlogState } from "@/lib/blog-file"

export async function GET() {
  return Response.json(await readBlogState())
}

export async function PUT(request: Request) {
  const body = (await request.json()) as { password?: string; state?: unknown }
  if (body.password !== ADMIN_PASSWORD) return Response.json({ error: "Yetki yok" }, { status: 401 })
  try {
    const state = await writeBlogState(body.state)
    return Response.json({ ok: true, state })
  } catch {
    return Response.json({ error: "Kayıt dosyaya yazılamadı" }, { status: 500 })
  }
}
