import { connection } from "next/server"
import { musteriGetFlow, musteriPostFlow } from "@/lib/customers-flow"

export async function GET(request: Request) {
  await connection()
  return musteriGetFlow(request)
}

export async function POST(request: Request) {
  await connection()
  return musteriPostFlow(request)
}
