import { connection } from "next/server"
import { adminCodeFlow } from "@/lib/admin-flow"

export async function POST(request: Request) {
  await connection()
  return adminCodeFlow(request)
}
