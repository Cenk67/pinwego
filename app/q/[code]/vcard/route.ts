import { connection } from "next/server"
import { allowQrBurst, buildVCard, findBusiness, resolveQr, vcardFilename } from "@/lib/qr"

const bursts = new Map<string, number[]>()

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  await connection()
  const { code } = await context.params
  const hit = resolveQr(code)
  const business = hit ? findBusiness(hit.businessId) : null
  const quiet = { "X-Robots-Tag": "noindex, follow", "Cache-Control": "no-store" }
  if (!hit || !business || business.profile?.published === false) {
    return new Response("Bu kart yayında değil.", { status: 404, headers: quiet })
  }
  const now = Date.now()
  const burst = allowQrBurst(bursts.get(hit.code) ?? [], now)
  bursts.set(hit.code, burst.stamps)
  if (!burst.ok) {
    return new Response("Çok sık istek. Bir dakika sonra yeniden dene.", { status: 429, headers: quiet })
  }
  return new Response(buildVCard(business), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${vcardFilename(business.slug)}"`,
      ...quiet,
    },
  })
}
