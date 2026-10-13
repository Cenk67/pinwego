"use client"

import { useState } from "react"
import Link from "next/link"
import { TurnstileField } from "@/components/auth/turnstile-field"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/lib/use-locale"

export function PendingMail({
  email,
  password,
  siteKey,
}: {
  email: string
  password: string
  siteKey: string
}) {
  const { t, locale } = useLocale()
  const [token, setToken] = useState("")
  const [note, setNote] = useState("")
  const [pending, setPending] = useState(false)

  async function resend() {
    setPending(true)
    setNote("")
    try {
      const response = await fetch("/api/dogrula/yenile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, turnstile: token, locale }),
      })
      const data = (await response.json()) as { ok?: boolean; reason?: string; mail?: string }
      if (data.reason === "limited") setNote(t("auth.limited"))
      else if (data.reason === "challenge") setNote(t("auth.challenge"))
      else if (data.mail === "unconfigured") setNote(t("auth.forgotOff"))
      else setNote(t("auth.resendSent"))
    } catch {
      setNote(t("auth.resendSent"))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="font-heading text-4xl text-balance">{t("auth.verifyTitle")}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("auth.verifyPending", { email })}</p>
      </div>
      <TurnstileField siteKey={siteKey} onToken={setToken} />
      {note ? <p className="rounded-2xl bg-card px-3 py-3 text-sm ring-1 ring-foreground/10" role="status">{note}</p> : null}
      <Button type="button" className="h-11 rounded-xl" disabled={pending || (Boolean(siteKey) && !token)} onClick={() => void resend()}>
        {pending ? t("auth.checking") : t("auth.resend")}
      </Button>
      <Link href="/hesap?kayit=giris&kapi=musteri" className="text-center text-sm text-primary">
        {t("auth.submit")}
      </Link>
    </div>
  )
}
