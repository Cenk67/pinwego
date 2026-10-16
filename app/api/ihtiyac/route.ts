import { connection } from "next/server"
import { needEventFlow, needReportFlow } from "@/lib/need-flow"

export async function GET(request: Request) {
  await connection()
  return needReportFlow(request)
}

export async function POST(request: Request) {
  await connection()
  return needEventFlow(request)
}
