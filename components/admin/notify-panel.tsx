"use client"

import { useEffect, useState } from "react"
import { fieldClass } from "@/components/directory/bits"
import { Button } from "@/components/ui/button"
import type { NoticeKind, NotifyAudit, NotifyEvent, NotifySettings } from "@/lib/admin-notify"

const toggles: { key: keyof NotifySettings; label: string; help: string }[] = [
  { key: "musteri", label: "Yeni müşteri", help: "Sunucuda açılan müşteri kaydı." },
  { key: "isletme", label: "Yeni işletme", help: "Sunucuda açılan işletme kaydı." },
  { key: "dogrulama", label: "E-posta doğrulaması", help: "Doğrulama bağlantısı kullanıldığında." },
  { key: "guvenlik", label: "Güvenlik", help: "Yönetici oturumu ve kayıt sınırı." },
  { key: "sistem", label: "Sistem hatası", help: "Kullanıcı postası gidemezse işlem silinmez; uyarı düşer." },
  { key: "gunluk", label: "Günlük özet", help: "Sabah 08:00’de bir önceki gün, bir kez." },
  { key: "haftalik", label: "Haftalık rapor", help: "Pazartesi 08:00’de bir önceki hafta, bir kez." },
]

const routeKinds: { id: NoticeKind; label: string }[] = [
  { id: "musteri", label: "Müşteri" },
  { id: "isletme", label: "İşletme" },
  { id: "dogrulama", label: "Doğrulama" },
  { id: "guvenlik", label: "Güvenlik" },
  { id: "sistem", label: "Sistem" },
  { id: "ozet", label: "Özet" },
]

const kindLabel: Record<string, string> = {
  musteri: "Müşteri",
  isletme: "İşletme",
  dogrulama: "Doğrulama",
  suphe: "Şüpheli kayıt",
  guvenlik: "Güvenlik",
  sistem: "Sistem",
  odeme: "Ödeme",
  ozet: "Özet",
}

const statusLabel: Record<string, string> = {
  kayit: "Kaydedildi",
  gonderildi: "Gönderildi",
  hata: "Gidmedi",
  atlandi: "Atlandı",
}

type Payload = {
  ok: boolean
  reason?: string
  error?: string
  today?: string
  settings?: NotifySettings
  events?: NotifyEvent[]
  audits?: NotifyAudit[]
  usingFallback?: boolean
}

function stamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" }).format(date)
}

export function NotifyPanel() {
  const [settings, setSettings] = useState<NotifySettings | null>(null)
  const [events, setEvents] = useState<NotifyEvent[]>([])
  const [audits, setAudits] = useState<NotifyAudit[]>([])
  const [fallback, setFallback] = useState(true)
  const [recipients, setRecipients] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const [extraKind, setExtraKind] = useState<NoticeKind>("musteri")
  const [extraEmail, setExtraEmail] = useState("")

  function apply(data: Payload) {
    if (!data.settings) return
    setSettings(data.settings)
    setRecipients(data.settings.recipients.join("\n"))
    setEvents(data.events ?? [])
    setAudits(data.audits ?? [])
    setFallback(Boolean(data.usingFallback))
  }

  useEffect(() => {
    void fetch("/api/bildirim", { credentials: "include" })
      .then(async (response) => {
        const data = (await response.json()) as Payload
        if (!response.ok || !data.ok) {
          setError(data.reason === "yetki" ? "Yönetici oturumu gerekli. Kodla yeniden gir." : "Bildirim ayarları açılamadı.")
          return
        }
        apply(data)
      })
      .catch(() => setError("Bildirim ayarları açılamadı."))
  }, [])

  async function send(body: Record<string, unknown>) {
    setPending(true)
    setError("")
    try {
      const response = await fetch("/api/bildirim", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = (await response.json()) as Payload
      if (!response.ok || !data.ok) {
        setError(data.error || (data.reason === "limited" ? "Deneme sınırı doldu. Biraz sonra tekrar dene." : "Kayıt güncellenemedi."))
        return
      }
      if (data.settings && data.events) apply(data)
      else if (data.settings) {
        setSettings(data.settings)
        setRecipients(data.settings.recipients.join("\n"))
        setAudits(data.audits ?? [])
        setFallback(data.settings.recipients.length === 0)
      }
    } catch {
      setError("Kayıt güncellenemedi.")
    } finally {
      setPending(false)
    }
  }

  function save() {
    if (!settings) return
    void send({
      op: "settings.save",
      settings: { ...settings, recipients: recipients.split("\n").map((item) => item.trim()).filter(Boolean) },
    })
  }

  function addRoute() {
    if (!settings || !extraEmail.trim()) return
    const current = settings.routes[extraKind] ?? []
    setSettings({ ...settings, routes: { ...settings.routes, [extraKind]: [...current, extraEmail.trim()] } })
    setExtraEmail("")
  }

  function removeRoute(kind: NoticeKind, email: string) {
    if (!settings) return
    const next = (settings.routes[kind] ?? []).filter((item) => item !== email)
    const routes = { ...settings.routes }
    if (next.length) routes[kind] = next
    else delete routes[kind]
    setSettings({ ...settings, routes })
  }

  if (!settings) return <p className="mt-8 text-sm text-muted-foreground">{error || "Bildirim merkezi yükleniyor."}</p>

  return (
    <div className="mt-8 grid gap-4">
      <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="font-heading text-2xl">E-posta ayarları</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Postalar kayıt numarasını, türü, İstanbul saatini ve yönetim bağlantısını taşır. Parola, kod ve kimlik numarası yazılmaz.
          {fallback ? " Alıcı yazılmadığında posta, yönetici kodunun gittiği kutuya düşer. O adres bu ekranda görünmez." : " Yazılan alıcılar kullanılır."}
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Kampanya, galeri, profil ve şikayet kayıtları bu tarayıcıda durur. Bu merkez yalnızca sunucunun gördüğü kayıt, doğrulama ve güvenlik olaylarını yollar.
          Ödeme anahtarı yok: banka tahsilatı bağlı değil.
        </p>
      </section>
      {error ? <p className="rounded-2xl bg-destructive/10 px-3 py-3 text-sm text-destructive" role="alert">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {toggles.map((item) => (
          <label key={item.key} className="rounded-3xl bg-card p-4 text-sm ring-1 ring-foreground/10">
            <span className="flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={Boolean(settings[item.key])}
                onChange={(event) => setSettings({ ...settings, [item.key]: event.target.checked })}
              />
              {item.label}
            </span>
            <span className="mt-2 block text-muted-foreground">{item.help}</span>
          </label>
        ))}
        <div className="rounded-3xl bg-secondary/60 p-4 text-sm ring-1 ring-foreground/10">
          <p className="font-medium">Onay kuyruğu bağlı değil</p>
          <p className="mt-2 text-muted-foreground">Yeni başvuru, profil değişikliği, kampanya ve galeri için sunucuda bekleyen bir onay kaydı yok. Sahte onay postası üretilmez.</p>
        </div>
      </div>
      <section className="grid gap-4 rounded-3xl bg-card p-5 ring-1 ring-foreground/10 lg:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Bildirim adresleri</span>
          <textarea className={`${fieldClass} min-h-28 py-3`} value={recipients} onChange={(event) => setRecipients(event.target.value)} placeholder={"her satıra bir adres"} />
          <span className="text-muted-foreground">En fazla beş adres. Kategoriye özel adresler bunların yanına eklenir.</span>
        </label>
        <div className="grid gap-3 text-sm">
          <label className="grid gap-1">
            <span className="font-medium">Önem eşiği</span>
            <select className={fieldClass} value={settings.minLevel} onChange={(event) => setSettings({ ...settings, minLevel: event.target.value as NotifySettings["minLevel"] })}>
              <option value="bilgi">Bilgi ve üzeri</option>
              <option value="onemli">Önemli ve kritik</option>
              <option value="kritik">Yalnızca kritik</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="font-medium">Aynı olayın tekrar aralığı (dakika)</span>
            <input className={fieldClass} inputMode="numeric" value={String(settings.repeatMinutes)} onChange={(event) => setSettings({ ...settings, repeatMinutes: Number(event.target.value.replace(/\D/g, "").slice(0, 4) || "0") })} />
          </label>
          <div className="grid gap-2">
            <span className="font-medium">Kategoriye ek alıcı</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select className={fieldClass} value={extraKind} onChange={(event) => setExtraKind(event.target.value as NoticeKind)}>
                {routeKinds.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <input className={fieldClass} value={extraEmail} onChange={(event) => setExtraEmail(event.target.value)} placeholder="ek adres" />
              <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={addRoute}>Ekle</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {routeKinds.flatMap((item) => (settings.routes[item.id] ?? []).map((email) => (
                <button key={`${item.id}-${email}`} type="button" className="rounded-full bg-secondary px-3 py-1 text-xs" onClick={() => removeRoute(item.id, email)}>
                  {item.label}: {email} ×
                </button>
              )))}
            </div>
          </div>
        </div>
      </section>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="h-11 rounded-xl" disabled={pending} onClick={save}>Ayarları kaydet</Button>
        <Button type="button" variant="outline" className="h-11 rounded-xl" disabled={pending} onClick={() => void send({ op: "test.send" })}>Deneme postası gönder</Button>
      </div>
      <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="font-heading text-2xl">Gönderim geçmişi</h2>
        {events.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Henüz kayıt yok. Yeni bir müşteri veya işletme kaydı burada görünür.</p> : null}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">Olay</th>
                <th className="py-2 pr-3 font-medium">Zaman</th>
                <th className="py-2 pr-3 font-medium">Alıcı</th>
                <th className="py-2 pr-3 font-medium">Durum</th>
                <th className="py-2 font-medium">Kayıt</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 40).map((item) => (
                <tr key={item.id} className="border-t border-foreground/10">
                  <td className="py-2 pr-3">{kindLabel[item.kind] ?? item.kind}<span className="mt-1 block text-muted-foreground">{item.title}</span></td>
                  <td className="py-2 pr-3 whitespace-nowrap">{stamp(item.at)}</td>
                  <td className="py-2 pr-3">{item.to || "—"}</td>
                  <td className="py-2 pr-3">{statusLabel[item.status] ?? item.status}{item.error ? <span className="mt-1 block text-muted-foreground">{item.error}</span> : null}</td>
                  <td className="py-2">{item.ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="font-heading text-2xl">Denetim</h2>
        {audits.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Ayar değişikliği ve deneme gönderimi burada durur.</p> : null}
        <ul className="mt-3 grid gap-2 text-sm">
          {audits.slice(0, 12).map((item) => (
            <li key={`${item.at}-${item.action}`} className="rounded-2xl bg-secondary/50 px-3 py-2">
              <span className="text-muted-foreground">{stamp(item.at)}</span>
              <span className="mt-1 block">{item.action}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
