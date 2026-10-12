"use client"

import { Logo } from "@/components/brand/logo"
import { Cover } from "@/components/directory/bits"
import { QrMark } from "@/components/qr/qr-mark"
import { Button } from "@/components/ui/button"
import { qrUrl } from "@/lib/qr"
import { useLocale } from "@/lib/use-locale"

export function QrPoster({
  code,
  name,
  photo,
  city,
  district,
}: {
  code: string
  name: string
  photo: string
  city: string
  district: string
}) {
  const { t } = useLocale()
  return (
    <div className="mx-auto max-w-md px-6 py-10 text-center">
      <Logo />
      <Cover src={photo} alt="" className="mx-auto mt-8 h-24 w-24 rounded-full object-cover ring-1 ring-foreground/10" />
      <h1 className="mt-4 font-heading text-4xl leading-tight">{name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {district}, {city}
      </p>
      <p className="mt-8 font-heading text-3xl leading-tight">{t("qr.posterTitle")}</p>
      <div className="mt-6 flex justify-center">
        <QrMark text={qrUrl(code)} label={name} />
      </div>
      <p className="mt-4 text-sm leading-6">{t("qr.posterScan")}</p>
      <p className="mt-2 text-sm text-muted-foreground">{t("qr.posterMore")}</p>
      <Button type="button" className="mt-8 h-11 rounded-full px-5 print:hidden" onClick={() => window.print()}>
        Yazdır
      </Button>
    </div>
  )
}
