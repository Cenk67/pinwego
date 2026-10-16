import { connection } from "next/server"
import { registerFlow } from "@/lib/account-flow"

export async function POST(request: Request) {
  await connection()
  return registerFlow(request)
}
