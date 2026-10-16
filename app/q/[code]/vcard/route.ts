import { connection } from "next/server"
import { allowQrBurst, buildVCard, vcardFilename } from "@/lib/qr"
import { openQr } from "@/lib/qr-open"

const bursts = new Map<string, number[]>()

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  await connection()
  const { code } = await context.params
  const opened = await openQr(code)
  const quiet = { "X-Robots-Tag": "noindex, follow", "Cache-Control": "no-store" }
  if (!opened) {
    return new Response("Bu kart yayında değil.", { status: 404, headers: quiet })
  }
  const now = Date.now()
  const burst = allowQrBurst(bursts.get(opened.hit.code) ?? [], now)
  bursts.set(opened.hit.code, burst.stamps)
  if (!burst.ok) {
    return new Response("Çok sık istek. Bir dakika sonra yeniden dene.", { status: 429, headers: quiet })
  }
  return new Response(buildVCard(opened.business), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${vcardFilename(opened.business.slug)}"`,
      ...quiet,
    },
  })
}
