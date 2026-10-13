import { connection } from "next/server"
import { analitikGetFlow } from "@/lib/notify-flow"

export async function GET(request: Request) {
  await connection()
  return analitikGetFlow(request)
}
