import { BUSINESSES } from "@/lib/businesses"
import { BookingClient } from "./booking-client"

export const instant = false

export function generateStaticParams() {
  return BUSINESSES.filter((b) => b.services?.length).map((b) => ({ slug: b.slug }))
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <BookingClient slug={slug} />
}
