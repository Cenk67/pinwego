import { connection } from "next/server"
import { visitFlow } from "@/lib/notify-flow"

export async function POST(request: Request) {
  await connection()
  return visitFlow(request)
}
