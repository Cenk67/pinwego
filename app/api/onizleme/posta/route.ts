import { connection } from "next/server"
import { readDevMail } from "@/lib/mailer"

export async function GET() {
  await connection()
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 })
  return Response.json({ messages: readDevMail() }, { headers: { "cache-control": "no-store" } })
}
