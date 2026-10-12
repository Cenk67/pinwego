"use client"

import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import { useLocale } from "@/lib/use-locale"

export function Footer() {
  const { t } = useLocale()
  return (
    <footer className="mt-16 border-t border-foreground/10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo variant="stacked" />
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{t("footer.pitch")}</p>
        </div>
        <div className="text-sm">
          <p className="font-medium">{t("footer.browse")}</p>
          <div className="mt-3 grid gap-2 text-muted-foreground">
            <Link href="/blog">{t("nav.blog")}</Link>
            <Link href="/ara">{t("nav.search")}</Link>
            <Link href="/talep">{t("nav.demand")}</Link>
            <Link href="/mesajlar">{t("nav.messages")}</Link>
            <Link href="/listele">{t("nav.listing")}</Link>
            <Link href="/kaydedilenler">{t("nav.compare")}</Link>
            <Link href="/yonetim">{t("nav.admin")}</Link>
          </div>
        </div>
        <div className="text-sm">
          <p className="font-medium">{t("footer.noteTitle")}</p>
          <p className="mt-3 leading-6 text-muted-foreground">{t("footer.note")}</p>
        </div>
      </div>
    </footer>
  )
}
