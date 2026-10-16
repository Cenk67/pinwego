import { connection } from "next/server"
import { loginFlow } from "@/lib/account-flow"

export async function POST(request: Request) {
  await connection()
  return loginFlow(request)
}
