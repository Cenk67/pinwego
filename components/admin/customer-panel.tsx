"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fold } from "@/lib/format"

type Status = "bekliyor" | "aktif" | "askida" | "silindi"

type Row = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  birthDate: string
  occupation: string
  status: Status
  createdAt: string
  verifiedAt: string
  updatedAt: string
  lastLoginAt: string
  marketing: boolean
  legacyId: boolean
}

type Consent = { pageId: string; version: string; kind: string; accepted: boolean; at: string; context: string }
type Audit = { at: string; actor: string; action: string; detail: string }
type Totals = { total: number; aktif: number; bekliyor: number; askida: number; silindi: number; verified: number; rate: number }

const statusText: Record<Status, string> = {
  bekliyor: "E-posta doğrulaması bekleniyor",
  aktif: "Aktif",
  askida: "Askıya alınmış",
  silindi: "Silinmiş",
}

export function CustomerPanel() {
  const [items, setItems] = useState<Row[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [note, setNote] = useState("Müşteri listesi açılıyor.")
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const [verified, setVerified] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [selected, setSelected] = useState("")
  const [consents, setConsents] = useState<Consent[]>([])
  const [audit, setAudit] = useState<Audit[]>([])
  const [draft, setDraft] = useState({ firstName: "", lastName: "", birthDate: "", occupation: "", phone: "" })
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function load() {
    const response = await fetch("/api/musteri", { credentials: "include" })
    const data = (await response.json().catch(() => null)) as { ok?: boolean; items?: Row[]; totals?: Totals } | null
    if (!response.ok || !data?.ok || !data.items || !data.totals) {
      setNote("Bu liste yönetici oturumu ister. Müşteri hesabı başka müşterileri göremez.")
      return
    }
    setItems(data.items)
    setTotals(data.totals)
    setNote("")
  }

  useEffect(() => {
    let gone = false
    void fetch("/api/musteri", { credentials: "include" })
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as { ok?: boolean; items?: Row[]; totals?: Totals } | null
        if (gone) return
        if (!response.ok || !data?.ok || !data.items || !data.totals) {
          setNote("Bu liste yönetici oturumu ister. Müşteri hesabı başka müşterileri göremez.")
          return
        }
        setItems(data.items)
        setTotals(data.totals)
        setNote("")
      })
      .catch(() => {
        if (!gone) setNote("Müşteri listesi açılamadı.")
      })
    return () => {
      gone = true
    }
  }, [])

  async function open(id: string) {
    setSelected(id)
    setConfirmDelete(false)
    const response = await fetch(`/api/musteri?id=${encodeURIComponent(id)}`, { credentials: "include" })
    const data = (await response.json().catch(() => null)) as { ok?: boolean; item?: Row; consents?: Consent[]; audit?: Audit[] } | null
    if (!data?.ok || !data.item) {
      setNote("Kayıt açılamadı.")
      return
    }
    setConsents(data.consents ?? [])
    setAudit(data.audit ?? [])
    setDraft({
      firstName: data.item.firstName,
      lastName: data.item.lastName,
      birthDate: data.item.birthDate,
      occupation: data.item.occupation,
      phone: data.item.phone,
    })
  }

  async function post(body: Record<string, unknown>) {
    setNote("")
    const response = await fetch("/api/musteri", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = (await response.json().catch(() => null)) as { ok?: boolean } | null
    if (!data?.ok) {
      setNote("İşlem kaydedilmedi. Silinmiş hesap yeniden açılamaz. Doğrulanmamış hesap aktif yapılamaz.")
      return
    }
    await load()
    if (typeof body.id === "string") await open(body.id)
  }

  const needle = fold(query.trim())
  const visible = items.filter((item) => {
    const hay = fold(`${item.firstName} ${item.lastName} ${item.email} ${item.id}`)
    if (needle && !hay.includes(needle)) return false
    if (status && item.status !== status) return false
    if (verified === "evet" && !item.verifiedAt) return false
    if (verified === "hayir" && item.verifiedAt) return false
    const day = item.createdAt.slice(0, 10)
    if (from && day < from) return false
    if (to && day > to) return false
    return true
  })
  const current = items.find((item) => item.id === selected) ?? null

  return (
    <div className="mt-8 grid gap-4">
      {totals ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Kayıt", String(totals.total)],
            ["Doğrulanan", String(totals.verified)],
            ["Bekleyen", String(totals.bekliyor)],
            ["Doğrulama oranı", `%${totals.rate}`],
          ].map(([label, value]) => (
            <article key={label} className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-2 font-heading text-2xl">{value}</p>
            </article>
          ))}
        </div>
      ) : null}
      <p className="text-sm leading-6 text-muted-foreground">
        Günlük kayıt sayıları Analitik sekmesindedir. Buradaki sayılar bu listeden gelir ve aynı olayı ikinci kez saymaz.
        Posta hataları Bildirim sekmesindedir. Eski müşteriler, yeniden giriş yapınca bu listeye düşer. Parola ve doğrulama
        bağlantısı burada görünmez.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ad, e-posta veya kayıt no" className="h-11" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-xl bg-card px-3 text-sm ring-1 ring-foreground/10">
          <option value="">Tüm durumlar</option>
          <option value="bekliyor">E-posta doğrulaması bekleniyor</option>
          <option value="aktif">Aktif</option>
          <option value="askida">Askıya alınmış</option>
          <option value="silindi">Silinmiş</option>
        </select>
        <select value={verified} onChange={(event) => setVerified(event.target.value)} className="h-11 rounded-xl bg-card px-3 text-sm ring-1 ring-foreground/10">
          <option value="">Doğrulama: hepsi</option>
          <option value="evet">Doğrulandı</option>
          <option value="hayir">Doğrulanmadı</option>
        </select>
        <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="Başlangıç" className="h-11" />
        <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="Bitiş" className="h-11" />
      </div>
      {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
      <ul className="grid gap-2">
        {visible.map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => void open(item.id)} className="w-full rounded-3xl bg-card px-4 py-3 text-left ring-1 ring-foreground/10">
              <p className="font-medium">{item.status === "silindi" ? "Silinen hesap" : `${item.firstName} ${item.lastName}`.trim() || item.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.email} · {statusText[item.status]} · {item.createdAt.slice(0, 10)}
                {item.marketing ? " · kampanya açık" : " · kampanya kapalı"}
                {item.legacyId ? " · eski kimlik kaydı var" : ""}
              </p>
            </button>
          </li>
        ))}
      </ul>
      {current ? (
        <article className="grid gap-4 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
          <div>
            <h2 className="font-heading text-2xl">{current.firstName} {current.lastName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{statusText[current.status]} · {current.id}</p>
          </div>
          <dl className="grid gap-2 sm:grid-cols-2">
            {[
              ["E-posta", current.email],
              ["GSM", current.phone || "—"],
              ["Doğum tarihi", current.birthDate || "—"],
              ["Meslek", current.occupation || "—"],
              ["Kayıt", current.createdAt.slice(0, 16).replace("T", " ")],
              ["Doğrulama", current.verifiedAt ? current.verifiedAt.slice(0, 16).replace("T", " ") : "bekliyor"],
              ["Son giriş", current.lastLoginAt ? current.lastLoginAt.slice(0, 16).replace("T", " ") : "yok"],
              ["Kampanya", current.marketing ? "açık" : "kapalı"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-sm">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => void post({ op: "durum", id: current.id, status: "askida" })}>Askıya al</Button>
            <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => void post({ op: "durum", id: current.id, status: "aktif" })}>Aktifleştir</Button>
            {confirmDelete ? (
              <Button type="button" className="h-10 rounded-xl" onClick={() => void post({ op: "durum", id: current.id, status: "silindi" })}>Silmeyi kaydet</Button>
            ) : (
              <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => setConfirmDelete(true)}>Silinmiş işaretle</Button>
            )}
            {current.marketing ? (
              <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => void post({ op: "pazarlama", id: current.id, accepted: false })}>Kampanyayı kapat</Button>
            ) : null}
          </div>
          {current.status !== "silindi" ? (
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault()
                void post({ op: "duzelt", id: current.id, ...draft })
              }}
            >
              <div className="grid gap-1.5">
                <Label htmlFor="fix-first">Adı</Label>
                <Input id="fix-first" value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} className="h-11" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fix-last">Soyadı</Label>
                <Input id="fix-last" value={draft.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} className="h-11" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fix-birth">Doğum tarihi</Label>
                <Input id="fix-birth" type="date" value={draft.birthDate} onChange={(event) => setDraft({ ...draft, birthDate: event.target.value })} className="h-11" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fix-job">Meslek</Label>
                <Input id="fix-job" value={draft.occupation} onChange={(event) => setDraft({ ...draft, occupation: event.target.value })} className="h-11" />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="fix-phone">GSM</Label>
                <Input id="fix-phone" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} className="h-11" />
              </div>
              <Button type="submit" className="h-11 rounded-xl sm:col-span-2">Düzeltmeyi kaydet</Button>
            </form>
          ) : null}
          <div>
            <h3 className="font-medium">Onay kayıtları</h3>
            <ul className="mt-2 grid gap-1 text-sm">
              {consents.map((item) => (
                <li key={`${item.pageId}-${item.at}-${item.context}`}>{item.pageId} · sürüm {item.version} · {item.accepted ? "kabul" : "ret"} · {item.at.slice(0, 16).replace("T", " ")}</li>
              ))}
              {consents.length === 0 ? <li className="text-muted-foreground">Onay satırı yok.</li> : null}
            </ul>
          </div>
          <div>
            <h3 className="font-medium">İşlem günlüğü</h3>
            <ul className="mt-2 grid gap-1 text-sm">
              {audit.map((item) => (
                <li key={`${item.at}-${item.action}`}>{item.at.slice(0, 16).replace("T", " ")} · {item.actor} · {item.action} · {item.detail}</li>
              ))}
              {audit.length === 0 ? <li className="text-muted-foreground">Henüz işlem yok.</li> : null}
            </ul>
          </div>
        </article>
      ) : null}
    </div>
  )
}
