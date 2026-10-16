import { connection } from "next/server"
import { crmGetFlow, crmPostFlow } from "@/lib/crm-flow"

export async function GET(request: Request) {
  await connection()
  return crmGetFlow(request)
}

export async function POST(request: Request) {
  await connection()
  return crmPostFlow(request)
}
