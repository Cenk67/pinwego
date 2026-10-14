import { connection } from "next/server"
import { sayfaGetFlow, sayfaPostFlow } from "@/lib/pages-flow"

export async function GET(request: Request) {
  await connection()
  return sayfaGetFlow(request)
}

export async function POST(request: Request) {
  await connection()
  return sayfaPostFlow(request)
}
