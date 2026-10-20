import { connection } from "next/server"
import { blogStateGetFlow, blogStatePutFlow } from "@/lib/blog-flow"

export async function GET(request: Request) {
  await connection()
  return blogStateGetFlow(request)
}

export async function PUT(request: Request) {
  await connection()
  return blogStatePutFlow(request)
}
