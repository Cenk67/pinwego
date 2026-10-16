import { connection } from "next/server"
import { adminLogoutFlow, adminSessionFlow, adminStartFlow } from "@/lib/admin-flow"

export async function POST(request: Request) {
  await connection()
  return adminStartFlow(request)
}

export async function GET(request: Request) {
  await connection()
  return adminSessionFlow(request)
}

export async function DELETE(request: Request) {
  await connection()
  return adminLogoutFlow(request)
}
