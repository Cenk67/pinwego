import { connection } from "next/server"
import { resendFlow } from "@/lib/account-flow"

export async function POST(request: Request) {
  await connection()
  return resendFlow(request)
}
