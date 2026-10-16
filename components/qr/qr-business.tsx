"use client"

import Link from "next/link"
import { QrMark } from "@/components/qr/qr-mark"
import { Button } from "@/components/ui/button"
import { businessCode, posterPath, qrPath, qrUrl } from "@/lib/qr"
import { useLocale } from "@/lib/use-locale"

export function BusinessQr({ businessId, name, photo }: { businessId: string; name: string; photo?: string }) {
  const { t } = useLocale()
  const code = businessCode(businessId, "business")
  return (
    <div className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10" data-kartvizit="">
      <h2 className="font-heading text-lg">{t("qr.kicker")}</h2>
      <Link href={qrPath(code)} className="mt-3 flex justify-center">
        <QrMark text={qrUrl(code)} label={name} photo={photo} />
      </Link>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("qr.posterScan")}</p>
      <Button variant="outline" className="mt-3 h-11 rounded-full" nativeButton={false} render={<Link href={posterPath(code)} />}>
        {t("qr.poster")}
      </Button>
    </div>
  )
}
