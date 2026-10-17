import { connection } from "next/server"
import { sektorGetFlow, sektorPostFlow } from "@/lib/taxonomy-flow"

export async function GET(request: Request) {
  await connection()
  return sektorGetFlow(request)
}

export async function POST(request: Request) {
  await connection()
  return sektorPostFlow(request)
}
