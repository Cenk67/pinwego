"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/lib/use-locale"

export default function NotFound() {
  const { t } = useLocale()
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-heading text-4xl">{t("missing.title")}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("missing.body")}</p>
      <Button className="mt-6 h-11 rounded-full px-5" nativeButton={false} render={<Link href="/" />}>
        {t("missing.home")}
      </Button>
    </div>
  )
}
