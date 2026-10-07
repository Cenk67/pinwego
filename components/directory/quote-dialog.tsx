"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { fieldClass } from "@/components/directory/bits"
import { useDirectory } from "@/lib/directory-context"
import { bookingLabel, formatResponse } from "@/lib/format"
import type { Business } from "@/lib/types"

export function QuoteDialog({
  business,
  open,
  onOpenChange,
  initialNote = "",
}: {
  business: Business
  open: boolean
  onOpenChange: (open: boolean) => void
  initialNote?: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <QuoteForm
            key={`${business.id}-${initialNote}`}
            business={business}
            initialNote={initialNote}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function QuoteForm({
  business,
  initialNote,
  onOpenChange,
}: {
  business: Business
  initialNote: string
  onOpenChange: (open: boolean) => void
}) {
  const { addRequest } = useDirectory()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [when, setWhen] = useState("Bu hafta")
  const [note, setNote] = useState(initialNote)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const digits = phone.replace(/\D/g, "")
    if (name.trim().length < 2) {
      setError("Ad soyad en az iki karakter olmalı.")
      return
    }
    if (digits.length < 10) {
      setError("Telefon için en az 10 rakam gir.")
      return
    }
    addRequest({
      id: crypto.randomUUID(),
      businessId: business.id,
      businessName: business.name,
      kind: business.booking,
      name: name.trim(),
      phone: phone.trim(),
      note: note.trim(),
      when,
      createdAt: new Date().toISOString(),
    })
    setSent(true)
  }

  if (sent) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Talebin iletildi</DialogTitle>
          <DialogDescription>
            {business.name} için {bookingLabel(business.booking).toLocaleLowerCase("tr-TR")} kaydı
            bu tarayıcıda duruyor. Örnek dönüş süresi {formatResponse(business.responseMinutes)}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" className="h-10 rounded-xl" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <DialogHeader>
        <DialogTitle className="font-heading text-xl">{bookingLabel(business.booking)}</DialogTitle>
        <DialogDescription>
          {business.name} · {business.district}. Ortalama dönüş {formatResponse(business.responseMinutes)}.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-1.5">
        <Label htmlFor="lead-name">Ad soyad</Label>
        <Input id="lead-name" value={name} onChange={(event) => setName(event.target.value)} className="h-11" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="lead-phone">Telefon</Label>
        <Input
          id="lead-phone"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="05xx"
          className="h-11"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="lead-when">Ne zaman</Label>
        <select id="lead-when" className={fieldClass} value={when} onChange={(event) => setWhen(event.target.value)}>
          <option>Bugün</option>
          <option>Yarın</option>
          <option>Bu hafta</option>
          <option>Esnek</option>
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="lead-note">Not</Label>
        <Textarea
          id="lead-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="İşin ölçüsü, kişi sayısı ya da saat"
          className="min-h-20"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <DialogFooter>
        <Button type="submit" className="h-10 rounded-xl">
          Gönder
        </Button>
      </DialogFooter>
    </form>
  )
}
