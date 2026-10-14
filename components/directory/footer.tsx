"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Logo } from "@/components/brand/logo"
import { cookieChoiceKey } from "@/components/directory/cookie-banner"
import { footerPages, seedPages, type PageGroup } from "@/lib/site-pages"
import { useLocale } from "@/lib/use-locale"

type FooterLink = { slug: string; title: string; group: PageGroup; order: number }

export function Footer() {
  const { t } = useLocale()
  const [links, setLinks] = useState<FooterLink[]>(() => footerPages(seedPages))
  useEffect(() => {
    let live = true
    void fetch("/api/sayfa")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { links?: FooterLink[] } | null) => {
        if (!live || !data || !Array.isArray(data.links)) return
        setLinks(data.links)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [])
  function openCookieChoice() {
    localStorage.removeItem(cookieChoiceKey)
    window.dispatchEvent(new Event("pinwego-cerez"))
  }
  return (
    <footer className="mt-16 border-t border-foreground/10 print:hidden">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo variant="stacked" />
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{t("footer.pitch")}</p>
        </div>
        <div className="text-sm">
          <p className="font-medium">{t("footer.browse")}</p>
          <div className="mt-3 grid gap-2 text-muted-foreground">
            <Link href="/blog">{t("nav.blog")}</Link>
            <Link href="/kampanyalar">{t("nav.campaigns")}</Link>
            <Link href="/ara">{t("nav.search")}</Link>
            <Link href="/talep">{t("nav.demand")}</Link>
            <Link href="/mesajlar">{t("nav.messages")}</Link>
            <Link href="/listele">{t("nav.listing")}</Link>
            <Link href="/kaydedilenler">{t("nav.compare")}</Link>
            <Link href="/yonetim">{t("nav.admin")}</Link>
          </div>
        </div>
        <div className="text-sm">
          <p className="font-medium">{t("footer.corporate")}</p>
          <div className="mt-3 grid gap-2 text-muted-foreground">
            {links.filter((item) => item.group === "kurumsal").map((item) => (
              <Link key={item.slug} href={`/${item.slug}`}>{item.title}</Link>
            ))}
          </div>
        </div>
        <div className="text-sm">
          <p className="font-medium">{t("footer.legal")}</p>
          <div className="mt-3 grid gap-2 text-muted-foreground">
            {links.filter((item) => item.group === "hukuk").map((item) => (
              <Link key={item.slug} href={`/${item.slug}`}>{item.title}</Link>
            ))}
          </div>
          <p className="mt-4 leading-6 text-muted-foreground">{t("legal.binding")}</p>
          <button type="button" onClick={openCookieChoice} className="mt-3 text-left text-muted-foreground">
            {t("cookie.title")}
          </button>
          <p className="mt-3 leading-6 text-muted-foreground">{t("footer.note")}</p>
        </div>
      </div>
    </footer>
  )
}
