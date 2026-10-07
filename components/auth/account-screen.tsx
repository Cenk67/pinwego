"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { openDocument } from "@/lib/auth-store"
import { maskId } from "@/lib/identity"

export function AccountScreen() {
  const { account, logout } = useAuth()
  const [message, setMessage] = useState("")

  if (!account) return null

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
        {account.role === "musteri" ? "Müşteri hesabı" : "İşletme hesabı"} · Belge kontrolü tamam
      </p>
      <h1 className="mt-2 font-heading text-4xl text-balance">{account.name}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Kimlik bilgisi ve yüklenen belgeler kontrol edildiği için rehber bu hesapla açık. Kayıt bu tarayıcıda durur.
      </p>
      <dl className="mt-6 grid gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm">{value}</dd>
          </div>
        ))}
      </dl>
      <h2 className="mt-8 font-heading text-2xl">Yüklenen belgeler</h2>
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
      <Button type="button" variant="outline" className="mt-6 h-11 rounded-xl" onClick={logout}>
        Çıkış yap
      </Button>
    </div>
  )
}
