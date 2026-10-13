"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { customerLoginPath } from "@/lib/auth-path"
import { useLocale } from "@/lib/use-locale"

export function VerifyScreen() {
  const params = useSearchParams()
  const token = params.get("token") ?? ""
  const { t } = useLocale()
  const started = useRef(false)
  const [state, setState] = useState<"idle" | "checking" | "done" | "expired" | "used" | "invalid" | "limited">(token.length < 20 ? "invalid" : "idle")

  function confirm() {
    if (started.current || token.length < 20) return
    started.current = true
    setState("checking")
    void fetch("/api/dogrula", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((response) => response.json())
      .then((data: { ok?: boolean; reason?: string }) => {
        if (data.ok) setState("done")
        else if (data.reason === "expired" || data.reason === "used" || data.reason === "limited") setState(data.reason)
        else setState("invalid")
      })
      .catch(() => setState("invalid"))
  }

  const copy =
    state === "checking" ? t("auth.checkingLink")
    : state === "done" ? t("auth.verifyDone")
    : state === "expired" ? t("auth.linkExpired")
    : state === "used" ? t("auth.linkUsed")
    : state === "limited" ? t("auth.limited")
    : state === "invalid" ? t("auth.linkInvalid")
    : ""

  return (
    <div className="mx-auto grid w-full max-w-lg gap-4 px-4 py-10">
      <h1 className="font-heading text-4xl text-balance">{t("auth.verifyTitle")}</h1>
      {copy ? <p className="text-sm leading-6 text-muted-foreground" role="status">{copy}</p> : null}
      {state === "idle" ? (
        <Button type="button" className="h-11 rounded-xl" onClick={confirm}>
          {t("auth.verifyTitle")}
        </Button>
      ) : null}
      {state === "done" ? (
        <Link href={customerLoginPath} className="text-sm text-primary">
          {t("auth.submit")}
        </Link>
      ) : null}
      {state === "expired" || state === "used" || state === "invalid" ? (
        <Link href="/sifre" className="text-sm text-primary">
          {t("auth.forgot")}
        </Link>
      ) : null}
    </div>
  )
}
