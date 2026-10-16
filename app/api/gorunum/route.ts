import { connection } from "next/server"
import { gorunumGetFlow, gorunumPostFlow } from "@/lib/views-flow"

export async function GET(request: Request) {
  await connection()
  return gorunumGetFlow(request)
}

export async function POST(request: Request) {
  await connection()
  return gorunumPostFlow(request)
}
