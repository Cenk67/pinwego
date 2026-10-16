"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { TurnstileField } from "@/components/auth/turnstile-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { customerLoginPath } from "@/lib/auth-path"
import { validEmail, validPassword } from "@/lib/identity"
import { useLocale } from "@/lib/use-locale"

export function ResetScreen({ siteKey }: { siteKey: string }) {
  const params = useSearchParams()
  const token = params.get("token") ?? ""
  const { t, locale } = useLocale()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [again, setAgain] = useState("")
  const [challenge, setChallenge] = useState("")
  const [note, setNote] = useState("")
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)

  async function ask(event: React.FormEvent) {
    event.preventDefault()
    if (!validEmail(email)) {
      setNote(t("auth.linkInvalid"))
      return
    }
    setPending(true)
    setNote("")
    try {
      const response = await fetch("/api/sifre", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, turnstile: challenge, locale }),
      })
      const data = (await response.json()) as { ok?: boolean; reason?: string; mail?: string }
      if (data.reason === "limited") setNote(t("auth.limited"))
      else if (data.reason === "challenge") setNote(t("auth.challenge"))
      else if (data.mail === "unconfigured") setNote(t("auth.forgotOff"))
      else setNote(t("auth.forgotSent"))
    } catch {
      setNote(t("auth.forgotSent"))
    } finally {
      setPending(false)
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!validPassword(password)) {
      setNote(t("auth.weak"))
      return
    }
    if (password !== again) {
      setNote(t("auth.again"))
      return
    }
    setPending(true)
    setNote("")
    try {
      const response = await fetch("/api/sifre/yenile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password, turnstile: challenge, locale }),
      })
      const data = (await response.json()) as { ok?: boolean; reason?: string }
      if (data.ok) setDone(true)
      else if (data.reason === "expired") setNote(t("auth.linkExpired"))
      else if (data.reason === "used") setNote(t("auth.linkUsed"))
      else if (data.reason === "weak") setNote(t("auth.weak"))
      else if (data.reason === "limited") setNote(t("auth.limited"))
      else if (data.reason === "challenge") setNote(t("auth.challenge"))
      else setNote(t("auth.linkInvalid"))
    } catch {
      setNote(t("auth.linkInvalid"))
    } finally {
      setPending(false)
    }
  }

  if (token) {
    return (
      <form onSubmit={(event) => void save(event)} className="mx-auto grid w-full max-w-lg gap-4 px-4 py-10">
        <div>
          <h1 className="font-heading text-4xl text-balance">{t("auth.resetTitle")}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{done ? t("auth.resetDone") : t("auth.resetCopy")}</p>
        </div>
        {done ? null : (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="reset-password">{t("auth.password")}</Label>
              <Input id="reset-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="h-11" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="reset-again">{t("auth.repeat")}</Label>
              <Input id="reset-again" type="password" value={again} onChange={(event) => setAgain(event.target.value)} autoComplete="new-password" className="h-11" />
            </div>
            <TurnstileField siteKey={siteKey} onToken={setChallenge} />
          </>
        )}
        {note ? <p className="rounded-2xl bg-destructive/10 px-3 py-3 text-sm text-destructive" role="alert">{note}</p> : null}
        {done ? (
          <Link href={customerLoginPath} className="text-sm text-primary">{t("auth.submit")}</Link>
        ) : (
          <Button type="submit" className="h-11 rounded-xl" disabled={pending || (Boolean(siteKey) && !challenge)}>
            {pending ? t("auth.checking") : t("auth.resetSubmit")}
          </Button>
        )}
      </form>
    )
  }

  return (
    <form onSubmit={(event) => void ask(event)} className="mx-auto grid w-full max-w-lg gap-4 px-4 py-10">
      <div>
        <h1 className="font-heading text-4xl text-balance">{t("auth.forgotTitle")}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("auth.forgotCopy")}</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="reset-email">{t("auth.email")}</Label>
        <Input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="h-11" />
      </div>
      <TurnstileField siteKey={siteKey} onToken={setChallenge} />
      {note ? <p className="rounded-2xl bg-card px-3 py-3 text-sm ring-1 ring-foreground/10" role="status">{note}</p> : null}
      <Button type="submit" className="h-11 rounded-xl" disabled={pending || (Boolean(siteKey) && !challenge)}>
        {pending ? t("auth.checking") : t("auth.forgotSubmit")}
      </Button>
      <Link href={customerLoginPath} className="text-center text-sm text-primary">{t("auth.back")}</Link>
    </form>
  )
}
