"use client"

import { useState } from "react"
import { Cover } from "@/components/directory/bits"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AD_SLOTS, adHref, adImage, slotLabel } from "@/lib/ads"
import { useDirectory } from "@/lib/directory-context"
import type { Ad, AdSlotId } from "@/lib/types"

function blankAd(): Ad {
  return {
    id: `reklam-${Date.now().toString(36)}`,
    advertiser: "",
    title: "",
    body: "",
    href: "",
    image: "/photos/cafe.jpg",
    placements: ["anasayfa-ust"],
    active: true,
  }
}

export function AdAdmin() {
  const { ads, saveAd, removeAd } = useDirectory()
  const [editor, setEditor] = useState<Ad | null>(null)
  const published = ads.filter((ad) => ad.active).length

  return (
    <div className="mt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Yayındaki reklamlar ana sayfada ve işletme sayfasında, işletme bilgisinin yanında görünür. Kapalı olanlar
          müşteriye gitmez. Kayıt bu tarayıcıda durur.
        </p>
        <Button type="button" className="h-11 rounded-xl" onClick={() => setEditor(blankAd())}>
          Reklam ekle
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {ads.length} reklam · {published} yayında
      </p>
      <div className="mt-4 grid gap-3">
        {ads.map((ad) => (
          <article key={ad.id} className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-primary/10">
                  {adImage(ad.image) ? <Cover src={adImage(ad.image) ?? ""} alt="" className="absolute inset-0 size-full" /> : null}
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{ad.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ad.advertiser}
                    {ad.active ? " · yayında" : " · kapalı"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ad.placements.length ? ad.placements.map((slot) => slotLabel(slot)).join(" · ") : "Alan seçilmedi"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => saveAd({ ...ad, active: !ad.active })}>
                  {ad.active ? "Kapat" : "Yayınla"}
                </Button>
                <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => setEditor(ad)}>
                  Düzenle
                </Button>
                <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => removeAd(ad.id)}>
                  Sil
                </Button>
              </div>
            </div>
          </article>
        ))}
        {!ads.length ? <p className="text-sm text-muted-foreground">Henüz reklam yok. Yeni kayıt ekleyince seçtiğin alanlarda görünür.</p> : null}
      </div>
      {editor ? (
        <AdEditor
          key={editor.id}
          ad={editor}
          onClose={() => setEditor(null)}
          onSave={(ad) => {
            saveAd(ad)
            setEditor(null)
          }}
        />
      ) : null}
    </div>
  )
}

function AdEditor({
  ad,
  onClose,
  onSave,
}: {
  ad: Ad
  onClose: () => void
  onSave: (ad: Ad) => void
}) {
  const [advertiser, setAdvertiser] = useState(ad.advertiser)
  const [title, setTitle] = useState(ad.title)
  const [body, setBody] = useState(ad.body)
  const [href, setHref] = useState(ad.href)
  const [image, setImage] = useState(ad.image)
  const [placements, setPlacements] = useState<AdSlotId[]>(ad.placements)
  const [active, setActive] = useState(ad.active)
  const [error, setError] = useState("")

  function toggle(slot: AdSlotId) {
    setPlacements((current) => (current.includes(slot) ? current.filter((item) => item !== slot) : [...current, slot]))
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">{ad.advertiser ? "Reklamı düzenle" : "Reklam ekle"}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (advertiser.trim().length < 2 || title.trim().length < 2 || body.trim().length < 8) {
              setError("Reklam veren, başlık ve en az bir cümle metin gerekli.")
              return
            }
            if (!placements.length) {
              setError("Reklamın görüneceği en az bir alan seç.")
              return
            }
            if (href.trim() && !adHref(href)) {
              setError("Bağlantı site içi bir yol (/ara) ya da http(s) adresi olmalı.")
              return
            }
            if (image.trim() && !adImage(image)) {
              setError("Görsel site içi bir yol (/photos/cafe.jpg) ya da http(s) adresi olmalı.")
              return
            }
            onSave({
              id: ad.id,
              advertiser: advertiser.trim(),
              title: title.trim(),
              body: body.trim(),
              href: href.trim(),
              image: image.trim(),
              placements,
              active,
            })
          }}
        >
          <Field id="ad-advertiser" label="Reklam veren" value={advertiser} onChange={setAdvertiser} />
          <Field id="ad-title" label="Başlık" value={title} onChange={setTitle} />
          <div className="grid gap-1.5">
            <Label htmlFor="ad-body">Metin</Label>
            <Textarea id="ad-body" value={body} onChange={(event) => setBody(event.target.value)} className="min-h-24" />
          </div>
          <Field id="ad-href" label="Bağlantı" value={href} onChange={setHref} />
          <Field id="ad-image" label="Görsel" value={image} onChange={setImage} />
          <fieldset className="grid gap-2">
            <legend className="text-sm">Görüneceği yerler</legend>
            {AD_SLOTS.map((slot) => (
              <Label key={slot.id} className="gap-2">
                <Checkbox checked={placements.includes(slot.id)} onCheckedChange={() => toggle(slot.id)} />
                {slot.label}
              </Label>
            ))}
          </fieldset>
          <Label className="gap-2">
            <Checkbox checked={active} onCheckedChange={(checked) => setActive(checked === true)} />
            Yayında
          </Label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" className="h-11 flex-1 rounded-xl">
              Kaydet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} className="h-11" />
    </div>
  )
}
