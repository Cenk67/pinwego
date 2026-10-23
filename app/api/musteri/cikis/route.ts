import { connection } from "next/server"
import { cikisGetFlow, cikisPostFlow } from "@/lib/comms-flow"

export async function GET(request: Request) {
  await connection()
  return cikisGetFlow(request)
}

export async function POST(request: Request) {
  await connection()
  return cikisPostFlow(request)
}
