"use client"

import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import { LanguageMenu } from "@/components/directory/language-menu"
import { PlaceButton } from "@/components/directory/place-picker"
import { useAuth } from "@/lib/auth-context"
import { useDirectory } from "@/lib/directory-context"
import { useMessages } from "@/lib/message-context"
import { useLocale } from "@/lib/use-locale"

export function Header() {
  const { saved } = useDirectory()
  const { account } = useAuth()
  const { unread } = useMessages()
  const { t } = useLocale()
  return (
    <header className="sticky top-0 z-40 border-b border-foreground/10 bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" aria-label="pinwego" className="flex shrink-0 items-center">
          <Logo />
        </Link>
        <nav className="ms-4 hidden items-center gap-5 text-sm md:flex">
          <Link href="/blog" className="hover:text-primary">
            {t("nav.blog")}
          </Link>
          <Link href="/ara" className="hover:text-primary">
            {t("nav.explore")}
          </Link>
          <Link href="/talep" className="hover:text-primary">
            {t("nav.request")}
          </Link>
          <Link href="/listele" className="hover:text-primary">
            {t("nav.add")}
          </Link>
          <Link href="/mesajlar" className="hover:text-primary">
            {t("nav.messages")}
            {unread ? ` (${unread})` : ""}
          </Link>
          <Link href="/kaydedilenler" className="hover:text-primary">
            {t("nav.saved")}
            {saved.length ? ` (${saved.length})` : ""}
          </Link>
          {account?.role === "admin" ? (
            <Link href="/yonetim" className="hover:text-primary">
              {t("nav.admin")}
            </Link>
          ) : null}
          {account?.role === "isletme" || account?.role === "admin" ? (
            <Link href="/panel" className="hover:text-primary">
              {t("nav.panel")}
            </Link>
          ) : null}
          {account ? (
            <Link href="/hesap" className="hover:text-primary">
              {t("nav.account")}
            </Link>
          ) : (
            <Link href="/hesap" className="rounded-full bg-primary px-3 py-1.5 text-primary-foreground">
              {t("nav.login")}
            </Link>
          )}
        </nav>
        <Link href="/blog" className="ms-auto text-sm hover:text-primary md:hidden">
          {t("nav.blog")}
        </Link>
        <Link
          href={account?.role === "admin" ? "/yonetim" : "/hesap"}
          className="text-sm hover:text-primary md:hidden"
        >
          {account?.role === "admin" ? t("nav.admin") : account ? t("nav.account") : t("nav.login")}
        </Link>
        <LanguageMenu />
        <PlaceButton compact className="md:ms-auto" />
      </div>
    </header>
  )
}
