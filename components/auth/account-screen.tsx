"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { AuthScreen } from "@/components/auth/auth-screen"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { authDoor, authMode, loginDoorProblem } from "@/lib/auth-path"
import { destinationFor, safeReturnPath } from "@/lib/auth-session"
import { openDocument } from "@/lib/auth-store"
import { CLAIM_KEY } from "@/lib/claim"
import { maskId } from "@/lib/identity"

export function AccountScreen({ siteKey = "" }: { siteKey?: string }) {
  const { account, ready, logout } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const [message, setMessage] = useState("")
  const redirected = useRef(false)
  const kayit = params.get("kayit")
  const mode = authMode(kayit)
  const door = authDoor(params.get("kapi"), mode)
  const entering =
    Boolean(account) &&
    mode !== "choose" &&
    ((mode === "musteri" && account?.role === "musteri") ||
      (mode === "isletme" && account?.role === "isletme") ||
      (mode === "admin" && account?.role === "admin") ||
      (mode === "login" && account != null && !loginDoorProblem(door, account.role)))

  useEffect(() => {
    if (!entering || !account || redirected.current) return
    if (sessionStorage.getItem(CLAIM_KEY) && account.role !== "musteri") return
    redirected.current = true
    router.replace(destinationFor(account.role, null, safeReturnPath(params.get("donus"))))
  }, [entering, account, params, router])

  if (!ready) return null
  const switching =
    account?.role === "musteri" && (mode === "isletme" || mode === "admin" || (mode === "login" && door !== "musteri"))
  if (entering) {
    return <p className="mx-auto max-w-xl px-4 py-16 text-sm text-muted-foreground">Hesabın açık. Siteye geçiliyor.</p>
  }
  if (!account || switching) {
    return (
      <AuthScreen
        key={`${kayit ?? "choose"}:${params.get("kapi") ?? ""}`}
        embedded
        initialMode={mode}
        door={authDoor(params.get("kapi"), mode)}
        siteKey={siteKey}
      />
    )
  }

  async function open(id: string) {
    if (!account) return
    setMessage("")
    try {
      const url = await openDocument(account, id)
      if (!url) {
        setMessage("Belge bu tarayıcıda bulunamadı.")
        return
      }
      window.open(url, "_blank", "noopener")
    } catch {
      setMessage("Belge açılamadı.")
    }
  }

  const rows =
    account.role === "musteri" && account.customer
      ? [
          ["Ad soyad", account.name],
          ["E-posta", account.email],
          ["Telefon", account.phone],
          ["T.C. kimlik numarası", maskId(account.customer.nationalId)],
          ["Doğum tarihi", account.customer.birthDate],
        ]
      : account.role === "admin"
        ? [
            ["Ad", account.name],
            ["E-posta", account.email],
            ["Rol", "Yönetici"],
          ]
      : account.business
        ? [
            ["Unvan", account.name],
            ["Yetkili", account.business.owner],
            ["E-posta", account.email],
            ["Telefon", account.phone],
            ["Vergi kimlik numarası", maskId(account.business.taxId)],
            ["Vergi dairesi", account.business.taxOffice],
            ["Adres", `${account.business.address}, ${account.business.city}`],
          ]
        : [["E-posta", account.email]]

  return (
    <div className="mx-auto max-w-xl px-4 py-8 md:py-12">
      <p className="text-sm font-medium text-primary">
        {account.role === "admin" ? "Yönetici hesabı" : account.role === "musteri" ? "Müşteri hesabı" : "İşletme hesabı"}
        {account.role === "admin" ? " · Panel açık" : " · Belge kontrolü tamam"}
      </p>
      <h1 className="mt-2 font-heading text-4xl text-balance">{account.name}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Hesap e-posta ve şifreyle yeniden açılır. Yüklenen belgeler bu tarayıcıda kalır.
      </p>
      <dl className="mt-6 grid gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm">{value}</dd>
          </div>
        ))}
      </dl>
      {account.documents.length ? <h2 className="mt-8 font-heading text-2xl">Yüklenen belgeler</h2> : null}
      <ul className="mt-3 grid gap-2">
        {account.documents.map((document) => (
          <li key={document.id} className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <div className="min-w-0">
              <p className="text-sm font-medium">{document.label}</p>
              <p className="truncate text-xs text-muted-foreground">
                {document.name} · {Math.max(1, Math.round(document.size / 1024))} KB
              </p>
            </div>
            <Button type="button" variant="outline" className="h-9 shrink-0 rounded-xl" onClick={() => open(document.id)}>
              Aç
            </Button>
          </li>
        ))}
      </ul>
      {message ? <p className="mt-3 text-sm text-destructive">{message}</p> : null}
      <Button className="mt-6 h-11 rounded-xl" nativeButton={false} render={<Link href="/" />}>
        Siteye dön
      </Button>
      {account.role === "admin" ? (
        <Button className="mt-6 h-11 rounded-xl" nativeButton={false} render={<Link href="/yonetim" />}>
          Yönetim paneli
        </Button>
      ) : null}
      {account.role === "isletme" || account.role === "admin" ? (
        <Button
          className="mt-6 h-11 rounded-xl"
          variant={account.role === "admin" ? "outline" : "default"}
          nativeButton={false}
          render={<Link href="/panel" />}
        >
          İşletme paneli
        </Button>
      ) : null}
      <Button type="button" variant="outline" className="mt-6 h-11 rounded-xl" onClick={logout}>
        Çıkış yap
      </Button>
    </div>
  )
}
