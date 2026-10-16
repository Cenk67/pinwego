import { connection } from "next/server"
import { iletisimGetFlow, iletisimPostFlow } from "@/lib/inbox-flow"

export async function GET(request: Request) {
  await connection()
  return iletisimGetFlow(request)
}

export async function POST(request: Request) {
  await connection()
  return iletisimPostFlow(request)
}
