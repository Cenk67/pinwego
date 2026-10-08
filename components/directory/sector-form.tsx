"use client"

import { useState } from "react"
import { CategoryGlyph, Cover, fieldClass } from "@/components/directory/bits"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useDirectory } from "@/lib/directory-context"
import { fold } from "@/lib/format"
import { sectorIcons, sectorPhotos, sectorTints } from "@/lib/sectors"
import type { BookingKind } from "@/lib/types"

export function SectorForm({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { addSector } = useDirectory()
  const [label, setLabel] = useState("")
  const [blurb, setBlurb] = useState("")
  const [phrases, setPhrases] = useState("")
  const [booking, setBooking] = useState<BookingKind>("teklif")
  const [photo, setPhoto] = useState(sectorPhotos[0])
  const [icon, setIcon] = useState(sectorIcons[0] ?? "building")
  const [tint, setTint] = useState(sectorTints[0] ?? "#243044")
  const [error, setError] = useState("")

  function reset() {
    setLabel("")
    setBlurb("")
    setPhrases("")
    setBooking("teklif")
    setPhoto(sectorPhotos[0])
    setIcon(sectorIcons[0] ?? "building")
    setTint(sectorTints[0] ?? "#243044")
    setError("")
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const sector = addSector({
      label,
      blurb: blurb.trim() || `${label.trim()} işletmeleri`,
      phrases: phrases
        .split(/[,;\n]/)
        .map((item) => fold(item))
        .filter(Boolean),
      booking,
      photo,
      icon,
      tint,
    })
    if (!sector) {
      setError("Sektör adı en az iki karakter olmalı.")
      return
    }
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      {open ? (
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">Sektör ekle</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-6 text-muted-foreground">
            Yeni sektör arama, talep ve işletme kaydında hemen görünür. Kayıt bu tarayıcıda durur.
          </p>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="sector-label">Ad</Label>
              <Input
                id="sector-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Örn. Bisiklet tamiri"
                className="h-11"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sector-blurb">Kısa açıklama</Label>
              <Input
                id="sector-blurb"
                value={blurb}
                onChange={(event) => setBlurb(event.target.value)}
                placeholder="Servis, yedek parça, kiralama"
                className="h-11"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sector-phrases">Arama sözcükleri</Label>
              <Textarea
                id="sector-phrases"
                value={phrases}
                onChange={(event) => setPhrases(event.target.value)}
                placeholder="bisiklet, jant, lastik, tamir"
                className="min-h-20"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sector-booking">Varsayılan işlem</Label>
              <select
                id="sector-booking"
                className={fieldClass}
                value={booking}
                onChange={(event) => setBooking(event.target.value as BookingKind)}
              >
                <option value="teklif">Teklif iste</option>
                <option value="randevu">Randevu al</option>
                <option value="rezervasyon">Rezervasyon</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <p className="text-sm font-medium">Renk</p>
              <div className="flex flex-wrap gap-2">
                {sectorTints.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-label={item}
                    onClick={() => setTint(item)}
                    className="size-7 rounded-full ring-2 ring-offset-2"
                    style={{
                      background: item,
                      boxShadow: tint === item ? `0 0 0 2px ${item}` : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="grid gap-1.5">
              <p className="text-sm font-medium">Simge</p>
              <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
                {sectorIcons.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-label={item}
                    onClick={() => setIcon(item)}
                    className={
                      icon === item
                        ? "grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"
                        : "grid size-9 place-items-center rounded-xl bg-secondary"
                    }
                  >
                    <CategoryGlyph icon={item} className="size-4" />
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-1.5">
              <p className="text-sm font-medium">Kapak</p>
              <div className="grid grid-cols-5 gap-2">
                {sectorPhotos.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPhoto(item)}
                    className={
                      photo === item
                        ? "relative h-12 overflow-hidden rounded-xl ring-2 ring-primary"
                        : "relative h-12 overflow-hidden rounded-xl ring-1 ring-foreground/10"
                    }
                  >
                    <Cover src={item} alt="" className="absolute inset-0 size-full" />
                  </button>
                ))}
              </div>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="h-11 rounded-xl">
              Sektörü kaydet
            </Button>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
