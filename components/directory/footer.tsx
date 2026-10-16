"use client"

import Link from "next/link"
import { useEffect, useState, useSyncExternalStore } from "react"
import { Logo } from "@/components/brand/logo"
import { cookieChoiceKey } from "@/components/directory/cookie-banner"
import { footerPages, seedPages, type PageGroup } from "@/lib/site-pages"
import { useLocale } from "@/lib/use-locale"

type SocialLink = { id: string; label: string; url: string }

function useYear() {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  return mounted ? new Date().getFullYear() : 0
}

type FooterLink = { slug: string; title: string; group: PageGroup; order: number }

export function Footer() {
  const { t } = useLocale()
  const year = useYear()
  const [links, setLinks] = useState<FooterLink[]>(() => footerPages(seedPages))
  const [socials, setSocials] = useState<SocialLink[]>([])
  useEffect(() => {
    let live = true
    void fetch("/api/sayfa")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { links?: FooterLink[] } | null) => {
        if (!live || !data || !Array.isArray(data.links)) return
        setLinks(data.links)
      })
      .catch(() => undefined)
    void fetch("/api/iletisim")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { settings?: { socials?: SocialLink[] } } | null) => {
        if (!live || !Array.isArray(data?.settings?.socials)) return
        setSocials(data.settings.socials)
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
          {socials.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {socials.map((item) => (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" aria-label={item.label} className="inline-flex h-9 items-center rounded-full bg-secondary px-3 text-xs">
                  {item.label}
                </a>
              ))}
            </div>
          ) : null}
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
            <Link href="/iletisim">{t("footer.contact")}</Link>
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
      <p className="mx-auto max-w-6xl px-4 pb-8 text-sm text-muted-foreground">
        {year ? `© ${year} Pinwego. ${t("footer.rights")}` : `© Pinwego. ${t("footer.rights")}`}
      </p>
    </footer>
  )
}
