"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CustomerPanel } from "@/components/admin/customer-panel"
import { channelLabel, channels, type Channel, type Template } from "@/lib/comms"
import {
  emptyFilter,
  failText,
  getJson,
  postJson,
  reasonText,
  stamp,
  statusText,
  type Filter,
  type Overview,
  type Providers,
  type PublicJob,
} from "@/components/admin/comms-client"

const sections = [
  { id: "liste", label: "Tüm müşteriler" },
  { id: "gonderim", label: "Toplu gönderim" },
  { id: "sablon", label: "Şablonlar" },
  { id: "gecmis", label: "Gönderim geçmişi" },
  { id: "rapor", label: "Rapor ve denetim" },
] as const

type Section = (typeof sections)[number]["id"]

const selectClass = "h-11 rounded-xl bg-card px-3 text-sm ring-1 ring-foreground/10"

export function CustomerCenter() {
  const [section, setSection] = useState<Section>("liste")
  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={section === item.id ? "rounded-full bg-foreground px-3 py-1.5 text-sm text-background" : "rounded-full bg-card px-3 py-1.5 text-sm ring-1 ring-foreground/10"}
          >
            {item.label}
          </button>
        ))}
      </div>
      {section === "liste" ? <CustomerPanel /> : null}
      {section === "gonderim" ? <BulkSend /> : null}
      {section === "sablon" ? <TemplatesPanel /> : null}
      {section === "gecmis" ? <HistoryPanel /> : null}
      {section === "rapor" ? <ReportPanel /> : null}
    </div>
  )
}

function ProviderLine({ providers }: { providers: Providers | null }) {
  if (!providers) return null
  const line = (label: string, on: boolean) => (
    <span className={on ? "rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary" : "rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"}>
      {label}: {on ? "bağlı" : "bağlı değil"}
    </span>
  )
  return (
    <div className="flex flex-wrap gap-2">
      {line("E-posta", providers.mail)}
      {line("WhatsApp Business API", providers.whatsapp)}
      {line("SMS", providers.sms)}
    </div>
  )
}

type Preview = { matched: number; eligible: number; skipped: Record<string, number>; filter: string; providers: Providers }

function BulkSend() {
  const [channel, setChannel] = useState<Channel>("eposta")
  const [filter, setFilter] = useState<Filter>({ ...emptyFilter })
  const [templates, setTemplates] = useState<Template[]>([])
  const [providers, setProviders] = useState<Providers | null>(null)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [waName, setWaName] = useState("")
  const [waLanguage, setWaLanguage] = useState("tr")
  const [taken, setTaken] = useState<{ signature: string; preview: Preview } | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [job, setJob] = useState<PublicJob | null>(null)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [draining, setDraining] = useState(false)
  const stop = useRef(false)
  const signature = JSON.stringify([channel, filter, subject, body, waName])
  const preview = taken && taken.signature === signature ? taken.preview : null

  useEffect(() => {
    void getJson<Overview>("/api/musteri/iletisim").then((result) => {
      if (result.ok && result.data) {
        setTemplates(result.data.templates)
        setProviders(result.data.providers)
      } else setNote(failText(result.data, "İletişim merkezi açılamadı. Yönetici oturumu gerekir."))
    })
  }, [])

  function pick(id: string) {
    const template = templates.find((item) => item.id === id)
    if (!template) return
    setChannel(template.channel)
    setSubject(template.subject)
    setBody(template.body)
    setWaName(template.waName)
    setWaLanguage(template.waLanguage)
  }

  const serverFilter = { q: filter.q, durum: filter.durum, dogrulama: filter.dogrulama, kanal: filter.kanal, izin: filter.izin, engel: filter.engel, from: filter.from, to: filter.to }

  async function check() {
    setBusy(true)
    setNote("")
    const result = await postJson<Preview>("/api/musteri/iletisim", { op: "onizle", channel, kind: "kampanya", filter: serverFilter })
    setBusy(false)
    if (!result.ok || !result.data) {
      setNote(failText(result.data, "Ön izleme alınamadı."))
      return
    }
    setTaken({ signature, preview: result.data })
    setConfirm(false)
    setProviders(result.data.providers)
  }

  const drain = useCallback(async (id: string) => {
    setDraining(true)
    stop.current = false
    let current: PublicJob | null = null
    for (let index = 0; index < 400 && !stop.current; index += 1) {
      const result = await postJson<{ job: PublicJob }>("/api/musteri/iletisim", { op: "kuyruk.isle", job: id })
      if (!result.ok || !result.data?.job) {
        setNote(failText(result.data, "Kuyruk işlenemedi."))
        break
      }
      current = result.data.job
      setJob(current)
      if (current.status !== "kuyrukta") break
    }
    setDraining(false)
  }, [])

  async function send() {
    if (!preview) return
    setBusy(true)
    setNote("")
    const result = await postJson<{ job: PublicJob }>("/api/musteri/iletisim", {
      op: "gonder",
      channel,
      kind: "kampanya",
      filter: serverFilter,
      subject,
      body,
      waName,
      waLanguage,
      expected: preview.eligible,
      confirm,
    })
    setBusy(false)
    if (!result.ok || !result.data?.job) {
      setNote(failText(result.data, "Gönderim başlatılamadı."))
      if (result.data?.reason === "degisti") setTaken(null)
      return
    }
    setJob(result.data.job)
    setTaken(null)
    setConfirm(false)
    if (result.data.job.status === "kuyrukta") void drain(result.data.job.id)
  }

  async function cancel() {
    if (!job) return
    stop.current = true
    const result = await postJson<{ job: PublicJob }>("/api/musteri/iletisim", { op: "kuyruk.iptal", job: job.id })
    if (result.ok && result.data?.job) setJob(result.data.job)
  }

  const providerOff = providers ? (channel === "eposta" ? !providers.mail : channel === "whatsapp" ? !providers.whatsapp : !providers.sms) : false
  const skipText = (skipped: Record<string, number>) =>
    Object.entries(skipped)
      .map(([key, count]) => `${count} ${reasonText[key] ?? key}`)
      .join(", ")

  return (
    <div className="mt-6 grid gap-4">
      <p className="text-sm leading-6 text-muted-foreground">
        Toplu gönderim yalnız kampanya türündedir ve yalnız o kanalda izni olan, engelsiz, aktif müşterilere gider. Alıcı listesi gönderim anında yeniden
        denetlenir; izni geri çeken müşteri düşer. Önce ön izleme al, sayıyı gör, onay kutusunu işaretle.
      </p>
      <ProviderLine providers={providers} />
      <section className="grid gap-3 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-medium">1. Alıcı süzgeci</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Input value={filter.q} onChange={(event) => setFilter({ ...filter, q: event.target.value })} placeholder="Ad, GSM, e-posta içinde ara" className="h-11 lg:col-span-2" />
          <select value={filter.durum} onChange={(event) => setFilter({ ...filter, durum: event.target.value })} className={selectClass} aria-label="Durum">
            <option value="">Durum: aktif olanlar gider</option>
            <option value="aktif">Yalnız aktif</option>
          </select>
          <select value={filter.engel} onChange={(event) => setFilter({ ...filter, engel: event.target.value })} className={selectClass} aria-label="Engel">
            <option value="">Engelliler zaten düşer</option>
            <option value="yok">Yalnız engelsiz</option>
          </select>
          <Input type="date" value={filter.from} onChange={(event) => setFilter({ ...filter, from: event.target.value })} aria-label="Kayıt başlangıç" className="h-11" />
          <Input type="date" value={filter.to} onChange={(event) => setFilter({ ...filter, to: event.target.value })} aria-label="Kayıt bitiş" className="h-11" />
        </div>
      </section>
      <section className="grid gap-3 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-medium">2. Kanal ve mesaj</h2>
        <div className="grid gap-2 sm:grid-cols-4">
          <select value={channel} onChange={(event) => setChannel(event.target.value as Channel)} className={selectClass} aria-label="Kanal">
            <option value="eposta">E-posta</option>
            <option value="whatsapp">WhatsApp Business API</option>
            <option value="sms">SMS</option>
          </select>
          <select defaultValue="" onChange={(event) => pick(event.target.value)} className={`${selectClass} sm:col-span-3`} aria-label="Şablon">
            <option value="">Şablon seç…</option>
            {templates.filter((item) => item.channel === channel).map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          {channel === "eposta" ? <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Konu ({ad} kullanılabilir)" className="h-11 sm:col-span-4" /> : null}
          {channel === "whatsapp" ? (
            <>
              <Input value={waName} onChange={(event) => setWaName(event.target.value)} placeholder="Onaylı şablon adı (ör. kampanya_ekim)" className="h-11 sm:col-span-3" />
              <Input value={waLanguage} onChange={(event) => setWaLanguage(event.target.value)} placeholder="Dil (tr)" className="h-11" />
            </>
          ) : null}
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={channel === "whatsapp" ? "Şablon parametreleri virgülle: {ad}, {soyad}" : "Mesaj metni; {ad}, {soyad}, {eposta} kullanılabilir"}
            className="min-h-32 sm:col-span-4"
          />
        </div>
        {channel === "eposta" ? <p className="text-xs text-muted-foreground">Her kampanya postasına tek tıkla ret bağlantısı eklenir. Aynı alıcıya günde en çok 3 kampanya postası gider.</p> : null}
        {channel === "whatsapp" ? <p className="text-xs text-muted-foreground">WhatsApp işletme başlatmalı mesajlarda yalnız Meta onaylı şablon kullanılır. Hız sınırı ve platform kuralları sağlayıcı tarafında uygulanır; hata satır satır kaydedilir.</p> : null}
        {channel === "sms" ? <p className="text-xs text-muted-foreground">SMS sağlayıcısı bağlanana kadar gönderim yapılmaz; sistem sahte başarı üretmez.</p> : null}
      </section>
      <section className="grid gap-3 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-medium">3. Ön izleme ve onay</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="h-10 rounded-xl" disabled={busy} onClick={() => void check()}>
            Alıcıları hesapla
          </Button>
          {preview ? (
            <span className="text-sm">
              Süzgeç {preview.matched} müşteri buldu · <strong>{preview.eligible}</strong> alıcı uygun
              {Object.keys(preview.skipped).length ? ` · düşen: ${skipText(preview.skipped)}` : ""}
            </span>
          ) : null}
        </div>
        {preview && preview.eligible > 0 ? (
          providerOff ? (
            <p className="text-sm text-destructive">{channelLabel[channel]} servisi bağlı değil. Gönderim yapılmaz.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={confirm} onChange={(event) => setConfirm(event.target.checked)} />
                {preview.eligible} alıcıya {channelLabel[channel]} ile kampanya gönderimini onaylıyorum
              </label>
              <Button type="button" className="h-10 rounded-xl" disabled={busy || !confirm} onClick={() => void send()}>
                Kuyruğa al ve gönder
              </Button>
            </div>
          )
        ) : null}
        {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
      </section>
      {job ? (
        <section className="grid gap-2 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">İş {job.id}</h2>
            <span className="text-sm">{job.status === "kuyrukta" ? (draining ? "işleniyor…" : "kuyrukta") : job.status === "tamam" ? "tamamlandı" : "iptal edildi"}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${job.total ? Math.round(((job.total - job.pendingCount) / job.total) * 100) : 100}%` }} />
          </div>
          <p className="text-sm">
            {job.sent} gönderildi · {job.failed} hata · {job.pendingCount} bekliyor
            {Object.keys(job.skipped).length ? ` · atlanan: ${skipText(job.skipped)}` : ""}
            {job.error ? ` · ${reasonText[job.error] ?? job.error}` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {job.status === "kuyrukta" && !draining ? (
              <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => void drain(job.id)}>Kuyruğu sürdür</Button>
            ) : null}
            {job.status === "kuyrukta" ? (
              <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => void cancel()}>Kalanı iptal et</Button>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function TemplatesPanel() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [note, setNote] = useState("")
  const [draft, setDraft] = useState<{ id: string; name: string; channel: Channel; subject: string; body: string; waName: string; waLanguage: string }>({ id: "", name: "", channel: "eposta", subject: "", body: "", waName: "", waLanguage: "tr" })

  useEffect(() => {
    void getJson<Overview>("/api/musteri/iletisim").then((result) => {
      if (result.ok && result.data) setTemplates(result.data.templates)
      else setNote(failText(result.data, "Şablonlar açılamadı."))
    })
  }, [])

  async function save() {
    setNote("")
    const result = await postJson<{ templates: Template[] }>("/api/musteri/iletisim", { op: "sablon.kaydet", ...draft })
    if (!result.ok || !result.data?.templates) {
      setNote(failText(result.data, "Şablon kaydedilmedi."))
      return
    }
    setTemplates(result.data.templates)
    setDraft({ id: "", name: "", channel: "eposta", subject: "", body: "", waName: "", waLanguage: "tr" })
    setNote("Şablon kaydedildi.")
  }

  async function remove(id: string) {
    const result = await postJson<{ templates: Template[] }>("/api/musteri/iletisim", { op: "sablon.sil", id })
    if (result.ok && result.data?.templates) setTemplates(result.data.templates)
  }

  return (
    <div className="mt-6 grid gap-4">
      <p className="text-sm leading-6 text-muted-foreground">
        Şablonlarda {"{ad}"}, {"{soyad}"}, {"{eposta}"} ve {"{gsm}"} yer tutucuları alıcıya göre doldurulur. WhatsApp API şablonu Meta onaylı adıyla eşleşmeli; metin alanı virgülle ayrılmış
        parametreleri taşır.
      </p>
      <form
        className="grid gap-2 rounded-3xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <h2 className="font-medium sm:col-span-4">{draft.id ? `Düzenle: ${draft.id}` : "Yeni şablon"}</h2>
        <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Şablon adı" className="h-11 sm:col-span-2" required />
        <select value={draft.channel} onChange={(event) => setDraft({ ...draft, channel: event.target.value as Channel })} className={selectClass} aria-label="Kanal">
          {channels.map((channel) => (
            <option key={channel} value={channel}>{channelLabel[channel]}</option>
          ))}
        </select>
        {draft.channel === "eposta" ? <Input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} placeholder="Konu" className="h-11" /> : <span />}
        {draft.channel === "whatsapp" ? (
          <>
            <Input value={draft.waName} onChange={(event) => setDraft({ ...draft, waName: event.target.value })} placeholder="Meta şablon adı" className="h-11 sm:col-span-3" />
            <Input value={draft.waLanguage} onChange={(event) => setDraft({ ...draft, waLanguage: event.target.value })} placeholder="Dil" className="h-11" />
          </>
        ) : null}
        <Textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="Metin" className="min-h-28 sm:col-span-4" required />
        <div className="flex gap-2 sm:col-span-4">
          <Button type="submit" className="h-11 rounded-xl">Kaydet</Button>
          {draft.id ? (
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setDraft({ id: "", name: "", channel: "eposta", subject: "", body: "", waName: "", waLanguage: "tr" })}>
              Yeni
            </Button>
          ) : null}
        </div>
        {note ? <p className="text-sm text-muted-foreground sm:col-span-4">{note}</p> : null}
      </form>
      <ul className="grid gap-2">
        {templates.map((item) => (
          <li key={item.id} className="flex flex-wrap items-start justify-between gap-2 rounded-3xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <div className="min-w-0">
              <p className="font-medium">
                {item.name} <span className="text-xs text-muted-foreground">· {channelLabel[item.channel]}{item.waName ? ` · ${item.waName}` : ""}</span>
              </p>
              {item.subject ? <p className="text-sm">{item.subject}</p> : null}
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground whitespace-pre-line">{item.body}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => setDraft({ id: item.id, name: item.name, channel: item.channel, subject: item.subject, body: item.body, waName: item.waName, waLanguage: item.waLanguage })}>
                Düzenle
              </Button>
              <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => void remove(item.id)}>
                Sil
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function HistoryPanel() {
  const [jobs, setJobs] = useState<PublicJob[]>([])
  const [open, setOpen] = useState("")
  const [note, setNote] = useState("")

  useEffect(() => {
    void getJson<Overview>("/api/musteri/iletisim").then((result) => {
      if (result.ok && result.data) setJobs(result.data.jobs)
      else setNote(failText(result.data, "Geçmiş açılamadı."))
    })
  }, [])

  const modeText = { tek: "tek", toplu: "toplu", manuel: "elle" }
  const statusText = { kuyrukta: "kuyrukta", tamam: "tamamlandı", iptal: "iptal" }

  return (
    <div className="mt-6 grid gap-3">
      <p className="text-sm leading-6 text-muted-foreground">
        Her gönderim işi alıcı sayısı, gönderilen, hata ve atlanan sayılarıyla durur. Satır sonuçları müşteri kimliğiyle tutulur; adres ve GSM bu kayda yazılmaz.
        Teslimat ve geri dönüş olayları sağlayıcı bağlandığında bu listeye düşer.
      </p>
      {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
      <ul className="grid gap-2">
        {jobs.map((job) => (
          <li key={job.id} className="rounded-3xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <button type="button" className="w-full text-left" onClick={() => setOpen(open === job.id ? "" : job.id)}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {channelLabel[job.channel]} · {job.kind} · {modeText[job.mode]} {job.subject ? `· ${job.subject}` : job.waName ? `· ${job.waName}` : ""}
                </p>
                <span className="text-xs text-muted-foreground">{stamp(job.createdAt)} · {statusText[job.status]}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {job.total} alıcı · {job.sent} gönderildi · {job.failed} hata · {job.pendingCount} bekliyor
                {Object.keys(job.skipped).length ? ` · atlanan: ${Object.entries(job.skipped).map(([key, count]) => `${count} ${reasonText[key] ?? key}`).join(", ")}` : ""}
                {" · "}
                {job.filter}
              </p>
            </button>
            {open === job.id ? (
              <ul className="mt-2 grid gap-1 border-t border-foreground/5 pt-2 text-xs">
                {job.results.slice(0, 100).map((result) => (
                  <li key={`${result.id}-${result.at}`}>
                    {stamp(result.at)} · {result.id} · {result.status === "gonderildi" ? "gönderildi" : result.status === "hata" ? "hata" : "atlandı"}
                    {result.reason ? ` (${reasonText[result.reason] ?? result.reason})` : ""}
                  </li>
                ))}
                {job.results.length > 100 ? <li className="text-muted-foreground">İlk 100 satır gösteriliyor.</li> : null}
              </ul>
            ) : null}
          </li>
        ))}
        {!note && jobs.length === 0 ? <li className="text-sm text-muted-foreground">Henüz gönderim yok.</li> : null}
      </ul>
    </div>
  )
}

function ReportPanel() {
  const [data, setData] = useState<Overview | null>(null)
  const [note, setNote] = useState("")

  useEffect(() => {
    void getJson<Overview>("/api/musteri/iletisim").then((result) => {
      if (result.ok && result.data) setData(result.data)
      else setNote(failText(result.data, "Rapor açılamadı."))
    })
  }, [])

  if (!data) return <p className="mt-6 text-sm text-muted-foreground">{note || "Rapor açılıyor."}</p>
  const report = data.report
  const cards: Array<[string, string]> = [
    ["Toplam müşteri", String(report.total)],
    ["Aktif hesap", String(report.aktif)],
    ["Doğrulanmış e-posta", String(report.verified)],
    ["Askıda / silinmiş", `${report.askida} / ${report.silindi}`],
    ["E-posta izni", `${report.permitted.eposta} (ulaşılabilir ${report.reachable.eposta})`],
    ["SMS izni", `${report.permitted.sms} (ulaşılabilir ${report.reachable.sms})`],
    ["WhatsApp izni", `${report.permitted.whatsapp} (ulaşılabilir ${report.reachable.whatsapp})`],
    ["Engelli", `${report.blocked.pazarlama} pazarlama · ${report.blocked.iletisim} iletişim`],
    ["Ret / kapatma (30 gün)", String(report.optOuts30)],
    ["Gönderim işi", String(report.jobs.total)],
    ["Gönderilen / hata", `${report.jobs.sent} / ${report.jobs.failed}`],
    ["Atlanan / kuyrukta", `${report.jobs.skipped} / ${report.jobs.queued}`],
  ]
  return (
    <div className="mt-6 grid gap-4">
      <ProviderLine providers={data.providers} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <article key={label} className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-2 font-heading text-xl">{value}</p>
          </article>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        “Ulaşılabilir”: aktif, doğrulanmış, engelsiz ve o kanalda izinli müşteri. Hesap durumları: {Object.values(statusText).join(" · ")}.
      </p>
      <section className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-medium">Yönetici denetim kaydı</h2>
        <ul className="mt-2 grid gap-1 text-sm">
          {data.audits.map((item) => (
            <li key={`${item.at}-${item.action}`}>{stamp(item.at)} · {item.action} · {item.detail}</li>
          ))}
          {data.audits.length === 0 ? <li className="text-muted-foreground">Dışa aktarma veya toplu gönderim yapılmadı.</li> : null}
        </ul>
      </section>
    </div>
  )
}
