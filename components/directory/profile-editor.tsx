"use client"

import { useState } from "react"
import { fieldClass } from "@/components/directory/bits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MarkedPhoto } from "@/components/directory/marked-photo"
import { GALLERY_HEIGHT, GALLERY_WIDTH } from "@/lib/gallery-mark"
import { scaleGalleryFile, scaleImageFile } from "@/lib/image-scale"
import {
  GALLERY_LIMIT,
  moveItem,
  profileReadiness,
  suggestAiTags,
  tagKey,
} from "@/lib/profile"
import type { Business, BusinessProfile, DayHours, GalleryItem, ProfileChoice, ProfileService } from "@/lib/types"

const PAYMENTS = ["Nakit", "Kart", "Havale", "Online"]

export function ProfileEditor({
  business,
  value,
  onChange,
  hours,
  onHours,
  allowPublish,
}: {
  business: Business
  value: BusinessProfile
  onChange: (next: BusinessProfile) => void
  hours: DayHours[]
  onHours: (next: DayHours[]) => void
  allowPublish: boolean
}) {
  const [notice, setNotice] = useState("")
  const readiness = profileReadiness(value)

  function propose() {
    const next = suggestAiTags(business, value)
    onChange({ ...value, pendingAiTags: [...value.pendingAiTags, ...next] })
    setNotice(next.length ? `${next.length} etiket onay bekliyor.` : "Yeni öneri kalmadı.")
  }

  function approve(tag: string) {
    onChange({
      ...value,
      aiTags: [...value.aiTags, tag],
      pendingAiTags: value.pendingAiTags.filter((item) => tagKey(item) !== tagKey(tag)),
    })
  }

  return (
    <div className="grid gap-6">
      <p className="text-sm leading-6 text-muted-foreground">
        Profil doluluk {readiness}/100. SEO etiketleri arama motoru içindir. AI etiketleri kullanıcının niyetini taşır ve
        onaylanmadan yayına çıkmaz. Eşleşme skoru ziyaretçiye gösterilmez.
      </p>
      <fieldset className="grid gap-3">
        <legend className="font-heading text-xl">Kısa okuma</legend>
        <Field label="Kısa başlık" value={value.shortTitle} onChange={(shortTitle) => onChange({ ...value, shortTitle })} />
        <Area label="Kısa özet" value={value.shortBody} onChange={(shortBody) => onChange({ ...value, shortBody })} />
        <TagField
          label="Öne çıkanlar"
          values={value.highlights}
          onChange={(highlights) => onChange({ ...value, highlights: highlights.slice(0, 6) })}
        />
      </fieldset>
      <fieldset className="grid gap-3">
        <legend className="font-heading text-xl">Hakkımızda</legend>
        <Field label="Başlık" value={value.aboutTitle} onChange={(aboutTitle) => onChange({ ...value, aboutTitle })} />
        <Area label="İçerik" value={value.aboutBody} onChange={(aboutBody) => onChange({ ...value, aboutBody })} />
        <Field label="SEO başlık" value={value.seoTitle} onChange={(seoTitle) => onChange({ ...value, seoTitle })} />
        <Area label="SEO açıklama" value={value.seoDescription} onChange={(seoDescription) => onChange({ ...value, seoDescription })} />
        <TagField label="SEO etiketleri" values={value.seoTags} onChange={(seoTags) => onChange({ ...value, seoTags })} />
        <TagField label="AI etiketleri" values={value.aiTags} onChange={(aiTags) => onChange({ ...value, aiTags })} />
        <div className="rounded-2xl bg-secondary/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">AI etiket önerileri</p>
            <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={propose}>
              AI etiketleri oluştur
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {value.pendingAiTags.length ? (
              value.pendingAiTags.map((tag) => (
                <button key={tag} type="button" className="rounded-full bg-card px-3 py-1 text-sm ring-1 ring-foreground/10" onClick={() => approve(tag)}>
                  + {tag}
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Öneri yok. Düğme kategori, hizmet ve konuma göre üretir.</p>
            )}
          </div>
          {value.pendingAiTags.length ? (
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-9 rounded-xl"
              onClick={() => onChange({ ...value, aiTags: [...value.aiTags, ...value.pendingAiTags], pendingAiTags: [] })}
            >
              Tümünü onayla
            </Button>
          ) : null}
          {notice ? <p className="mt-2 text-sm text-primary">{notice}</p> : null}
        </div>
      </fieldset>
      <fieldset className="grid gap-3">
        <legend className="font-heading text-xl">İşletme özeti</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kuruluş yılı" value={value.founded} onChange={(founded) => onChange({ ...value, founded })} />
          <Field label="Hizmet bölgesi" value={value.serviceArea} onChange={(serviceArea) => onChange({ ...value, serviceArea })} />
          <Field label="Çalışan sayısı" value={value.staffCount} onChange={(staffCount) => onChange({ ...value, staffCount })} />
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          {PAYMENTS.map((payment) => (
            <label key={payment} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={value.payments.includes(payment)}
                onChange={(event) =>
                  onChange({
                    ...value,
                    payments: event.target.checked
                      ? [...value.payments, payment]
                      : value.payments.filter((item) => item !== payment),
                  })
                }
              />
              {payment}
            </label>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ChoiceField label="Otopark" value={value.parking} onChange={(parking) => onChange({ ...value, parking })} />
          <ChoiceField label="Engelli erişimi" value={value.access} onChange={(access) => onChange({ ...value, access })} />
          <ChoiceField label="Randevu sistemi" value={value.appointment} onChange={(appointment) => onChange({ ...value, appointment })} />
          <ChoiceField label="Online hizmet" value={value.online} onChange={(online) => onChange({ ...value, online })} />
          <ChoiceField label="Yerinde hizmet" value={value.onSite} onChange={(onSite) => onChange({ ...value, onSite })} />
        </div>
        <p className="text-sm text-muted-foreground">
          Doğrulama: {business.verified ? "doğrulanmış" : "bekliyor"}. Bunu yalnızca yönetici değiştirir.
        </p>
        {allowPublish ? (
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={value.published}
              onChange={(event) => onChange({ ...value, published: event.target.checked })}
            />
            Yayında
          </label>
        ) : null}
      </fieldset>
      <fieldset className="grid gap-3">
        <legend className="font-heading text-xl">Çalışma saatleri</legend>
        <div className="grid gap-2">
          {hours.map((day, index) => (
            <label key={day.day} className="grid grid-cols-[7rem_1fr] items-center gap-2 text-sm">
              {day.day}
              <Input value={day.hours} onChange={(event) => onHours(hours.map((item, itemIndex) => itemIndex === index ? { ...item, hours: event.target.value } : item))} />
            </label>
          ))}
        </div>
      </fieldset>
      <ServiceEditor value={value} onChange={onChange} />
      <GalleryEditor businessName={business.name} value={value} onChange={onChange} />
    </div>
  )
}

function ServiceEditor({ value, onChange }: { value: BusinessProfile; onChange: (next: BusinessProfile) => void }) {
  function update(index: number, patch: Partial<ProfileService>) {
    onChange({
      ...value,
      services: value.services.map((service, serviceIndex) => (serviceIndex === index ? { ...service, ...patch } : service)),
    })
  }
  return (
    <fieldset className="grid gap-3">
      <legend className="font-heading text-xl">Hizmetler</legend>
      {value.services.map((service, index) => (
        <div key={service.id} className="grid gap-2 rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-8 rounded-lg" onClick={() => onChange({ ...value, services: moveItem(value.services, index, index - 1) })}>Yukarı</Button>
            <Button type="button" variant="outline" className="h-8 rounded-lg" onClick={() => onChange({ ...value, services: moveItem(value.services, index, index + 1) })}>Aşağı</Button>
            <Button type="button" variant="outline" className="h-8 rounded-lg" onClick={() => onChange({ ...value, services: value.services.filter((_, serviceIndex) => serviceIndex !== index) })}>Sil</Button>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={service.active} onChange={(event) => update(index, { active: event.target.checked })} />
              Aktif
            </label>
          </div>
          <Field label="Hizmet adı" value={service.name} onChange={(name) => update(index, { name })} />
          <Field label="Kısa açıklama" value={service.summary} onChange={(summary) => update(index, { summary })} />
          <Area label="Detay" value={service.detail} onChange={(detail) => update(index, { detail })} />
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Fiyat" value={String(service.price)} onChange={(price) => update(index, { price: Number(price.replace(/\D/g, "")) || 0 })} />
            <Field label="Birim" value={service.unit} onChange={(unit) => update(index, { unit })} />
            <Field label="Süre" value={service.duration} onChange={(duration) => update(index, { duration })} />
            <Field label="Bölge" value={service.area} onChange={(area) => update(index, { area })} />
          </div>
          <TagField label="SEO etiketleri" values={service.seoTags} onChange={(seoTags) => update(index, { seoTags })} />
          <TagField label="AI etiketleri" values={service.aiTags} onChange={(aiTags) => update(index, { aiTags })} />
          <label className="text-sm">
            Hizmet görseli
            <input
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-sm"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                event.target.value = ""
                if (!file) return
                try {
                  const scaled = await scaleImageFile(file, 1200)
                  update(index, { image: scaled.dataUrl, alt: service.alt || service.name })
                } catch {
                  /* görsel okunamazsa hizmet metni durur */
                }
              }}
            />
          </label>
          {service.image ? <img src={service.image} alt="" className="h-20 w-32 rounded-xl object-cover" /> : null}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="h-10 rounded-xl"
        onClick={() =>
          onChange({
            ...value,
            services: [
              ...value.services,
              {
                id: `hizmet-${Date.now()}`,
                name: "",
                summary: "",
                detail: "",
                price: 0,
                unit: "",
                duration: "",
                area: value.serviceArea,
                image: "",
                alt: "",
                seoTags: [],
                aiTags: [],
                active: true,
                order: value.services.length,
              },
            ],
          })
        }
      >
        Hizmet ekle
      </Button>
    </fieldset>
  )
}

function GalleryEditor({
  businessName,
  value,
  onChange,
}: {
  businessName: string
  value: BusinessProfile
  onChange: (next: BusinessProfile) => void
}) {
  const [error, setError] = useState("")
  function update(index: number, patch: Partial<GalleryItem>) {
    onChange({
      ...value,
      gallery: value.gallery.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    })
  }
  async function addFiles(list: FileList | File[]) {
    const room = GALLERY_LIMIT - value.gallery.length
    const files = [...list].slice(0, room)
    if (!files.length) {
      setError(`Galeri ${GALLERY_LIMIT} görsel ile dolu.`)
      return
    }
    const added: GalleryItem[] = []
    try {
      for (const file of files) {
        const scaled = await scaleGalleryFile(file)
        added.push({
          id: `galeri-${Date.now()}-${added.length}`,
          image: scaled.dataUrl,
          title: businessName,
          description: "",
          alt: businessName,
          seoTags: [],
          aiTags: [],
          active: true,
          order: value.gallery.length + added.length,
        })
        setError(`${scaled.sourceWidth}×${scaled.sourceHeight} görsel ${GALLERY_WIDTH}×${GALLERY_HEIGHT} ölçüsüne kırpıldı.`)
      }
      onChange({ ...value, gallery: [...value.gallery, ...added].slice(0, GALLERY_LIMIT) })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Görsel eklenemedi.")
    }
  }
  return (
    <fieldset className="grid gap-3">
      <legend className="font-heading text-xl">Galeri</legend>
      <p className="text-sm leading-6 text-muted-foreground">
        {value.gallery.length}/{GALLERY_LIMIT} görsel. Şerit sağdan sola kayar. Yüklenen görsel {GALLERY_WIDTH}×{GALLERY_HEIGHT}
        ölçüsüne kırpılır. Kartın altında işletme adı ve açıklama durur. Görselin üzerinde şeffaf “{businessName}” filigranı vardır.
      </p>
      {value.gallery.map((item, index) => (
        <div key={item.id} className="grid gap-2 rounded-2xl bg-card p-3 ring-1 ring-foreground/10 sm:grid-cols-[9rem_1fr]">
          <div
            draggable
            onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const from = Number(event.dataTransfer.getData("text/plain"))
              if (Number.isInteger(from)) onChange({ ...value, gallery: moveItem(value.gallery, from, index) })
            }}
          >
            <MarkedPhoto src={item.image} name={businessName} alt="" className="aspect-[4/3] h-24 w-full rounded-xl object-cover" />
          </div>
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-8 rounded-lg" onClick={() => onChange({ ...value, gallery: moveItem(value.gallery, index, index - 1) })}>Yukarı</Button>
              <Button type="button" variant="outline" className="h-8 rounded-lg" onClick={() => onChange({ ...value, gallery: moveItem(value.gallery, index, index + 1) })}>Aşağı</Button>
              <Button type="button" variant="outline" className="h-8 rounded-lg" onClick={() => onChange({ ...value, gallery: value.gallery.filter((_, itemIndex) => itemIndex !== index) })}>Sil</Button>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={item.active} onChange={(event) => update(index, { active: event.target.checked })} />
                Aktif
              </label>
            </div>
            <p className="text-sm font-medium">{businessName}</p>
            <Field label="Açıklama" value={item.description} onChange={(description) => update(index, { description })} />
            <Field label="Alt metin" value={item.alt} onChange={(alt) => update(index, { alt })} />
            <TagField label="SEO etiketleri" values={item.seoTags} onChange={(seoTags) => update(index, { seoTags })} />
            <TagField label="AI etiketleri" values={item.aiTags} onChange={(aiTags) => update(index, { aiTags })} />
            <label className="text-sm">
              Görseli değiştir
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full text-sm"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ""
                  if (!file) return
                  try {
                    const scaled = await scaleGalleryFile(file)
                    update(index, { image: scaled.dataUrl })
                    setError(`Görsel ${GALLERY_WIDTH}×${GALLERY_HEIGHT} olarak değiştirildi.`)
                  } catch (cause) {
                    setError(cause instanceof Error ? cause.message : "Görsel değiştirilemedi.")
                  }
                }}
              />
            </label>
          </div>
        </div>
      ))}
      <label className="text-sm">
        Görsel ekle
        <input
          type="file"
          accept="image/*"
          multiple
          className="mt-1 block w-full text-sm"
          disabled={value.gallery.length >= GALLERY_LIMIT}
          onChange={(event) => {
            const files = [...(event.target.files ?? [])]
            event.target.value = ""
            if (files.length) void addFiles(files)
          }}
        />
      </label>
      {error ? <p className="text-sm text-primary">{error}</p> : null}
    </fieldset>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5 text-sm">
      {label}
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-24" />
    </div>
  )
}

function ChoiceField({ label, value, onChange }: { label: string; value: ProfileChoice; onChange: (value: ProfileChoice) => void }) {
  return (
    <label className="grid gap-1.5 text-sm">
      {label}
      <select className={fieldClass} value={value} onChange={(event) => onChange(event.target.value as ProfileChoice)}>
        <option value="">Belirtilmedi</option>
        <option value="var">Var</option>
        <option value="yok">Yok</option>
      </select>
    </label>
  )
}

function TagField({ label, values, onChange }: { label: string; values: string[]; onChange: (values: string[]) => void }) {
  const [draft, setDraft] = useState("")
  function add() {
    const next = draft.trim()
    if (!next) return
    onChange([...values, next])
    setDraft("")
  }
  return (
    <div className="grid gap-1.5 text-sm">
      {label}
      <div className="flex flex-wrap gap-2">
        {values.map((tag) => (
          <button key={tag} type="button" className="rounded-full bg-secondary px-3 py-1" onClick={() => onChange(values.filter((item) => item !== tag))}>
            {tag} ×
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder="Etiket yaz, ekle"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              add()
            }
          }}
        />
        <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={add}>Ekle</Button>
      </div>
    </div>
  )
}
