import { connection } from "next/server"
import { bildirimGetFlow, bildirimPostFlow } from "@/lib/notify-flow"

export async function GET(request: Request) {
  await connection()
  return bildirimGetFlow(request)
}

export async function POST(request: Request) {
  await connection()
  return bildirimPostFlow(request)
}
