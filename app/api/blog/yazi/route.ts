import { connection } from "next/server"
import { blogDeskGetFlow, blogDeskPostFlow } from "@/lib/blog-flow"

export async function GET(request: Request) {
  await connection()
  return blogDeskGetFlow(request)
}

export async function POST(request: Request) {
  await connection()
  return blogDeskPostFlow(request)
}
