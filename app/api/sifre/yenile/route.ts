import { connection } from "next/server"
import { resetPasswordFlow } from "@/lib/account-flow"

export async function POST(request: Request) {
  await connection()
  return resetPasswordFlow(request)
}
