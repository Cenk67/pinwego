import { connection } from "next/server"
import { ilanGetFlow, ilanPostFlow } from "@/lib/listings-flow"

export async function GET(request: Request) {
  await connection()
  return ilanGetFlow(request)
}

export async function POST(request: Request) {
  await connection()
  return ilanPostFlow(request)
}
