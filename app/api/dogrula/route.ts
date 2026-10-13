import { connection } from "next/server"
import { verifyFlow } from "@/lib/account-flow"

export async function POST(request: Request) {
  await connection()
  return verifyFlow(request)
}
