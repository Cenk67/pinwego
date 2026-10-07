"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { Check } from "lucide-react"
import { getBusiness } from "@/lib/businesses"
import { saveBooking } from "@/lib/storage"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useBrowserValue } from "@/lib/use-browser"

const TIMES = ["09:30", "10:00", "11:30", "13:00", "14:30", "16:00", "18:00", "19:30"]

function datesFromToday(n = 7) {
  const out: { iso: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    out.push({
      iso: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("tr-TR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    })
  }
  return out
}

function Inner({ slug }: { slug: string }) {
  const params = useSearchParams()
  const business = getBusiness(slug)
  const preset = params.get("hizmet")
  const services = business?.services ?? []
  const [serviceId, setServiceId] = useState(preset && services.some((s) => s.id === preset) ? preset : services[0]?.id)
  const [staffId, setStaffId] = useState(business?.staff?.[0]?.id)
  const days = useBrowserValue(datesFromToday, [] as { iso: string; label: string }[])
  const [date, setDate] = useState("")
  const [time, setTime] = useState<string>()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [done, setDone] = useState<string>()
  const selectedDate = date || days[0]?.iso || ""

  if (!business || !services.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-3xl">Bu işletmede online randevu yok</h1>
        <Link href={`/isletme/${slug}`} className={cn(buttonVariants(), "mt-6 inline-flex")}>
          Profile dön
        </Link>
      </div>
    )
  }

  const service = services.find((s) => s.id === serviceId) ?? services[0]
  const staff = business.staff?.find((s) => s.id === staffId)

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-teal text-teal-foreground">
          <Check />
        </div>
        <h1 className="mt-4 text-3xl">Randevu alındı</h1>
        <p className="mt-2 text-muted-foreground">
          {service.name} · {selectedDate} {time}
          {staff ? ` · ${staff.name}` : ""}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Kod: {done}</p>
        <Link href={`/isletme/${slug}`} className={cn(buttonVariants(), "mt-6 inline-flex")}>
          Profile dön
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <p className="text-sm text-muted-foreground">{business.name}</p>
      <h1 className="mt-1 text-3xl md:text-4xl">Hizmet seç, saatini kilitle</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Booksy akışı: hizmet → (usta) → gün → saat → iletişim.
      </p>

      <ol className="mt-8 space-y-8">
        <li>
          <h2 className="text-lg">1. Hizmet</h2>
          <div className="mt-3 grid gap-2">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setServiceId(s.id)}
                className={cn(
                  "rounded-2xl p-4 text-left ring-1 transition",
                  serviceId === s.id
                    ? "bg-accent ring-primary"
                    : "bg-card ring-foreground/10 hover:ring-foreground/20"
                )}
              >
                <div className="flex justify-between gap-3">
                  <span className="font-medium">{s.name}</span>
                  <span>{s.price === 0 ? "Ücretsiz" : `₺${s.price.toLocaleString("tr-TR")}`}</span>
                </div>
                <p className="text-sm text-muted-foreground">{s.durationMin} dakika</p>
              </button>
            ))}
          </div>
        </li>

        {business.staff && (
          <li>
            <h2 className="text-lg">2. Uzman</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {business.staff.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStaffId(s.id)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm ring-1",
                    staffId === s.id
                      ? "bg-foreground text-background ring-foreground"
                      : "bg-card ring-foreground/10"
                  )}
                >
                  {s.name} · {s.role}
                </button>
              ))}
            </div>
          </li>
        )}

        <li>
          <h2 className="text-lg">Gün ve saat</h2>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {days.map((d) => (
              <button
                key={d.iso}
                type="button"
                onClick={() => setDate(d.iso)}
                    className={cn(
                  "min-w-[5.5rem] rounded-xl px-3 py-2 text-sm ring-1",
                  selectedDate === d.iso
                    ? "bg-foreground text-background ring-foreground"
                    : "bg-card ring-foreground/10"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
            {TIMES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTime(t)}
                className={cn(
                  "rounded-lg py-2 text-sm ring-1",
                  time === t
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-card ring-foreground/10"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </li>

        <li>
          <h2 className="text-lg">İletişim</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ad">Ad soyad</Label>
              <Input id="ad" className="h-10" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tel">Telefon</Label>
              <Input id="tel" className="h-10" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
        </li>
      </ol>

      <Button
        size="lg"
        className="mt-8 h-12 w-full"
        disabled={!time || name.trim().length < 2 || phone.trim().length < 7}
        onClick={() => {
          const id = `LMN-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
          saveBooking({
            id,
            slug: business.slug,
            businessName: business.name,
            serviceName: service.name,
            staff: staff?.name,
            date: selectedDate,
            time: time ?? "",
            customer: name.trim(),
            phone: phone.trim(),
            createdAt: new Date().toISOString(),
          })
          setDone(id)
        }}
      >
        Randevuyu onayla
      </Button>
    </div>
  )
}

export function BookingClient({ slug }: { slug: string }) {
  return (
    <Suspense>
      <Inner slug={slug} />
    </Suspense>
  )
}
