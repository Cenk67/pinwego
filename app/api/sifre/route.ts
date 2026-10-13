import { connection } from "next/server"
import { resetFlow } from "@/lib/account-flow"

export async function POST(request: Request) {
  await connection()
  return resetFlow(request)
}
