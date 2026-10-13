"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { fieldClass } from "@/components/directory/bits"
import { Button } from "@/components/ui/button"
import { businesses } from "@/lib/catalog"
import {
  customerTicket,
  istanbulDay,
  money,
  paymentStatus,
  quoteTotals,
  report,
  stages,
  type CalendarEvent,
  type Contact,
  type CrmState,
  type Currency,
  type Deal,
  type Payment,
  type Quote,
  type Workspace,
} from "@/lib/crm"

type View = "ozet" | "musteri" | "firsat" | "ajanda" | "gorev" | "gorusme" | "teklif" | "tahsilat" | "abonelik" | "destek" | "rapor" | "ayar"

const views: { id: View; label: string }[] = [
  { id: "ozet", label: "Genel bakış" },
  { id: "musteri", label: "Müşteriler" },
  { id: "firsat", label: "Satış fırsatları" },
  { id: "ajanda", label: "Ajandam" },
  { id: "gorev", label: "Görevler" },
  { id: "gorusme", label: "Görüşmeler" },
  { id: "teklif", label: "Teklifler" },
  { id: "tahsilat", label: "Tahsilatlar" },
  { id: "abonelik", label: "Abonelikler" },
  { id: "destek", label: "Destek" },
  { id: "rapor", label: "Raporlar" },
  { id: "ayar", label: "Ayarlar" },
]

const stageLabel: Record<string, string> = {
  yeni: "Yeni fırsat",
  temas: "İlk temas",
  ihtiyac: "İhtiyaç",
  teklif: "Teklif hazırlanıyor",
  gonderildi: "Teklif gönderildi",
  karar: "Karar bekleniyor",
  kazanildi: "Kazanıldı",
  kaybedildi: "Kaybedildi",
}

const taskLabel: Record<string, string> = { yapilacak: "Yapılacak", devam: "Devam ediyor", bekliyor: "Bekliyor", tamamlandi: "Tamamlandı", iptal: "İptal" }
const priorityLabel: Record<string, string> = { dusuk: "Düşük", normal: "Normal", yuksek: "Yüksek", acil: "Acil" }
const quoteLabel: Record<string, string> = { taslak: "Taslak", onay: "Onay bekliyor", gonderildi: "Gönderildi", kabul: "Kabul edildi", red: "Reddedildi", suresi: "Süresi doldu" }
const payLabel: Record<string, string> = { bekliyor: "Bekliyor", kismi: "Kısmi ödeme", odendi: "Ödendi", gecikti: "Gecikti", iptal: "İptal" }
const subLabel: Record<string, string> = { deneme: "Deneme", aktif: "Aktif", odeme: "Ödeme bekliyor", askida: "Askıda", iptal: "İptal", suresi: "Süresi doldu" }
const ticketLabel: Record<string, string> = { yeni: "Yeni", inceleniyor: "İnceleniyor", yanit: "Yanıt bekleniyor", cozuldu: "Çözüldü", kapali: "Kapatıldı" }

function nameOf(contact: Contact) {
  return [contact.firstName, contact.lastName, contact.company].filter(Boolean).join(" ")
}

function centsOf(value: string) {
  const amount = Number(value.replace(",", "."))
  if (!Number.isFinite(amount) || amount < 0) return null
  return Math.round(amount * 100)
}

export function CrmPanel() {
  const [state, setState] = useState<CrmState | null>(null)
  const [workspace, setWorkspace] = useState<Workspace>("pinwego")
  const [view, setView] = useState<View>("ozet")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [focus, setFocus] = useState("")
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    let cancel = false
    void fetch("/api/crm", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => {
        if (cancel) return
        setNow(Date.now())
        if (!data.ok) setError(data.reason === "yetki" ? "Yönetici oturumu gerekli." : "CRM açılamadı.")
        else setState(data.state)
      })
      .catch(() => {
        if (!cancel) setError("CRM açılamadı.")
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [])

  async function send(action: Record<string, unknown>) {
    setPending(true)
    setError("")
    try {
      const response = await fetch("/api/crm", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action),
      })
      const data = (await response.json()) as { ok?: boolean; state?: CrmState; error?: string; warning?: string; reason?: string }
      if (!data.ok || !data.state) {
        setError(data.error || (data.reason === "yetki" ? "Yönetici oturumu gerekli." : "Kayıt tamamlanamadı."))
        return false
      }
      setState(data.state)
      if (data.warning) setError(data.warning)
      return true
    } catch {
      setError("Kayıt tamamlanamadı.")
      return false
    } finally {
      setPending(false)
    }
  }

  const contacts = useMemo(() => state?.contacts.filter((item) => item.workspace === workspace && !item.archivedAt) ?? [], [state, workspace])
  if (loading || now === null) return <p className="mt-8 text-sm text-muted-foreground">CRM yükleniyor.</p>
  if (!state) return <p className="mt-8 text-sm text-destructive">{error || "CRM açılamadı."}</p>

  const today = istanbulDay(now)
  const renewUntil = istanbulDay(now + 7 * 86400000)
  const tasks = state.tasks.filter((item) => item.workspace === workspace)
  const openTasks = tasks.filter((item) => item.status !== "tamamlandi" && item.status !== "iptal")
  const lateTasks = openTasks.filter((item) => item.dueAt && istanbulDay(item.dueAt) < today)

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-2">
        {(["pinwego", "personal"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setWorkspace(item)} className={item === workspace ? "rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground" : "rounded-full bg-secondary px-3 py-1.5 text-sm"}>
            {item === "pinwego" ? "Pinwego işletme" : "Kişisel işler"}
          </button>
        ))}
        <p className="text-xs text-muted-foreground">{workspace === "personal" ? "Kişisel kayıtlar arama ve işletme sayfalarına çıkmaz." : "Platform işletmesine bağlanan kayıt yeni bir ilan açmaz."}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {views.map((item) => (
          <button key={item.id} type="button" onClick={() => setView(item.id)} className={view === item.id ? "rounded-full bg-foreground px-3 py-1.5 text-sm text-background" : "rounded-full bg-card px-3 py-1.5 text-sm ring-1 ring-foreground/10"}>
            {item.label}
          </button>
        ))}
      </div>
      {error ? <p className="mt-4 rounded-2xl bg-destructive/10 px-3 py-3 text-sm text-destructive" role="alert">{error}</p> : null}
      {view === "ozet" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Bugünkü görevler", String(openTasks.filter((item) => item.dueAt && istanbulDay(item.dueAt) === today).length), "gorev"],
            ["Geciken görevler", String(lateTasks.length), "gorev"],
            ["Bugünkü görüşmeler", String(state.interactions.filter((item) => contacts.some((contact) => contact.id === item.contactId) && istanbulDay(item.occurredAt) === today).length), "gorusme"],
            ["Açık fırsatlar", String(state.deals.filter((item) => item.workspace === workspace && item.stage !== "kazanildi" && item.stage !== "kaybedildi").length), "firsat"],
            ["Vadesi gelen tahsilat", String(state.payments.filter((item) => item.workspace === workspace && ["gecikti", "bekliyor", "kismi"].includes(paymentStatus(item, now)) && item.dueDate <= today).length), "tahsilat"],
            ["Yaklaşan yenileme", String(state.subscriptions.filter((item) => item.workspace === workspace && item.nextRenewal >= today && item.nextRenewal <= renewUntil).length), "abonelik"],
            ["Açık destek", String(state.tickets.filter((item) => item.workspace === workspace && item.status !== "cozuldu" && item.status !== "kapali").length), "destek"],
            ["Okunmamış hatırlatma", String(state.notices.filter((item) => !item.readAt).length), "ozet"],
          ].map(([label, value, target]) => (
            <button key={label} type="button" onClick={() => setView(target as View)} className="rounded-3xl bg-card p-5 text-left ring-1 ring-foreground/10">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-2 font-heading text-2xl">{value}</p>
            </button>
          ))}
          <div className="sm:col-span-2 lg:col-span-4">
            {state.notices.filter((item) => !item.readAt).slice(0, 6).map((item) => (
              <button key={item.id} type="button" className="mt-2 block w-full rounded-2xl bg-primary/10 px-3 py-3 text-left text-sm" onClick={() => void send({ op: "notice.read", id: item.id })}>
                <span className="font-medium">{item.title}</span>
                <span className="mt-1 block text-muted-foreground">{item.message}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {view === "musteri" ? <Customers state={state} contacts={contacts} workspace={workspace} pending={pending} focus={focus} setFocus={setFocus} send={send} /> : null}
      {view === "firsat" ? <Deals state={state} contacts={contacts} workspace={workspace} pending={pending} send={send} /> : null}
      {view === "ajanda" ? <Agenda state={state} contacts={contacts} workspace={workspace} pending={pending} now={now} send={send} /> : null}
      {view === "gorev" ? <Tasks state={state} contacts={contacts} workspace={workspace} pending={pending} now={now} send={send} /> : null}
      {view === "gorusme" ? <Meetings state={state} contacts={contacts} pending={pending} send={send} /> : null}
      {view === "teklif" ? <Quotes state={state} contacts={contacts} workspace={workspace} pending={pending} send={send} /> : null}
      {view === "tahsilat" ? <Payments state={state} contacts={contacts} pending={pending} now={now} send={send} /> : null}
      {view === "abonelik" ? <Subscriptions state={state} contacts={contacts} pending={pending} send={send} /> : null}
      {view === "destek" ? <Tickets state={state} contacts={contacts} pending={pending} now={now} send={send} /> : null}
      {view === "rapor" ? <Reports state={state} workspace={workspace} now={now} /> : null}
      {view === "ayar" ? <Settings state={state} pending={pending} send={send} /> : null}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span>{label}</span>
      {children}
    </label>
  )
}

function Customers({ state, contacts, workspace, pending, focus, setFocus, send }: { state: CrmState; contacts: Contact[]; workspace: Workspace; pending: boolean; focus: string; setFocus: (id: string) => void; send: (action: Record<string, unknown>) => Promise<boolean | undefined> }) {
  const [query, setQuery] = useState("")
  const [form, setForm] = useState({ firstName: "", lastName: "", company: "", email: "", phone: "", source: "", contactType: "kisi", businessId: "" })
  const [note, setNote] = useState({ type: "not", subject: "", description: "" })
  const selected = contacts.find((item) => item.id === focus) ?? null
  const shown = contacts.filter((item) => `${nameOf(item)} ${item.email} ${item.phone}`.toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR")))
  const picks = businesses.filter((item) => item.name.toLocaleLowerCase("tr-TR").includes(form.company.toLocaleLowerCase("tr-TR"))).slice(0, 6)
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <input className={fieldClass} placeholder="Ad, işletme, telefon veya e-posta" value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="mt-3 grid gap-2">
          {shown.length ? shown.map((item) => (
            <button key={item.id} type="button" onClick={() => setFocus(item.id)} className="rounded-2xl bg-card px-3 py-3 text-left ring-1 ring-foreground/10">
              <span className="font-medium">{nameOf(item)}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{item.phone || "Telefon yok"} · {item.email || "E-posta yok"} · {item.status}</span>
            </button>
          )) : <p className="text-sm text-muted-foreground">Bu alanda müşteri yok.</p>}
        </div>
      </div>
      <div className="grid gap-4">
        <form className="grid gap-3 rounded-3xl bg-card p-4 ring-1 ring-foreground/10" onSubmit={(event) => { event.preventDefault(); void send({ op: "contact.save", contact: { ...form, workspace, contactType: form.businessId ? "platform" : form.contactType } }).then((ok) => { if (ok) setForm({ firstName: "", lastName: "", company: "", email: "", phone: "", source: "", contactType: "kisi", businessId: "" }) }) }}>
          <p className="font-heading text-xl">Yeni müşteri</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ad"><input className={fieldClass} value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></Field>
            <Field label="Soyad"><input className={fieldClass} value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></Field>
          </div>
          <Field label="İşletme"><input className={fieldClass} value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value, businessId: "" })} /></Field>
          {workspace === "pinwego" && form.company ? picks.map((item) => (
            <button key={item.id} type="button" className="text-left text-sm text-primary" onClick={() => setForm({ ...form, company: item.name, businessId: item.id, contactType: "platform" })}>{item.name} · {item.city}</button>
          )) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="E-posta"><input className={fieldClass} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
            <Field label="Telefon"><input className={fieldClass} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
          </div>
          <Field label="Kaynak"><input className={fieldClass} value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} /></Field>
          <Button type="submit" disabled={pending}>Kaydet</Button>
        </form>
        {selected ? (
          <div className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
            <p className="font-heading text-xl">{nameOf(selected)}</p>
            <p className="mt-1 text-sm text-muted-foreground">Son temas: {lastTouch(state, selected.id)}</p>
            <form className="mt-3 grid gap-2" onSubmit={(event) => { event.preventDefault(); void send({ op: "interaction.add", contactId: selected.id, ...note, occurredAt: new Date().toISOString() }).then((ok) => { if (ok) setNote({ type: "not", subject: "", description: "" }) }) }}>
              <select className={fieldClass} value={note.type} onChange={(event) => setNote({ ...note, type: event.target.value })}>
                <option value="telefon">Telefon</option>
                <option value="eposta">E-posta notu</option>
                <option value="toplanti">Toplantı</option>
                <option value="not">Not</option>
              </select>
              <input className={fieldClass} placeholder="Konu" value={note.subject} onChange={(event) => setNote({ ...note, subject: event.target.value })} />
              <textarea className={`${fieldClass} h-24 py-2`} placeholder="Ne konuşuldu? Bu kayıt mesaj gönderildi demek değildir." value={note.description} onChange={(event) => setNote({ ...note, description: event.target.value })} />
              <Button type="submit" disabled={pending}>Görüşmeyi yaz</Button>
            </form>
            <Button type="button" variant="outline" className="mt-3" disabled={pending} onClick={() => { if (confirm("Müşteri arşivlensin mi?")) void send({ op: "contact.archive", id: selected.id }) }}>Arşivle</Button>
            <Related state={state} contactId={selected.id} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function lastTouch(state: CrmState, contactId: string) {
  const times = state.interactions.filter((item) => item.contactId === contactId).map((item) => item.occurredAt)
  if (!times.length) return "henüz yok"
  return new Date(times.sort().at(-1) || "").toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })
}

function Related({ state, contactId }: { state: CrmState; contactId: string }) {
  const deals = state.deals.filter((item) => item.contactId === contactId)
  const tasks = state.tasks.filter((item) => item.contactId === contactId)
  return (
    <div className="mt-4 text-sm">
      <p className="font-medium">Bağlı kayıtlar</p>
      <p className="mt-1 text-muted-foreground">{deals.length} fırsat · {tasks.length} görev · {state.quotes.filter((item) => item.contactId === contactId).length} teklif · {state.payments.filter((item) => item.contactId === contactId).length} tahsilat</p>
    </div>
  )
}

function Deals({ state, contacts, workspace, pending, send }: { state: CrmState; contacts: Contact[]; workspace: Workspace; pending: boolean; send: (action: Record<string, unknown>) => Promise<boolean | undefined> }) {
  const [form, setForm] = useState({ contactId: "", title: "", amount: "", currency: "TRY", probability: "20", expectedClose: "", stage: "yeni", lostReason: "" })
  const rows = state.deals.filter((item) => item.workspace === workspace)
  return (
    <div className="mt-4">
      <form className="grid gap-3 rounded-3xl bg-card p-4 ring-1 ring-foreground/10 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); const amountCents = centsOf(form.amount); if (amountCents === null) return; void send({ op: "deal.save", deal: { ...form, amountCents, probability: Number(form.probability) } }) }}>
        <Field label="Müşteri"><select className={fieldClass} value={form.contactId} onChange={(event) => setForm({ ...form, contactId: event.target.value })} required>{contactOptions(contacts)}</select></Field>
        <Field label="Başlık"><input className={fieldClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></Field>
        <Field label="Tutar"><input className={fieldClass} inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></Field>
        <Field label="Para birimi"><select className={fieldClass} value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })}><option>TRY</option><option>USD</option><option>EUR</option></select></Field>
        <Field label="Olasılık"><input className={fieldClass} inputMode="numeric" value={form.probability} onChange={(event) => setForm({ ...form, probability: event.target.value })} /></Field>
        <Field label="Kapanış"><input className={fieldClass} type="date" value={form.expectedClose} onChange={(event) => setForm({ ...form, expectedClose: event.target.value })} /></Field>
        {form.stage === "kaybedildi" ? <Field label="Kayıp nedeni"><input className={fieldClass} value={form.lostReason} onChange={(event) => setForm({ ...form, lostReason: event.target.value })} /></Field> : null}
        <Button type="submit" disabled={pending}>Fırsatı ekle</Button>
      </form>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
        {stages.map((stage) => (
          <section key={stage} className="min-w-56 flex-1 rounded-3xl bg-secondary/60 p-3">
            <p className="text-sm font-medium">{stageLabel[stage]}</p>
            {rows.filter((item) => item.stage === stage).map((item) => <DealCard key={item.id} item={item} contacts={contacts} pending={pending} send={send} />)}
          </section>
        ))}
      </div>
    </div>
  )
}

function DealCard({ item, contacts, pending, send }: { item: Deal; contacts: Contact[]; pending: boolean; send: (action: Record<string, unknown>) => Promise<boolean | undefined> }) {
  const [lostReason, setLostReason] = useState(item.lostReason)
  return (
    <article className="mt-2 rounded-2xl bg-card p-3 text-sm ring-1 ring-foreground/10">
      <p className="font-medium">{item.title}</p>
      <p className="text-muted-foreground">{money(item.amountCents, item.currency)} · {contacts.find((contact) => contact.id === item.contactId) ? nameOf(contacts.find((contact) => contact.id === item.contactId)!) : "Müşteri"}</p>
      <label className="mt-2 grid gap-1">
        Aşama
        <select className={fieldClass} value={item.stage} disabled={pending} onChange={(event) => {
          const stage = event.target.value
          if (stage === "kaybedildi" && !lostReason) return
          void send({ op: "deal.stage", id: item.id, stage, lostReason })
        }}>
          {stages.map((stage) => <option key={stage} value={stage}>{stageLabel[stage]}</option>)}
        </select>
      </label>
      {item.stage !== "kaybedildi" ? <input className={`${fieldClass} mt-2`} placeholder="Kaybedilirse neden" value={lostReason} onChange={(event) => setLostReason(event.target.value)} /> : <p className="mt-2 text-xs">{item.lostReason}</p>}
    </article>
  )
}

function contactOptions(contacts: Contact[]) {
  return [<option key="" value="">Seç</option>, ...contacts.map((item) => <option key={item.id} value={item.id}>{nameOf(item)}</option>)]
}

function Agenda({ state, contacts, workspace, pending, now, send }: { state: CrmState; contacts: Contact[]; workspace: Workspace; pending: boolean; now: number; send: (action: Record<string, unknown>) => Promise<boolean | undefined> }) {
  const [cursor, setCursor] = useState(() => new Date(now))
  const [day, setDay] = useState(() => istanbulDay(now))
  const [form, setForm] = useState({ title: "", start: "", end: "", eventType: "randevu", contactId: "", location: "" })
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(Date.UTC(year, month, 1))
  const offset = (first.getUTCDay() + 6) % 7
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first)
    date.setUTCDate(index - offset + 1)
    return istanbulDay(date.toISOString())
  })
  const events = state.events.filter((item) => item.workspace === workspace && item.status !== "iptal")
  const tasks = state.tasks.filter((item) => item.workspace === workspace && item.dueAt && item.status !== "iptal")
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => setCursor(new Date(Date.UTC(year, month - 1, 1)))}>Önceki</Button>
          <p className="font-heading text-xl">{cursor.toLocaleString("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" })}</p>
          <Button type="button" variant="outline" onClick={() => setCursor(new Date(Date.UTC(year, month + 1, 1)))}>Sonraki</Button>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-xs">
          {cells.map((item) => (
            <button key={item + month} type="button" onClick={() => setDay(item)} className={`min-h-16 rounded-xl p-1 text-left ${item === day ? "bg-primary text-primary-foreground" : "bg-card ring-1 ring-foreground/10"} ${item.slice(5, 7) !== String(month + 1).padStart(2, "0") ? "opacity-50" : ""}`}>
              {item.slice(8)}
              <span className="mt-1 block">{events.filter((event) => istanbulDay(event.startAt) === item).length + tasks.filter((task) => istanbulDay(task.dueAt) === item).length || ""}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="font-heading text-xl">{day}</p>
        {events.filter((item) => istanbulDay(item.startAt) === day).map((item) => <EventRow key={item.id} item={item} pending={pending} send={send} />)}
        {tasks.filter((item) => istanbulDay(item.dueAt) === day).map((item) => <p key={item.id} className="mt-2 rounded-2xl bg-secondary px-3 py-2 text-sm">Görev · {item.title} · {taskLabel[item.status]}</p>)}
        <form className="mt-4 grid gap-2" onSubmit={(event) => { event.preventDefault(); void send({ op: "event.save", event: { workspace, title: form.title, eventType: form.eventType, contactId: form.contactId, location: form.location, startAt: new Date(form.start).toISOString(), endAt: new Date(form.end).toISOString() } }) }}>
          <input className={fieldClass} placeholder="Etkinlik" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          <select className={fieldClass} value={form.eventType} onChange={(event) => setForm({ ...form, eventType: event.target.value })}>
            <option value="randevu">Randevu</option>
            <option value="toplanti">Toplantı</option>
            <option value="arama">Arama</option>
            <option value="kisisel">Kişisel</option>
            <option value="son">Son tarih</option>
          </select>
          <select className={fieldClass} value={form.contactId} onChange={(event) => setForm({ ...form, contactId: event.target.value })}>{contactOptions(contacts)}</select>
          <input className={fieldClass} type="datetime-local" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} required />
          <input className={fieldClass} type="datetime-local" value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} required />
          <input className={fieldClass} placeholder="Yer" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
          <Button type="submit" disabled={pending}>Ajandaya ekle</Button>
        </form>
      </div>
    </div>
  )
}

function EventRow({ item, pending, send }: { item: CalendarEvent; pending: boolean; send: (action: Record<string, unknown>) => Promise<boolean | undefined> }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-2xl bg-card px-3 py-2 text-sm ring-1 ring-foreground/10">
      <span>{item.title}<span className="block text-xs text-muted-foreground">{new Date(item.startAt).toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" })}</span></span>
      <Button type="button" variant="ghost" disabled={pending} onClick={() => void send({ op: "event.cancel", id: item.id })}>İptal</Button>
    </div>
  )
}

function Tasks({ state, contacts, workspace, pending, now, send }: { state: CrmState; contacts: Contact[]; workspace: Workspace; pending: boolean; now: number; send: (action: Record<string, unknown>) => Promise<boolean | undefined> }) {
  const [form, setForm] = useState({ title: "", due: "", contactId: "", priority: "normal", recurrence: "" })
  const [onlyLate, setOnlyLate] = useState(false)
  const today = istanbulDay(now)
  const rows = state.tasks.filter((item) => item.workspace === workspace && (!onlyLate || (item.dueAt && istanbulDay(item.dueAt) < today && item.status !== "tamamlandi" && item.status !== "iptal")))
  return (
    <div className="mt-4 grid gap-4">
      <form className="grid gap-3 md:grid-cols-4" onSubmit={(event) => { event.preventDefault(); void send({ op: "task.save", task: { workspace, title: form.title, contactId: form.contactId, priority: form.priority, recurrence: form.recurrence, dueAt: new Date(form.due).toISOString() } }) }}>
        <input className={fieldClass} placeholder="Görev" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
        <input className={fieldClass} type="datetime-local" value={form.due} onChange={(event) => setForm({ ...form, due: event.target.value })} required />
        <select className={fieldClass} value={form.contactId} onChange={(event) => setForm({ ...form, contactId: event.target.value })}>{contactOptions(contacts)}</select>
        <select className={fieldClass} value={form.recurrence} onChange={(event) => setForm({ ...form, recurrence: event.target.value })}>
          <option value="">Tekrar yok</option>
          <option value="gun">Her gün</option>
          <option value="hafta">Her hafta</option>
          <option value="ay">Her ay</option>
        </select>
        <Button type="submit" disabled={pending}>Görevi ekle</Button>
      </form>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyLate} onChange={(event) => setOnlyLate(event.target.checked)} /> Yalnızca gecikenler</label>
      {rows.length ? rows.map((item) => (
        <article key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-card px-3 py-3 text-sm ring-1 ring-foreground/10">
          <div>
            <p className="font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">{taskLabel[item.status]} · {priorityLabel[item.priority]} · {item.dueAt ? new Date(item.dueAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }) : "tarih yok"}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={pending || item.status === "tamamlandi"} onClick={() => void send({ op: "task.status", id: item.id, status: "tamamlandi" })}>Tamamla</Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => void send({ op: "task.postpone", id: item.id, dueAt: new Date(Date.now() + 86400000).toISOString() })}>Yarına ertele</Button>
          </div>
        </article>
      )) : <p className="text-sm text-muted-foreground">Görev yok.</p>}
    </div>
  )
}

function Meetings({ state, contacts, pending, send }: { state: CrmState; contacts: Contact[]; pending: boolean; send: (action: Record<string, unknown>) => Promise<boolean | undefined> }) {
  const [form, setForm] = useState({ contactId: "", subject: "", description: "", type: "telefon" })
  const rows = state.interactions.filter((item) => contacts.some((contact) => contact.id === item.contactId))
  return (
    <div className="mt-4 grid gap-4">
      <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void send({ op: "interaction.add", ...form, occurredAt: new Date().toISOString() }) }}>
        <select className={fieldClass} value={form.contactId} onChange={(event) => setForm({ ...form, contactId: event.target.value })} required>{contactOptions(contacts)}</select>
        <select className={fieldClass} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
          <option value="telefon">Telefon</option>
          <option value="eposta">E-posta notu</option>
          <option value="toplanti">Toplantı</option>
          <option value="not">Not</option>
          <option value="diger">Diğer</option>
        </select>
        <input className={fieldClass} placeholder="Konu" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} required />
        <input className={fieldClass} placeholder="Not" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <Button type="submit" disabled={pending}>Görüşmeyi kaydet</Button>
      </form>
      <p className="text-xs text-muted-foreground">E-posta ve mesaj satırları elle girilen nottur. Sistem bir ileti göndermez.</p>
      {rows.map((item) => (
        <article key={item.id} className="rounded-2xl bg-card px-3 py-3 text-sm ring-1 ring-foreground/10">
          <p className="font-medium">{item.subject}</p>
          <p className="text-muted-foreground">{item.type} · {item.origin} · {new Date(item.occurredAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</p>
          {item.description ? <p className="mt-1">{item.description}</p> : null}
        </article>
      ))}
    </div>
  )
}

function Quotes({ state, contacts, workspace, pending, send }: { state: CrmState; contacts: Contact[]; workspace: Workspace; pending: boolean; send: (action: Record<string, unknown>) => Promise<boolean | undefined> }) {
  const [form, setForm] = useState({ contactId: "", description: "", quantity: "1", amount: "", tax: String(state.settings.taxBps / 100), currency: "TRY", validUntil: "" })
  const [printId, setPrintId] = useState("")
  const rows = state.quotes.filter((item) => item.workspace === workspace)
  const printed = rows.find((item) => item.id === printId)
  return (
    <div className="mt-4 grid gap-4">
      <form className="grid gap-3 md:grid-cols-3" onSubmit={(event) => {
        event.preventDefault()
        const unitCents = centsOf(form.amount)
        const taxBps = Math.round(Number(form.tax) * 100)
        if (unitCents === null || !Number.isInteger(taxBps)) return
        void send({ op: "quote.save", quote: { contactId: form.contactId, currency: form.currency, validUntil: form.validUntil, items: [{ description: form.description, quantity: Number(form.quantity), unitCents, taxBps }] } })
      }}>
        <select className={fieldClass} value={form.contactId} onChange={(event) => setForm({ ...form, contactId: event.target.value })} required>{contactOptions(contacts)}</select>
        <input className={fieldClass} placeholder="Kalem" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
        <input className={fieldClass} inputMode="decimal" placeholder="Birim fiyat" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required />
        <input className={fieldClass} inputMode="numeric" placeholder="Adet" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
        <input className={fieldClass} inputMode="decimal" placeholder="Vergi %" value={form.tax} onChange={(event) => setForm({ ...form, tax: event.target.value })} />
        <input className={fieldClass} type="date" value={form.validUntil} onChange={(event) => setForm({ ...form, validUntil: event.target.value })} />
        <Button type="submit" disabled={pending}>Teklifi kaydet</Button>
      </form>
      {rows.map((item) => <QuoteRow key={item.id} item={item} pending={pending} send={send} onPrint={() => setPrintId(item.id)} />)}
      {printed ? <Printable quote={printed} contact={contacts.find((item) => item.id === printed.contactId)} /> : null}
    </div>
  )
}

function QuoteRow({ item, pending, send, onPrint }: { item: Quote; pending: boolean; send: (action: Record<string, unknown>) => Promise<boolean | undefined>; onPrint: () => void }) {
  const totals = quoteTotals(item.items)
  return (
    <article className="rounded-2xl bg-card px-3 py-3 text-sm ring-1 ring-foreground/10">
      <p className="font-medium">{item.number} · {quoteLabel[item.status]}</p>
      <p className="text-muted-foreground">Ara toplam {money(totals.subtotal, item.currency)} · Vergi {money(totals.tax, item.currency)} · Toplam {money(totals.total, item.currency)}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <select className={fieldClass} value={item.status} disabled={pending} onChange={(event) => void send({ op: "quote.status", id: item.id, status: event.target.value })}>
          {Object.entries(quoteLabel).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <Button type="button" variant="outline" onClick={onPrint}>Yazdır</Button>
      </div>
    </article>
  )
}

function Printable({ quote, contact }: { quote: Quote; contact?: Contact }) {
  const totals = quoteTotals(quote.items)
  return (
    <section className="rounded-3xl bg-white p-6 text-black ring-1 ring-foreground/10">
      <h2 className="font-heading text-2xl">Teklif {quote.number}</h2>
      <p>{contact ? nameOf(contact) : ""}</p>
      <table className="mt-4 w-full text-sm">
        <tbody>
          {quoteTotals(quote.items).lines.map((item) => (
            <tr key={item.id}><td>{item.description}</td><td>{item.quantity}</td><td>{money(item.lineTotal, quote.currency)}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3">Toplam {money(totals.total, quote.currency)}</p>
      <Button type="button" className="mt-3" onClick={() => window.print()}>Yazıcıyı aç</Button>
    </section>
  )
}

function Payments({ state, contacts, pending, now, send }: { state: CrmState; contacts: Contact[]; pending: boolean; now: number; send: (action: Record<string, unknown>) => Promise<boolean | undefined> }) {
  const [form, setForm] = useState({ contactId: "", amount: "", currency: "TRY", dueDate: "", reference: "" })
  const [part, setPart] = useState<Record<string, string>>({})
  const rows = state.payments.filter((item) => contacts.some((contact) => contact.id === item.contactId) || item.workspace === contacts[0]?.workspace)
  const visible = state.payments.filter((item) => contacts.some((contact) => contact.id === item.contactId))
  return (
    <div className="mt-4 grid gap-3">
      <form className="grid gap-3 md:grid-cols-4" onSubmit={(event) => { event.preventDefault(); const amountCents = centsOf(form.amount); if (amountCents === null) return; void send({ op: "payment.save", clientKey: crypto.randomUUID(), payment: { ...form, amountCents } }) }}>
        <select className={fieldClass} value={form.contactId} onChange={(event) => setForm({ ...form, contactId: event.target.value })} required>{contactOptions(contacts)}</select>
        <input className={fieldClass} inputMode="decimal" placeholder="Tutar" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required />
        <input className={fieldClass} type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} required />
        <input className={fieldClass} placeholder="Referans" value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} />
        <Button type="submit" disabled={pending}>Vade aç</Button>
      </form>
      <p className="text-xs text-muted-foreground">İşaretlenen ödeme elle girilir. Banka hareketi doğrulanmış sayılmaz.</p>
      {(visible.length ? visible : rows).map((item) => <PaymentRow key={item.id} item={item} now={now} part={part[item.id] || ""} setPart={(value) => setPart({ ...part, [item.id]: value })} pending={pending} send={send} />)}
    </div>
  )
}

function PaymentRow({ item, now, part, setPart, pending, send }: { item: Payment; now: number; part: string; setPart: (value: string) => void; pending: boolean; send: (action: Record<string, unknown>) => Promise<boolean | undefined> }) {
  const status = paymentStatus(item, now)
  const left = item.amountCents - item.marks.reduce((sum, mark) => sum + mark.amountCents, 0)
  return (
    <article className="rounded-2xl bg-card px-3 py-3 text-sm ring-1 ring-foreground/10">
      <p className="font-medium">{money(item.amountCents, item.currency)} · {payLabel[status]} · kalan {money(Math.max(0, left), item.currency)}</p>
      <p className="text-xs text-muted-foreground">Vade {item.dueDate} · {item.marks.length} hareket</p>
      {status !== "odendi" && status !== "iptal" ? (
        <div className="mt-2 flex gap-2">
          <input className={fieldClass} inputMode="decimal" placeholder="Alınan tutar" value={part} onChange={(event) => setPart(event.target.value)} />
          <Button type="button" disabled={pending} onClick={() => { const amountCents = centsOf(part); if (amountCents === null) return; void send({ op: "payment.receive", id: item.id, amountCents, clientKey: crypto.randomUUID(), reference: "manuel" }) }}>İşaretle</Button>
          <Button type="button" variant="ghost" disabled={pending} onClick={() => { if (confirm("Tahsilat iptal edilsin mi?")) void send({ op: "payment.cancel", id: item.id }) }}>İptal</Button>
        </div>
      ) : null}
    </article>
  )
}

function Subscriptions({ state, contacts, pending, send }: { state: CrmState; contacts: Contact[]; pending: boolean; send: (action: Record<string, unknown>) => Promise<boolean | undefined> }) {
  const [form, setForm] = useState({ contactId: "", plan: "", amount: "", currency: "TRY", period: "aylik", startsAt: "", nextRenewal: "", status: "aktif" })
  const rows = state.subscriptions.filter((item) => contacts.some((contact) => contact.id === item.contactId))
  return (
    <div className="mt-4 grid gap-3">
      <p className="text-xs text-muted-foreground">Bu kayıt Pinwego erişimini açmaz ve ödeme alındı demek değildir.</p>
      <form className="grid gap-3 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); const amountCents = centsOf(form.amount); if (amountCents === null) return; void send({ op: "subscription.save", subscription: { ...form, amountCents, autoRenew: false } }) }}>
        <select className={fieldClass} value={form.contactId} onChange={(event) => setForm({ ...form, contactId: event.target.value })} required>{contactOptions(contacts)}</select>
        <input className={fieldClass} placeholder="Plan" value={form.plan} onChange={(event) => setForm({ ...form, plan: event.target.value })} required />
        <input className={fieldClass} inputMode="decimal" placeholder="Tutar" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required />
        <input className={fieldClass} type="date" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} required />
        <input className={fieldClass} type="date" value={form.nextRenewal} onChange={(event) => setForm({ ...form, nextRenewal: event.target.value })} required />
        <select className={fieldClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{Object.entries(subLabel).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
        <Button type="submit" disabled={pending}>Aboneliği kaydet</Button>
      </form>
      {rows.map((item) => (
        <article key={item.id} className="rounded-2xl bg-card px-3 py-3 text-sm ring-1 ring-foreground/10">
          <p className="font-medium">{item.plan} · {subLabel[item.status]} · {money(item.amountCents, item.currency)}</p>
          <p className="text-xs text-muted-foreground">Yenileme {item.nextRenewal || "yok"} · dönem {item.period}</p>
        </article>
      ))}
    </div>
  )
}

function Tickets({ state, contacts, pending, now, send }: { state: CrmState; contacts: Contact[]; pending: boolean; now: number; send: (action: Record<string, unknown>) => Promise<boolean | undefined> }) {
  const [form, setForm] = useState({ contactId: "", subject: "", description: "", priority: "normal", assignee: "" })
  const [note, setNote] = useState<Record<string, string>>({})
  const rows = state.tickets.filter((item) => contacts.some((contact) => contact.id === item.contactId))
  return (
    <div className="mt-4 grid gap-3">
      <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void send({ op: "ticket.save", ticket: { ...form, dueAt: new Date(Date.now() + 2 * 86400000).toISOString() } }) }}>
        <select className={fieldClass} value={form.contactId} onChange={(event) => setForm({ ...form, contactId: event.target.value })} required>{contactOptions(contacts)}</select>
        <input className={fieldClass} placeholder="Konu" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} required />
        <input className={fieldClass} placeholder="Açıklama" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <select className={fieldClass} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{Object.entries(priorityLabel).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
        <Button type="submit" disabled={pending}>Talep aç</Button>
      </form>
      {rows.map((item) => {
        const opened = new Date(item.createdAt).getTime()
        const solved = item.resolvedAt ? new Date(item.resolvedAt).getTime() - opened : now - opened
        return (
          <article key={item.id} className="rounded-2xl bg-card px-3 py-3 text-sm ring-1 ring-foreground/10">
            <p className="font-medium">{item.number} · {item.subject}</p>
            <p className="text-xs text-muted-foreground">{ticketLabel[item.status]} · {priorityLabel[item.priority]} · {Math.max(1, Math.round(solved / 3600000))} saat</p>
            <select className={`${fieldClass} mt-2`} value={item.status} disabled={pending} onChange={(event) => void send({ op: "ticket.status", id: item.id, status: event.target.value })}>
              {Object.entries(ticketLabel).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
            {item.messages.map((message) => (
              <p key={message.id} className={message.internal ? "mt-2 rounded-xl bg-amber-100 px-2 py-2 text-amber-950" : "mt-2 rounded-xl bg-secondary px-2 py-2"}>
                {message.internal ? "İç not · " : "Kayıt · "}{message.body}
              </p>
            ))}
            <div className="mt-2 flex gap-2">
              <input className={fieldClass} placeholder="İç not" value={note[item.id] || ""} onChange={(event) => setNote({ ...note, [item.id]: event.target.value })} />
              <Button type="button" disabled={pending} onClick={() => void send({ op: "ticket.note", id: item.id, message: note[item.id] || "", internal: true })}>İç not ekle</Button>
            </div>
            {customerTicket(item).messages.length !== item.messages.length ? <p className="mt-1 text-xs text-muted-foreground">İç notlar müşteriye açık bir yanıtta yer almaz.</p> : null}
          </article>
        )
      })}
    </div>
  )
}

function Reports({ state, workspace, now }: { state: CrmState; workspace: Workspace; now: number }) {
  const today = istanbulDay(now)
  const [from, setFrom] = useState(today.slice(0, 8) + "01")
  const [to, setTo] = useState(today)
  const [currency, setCurrency] = useState<Currency>("TRY")
  const row = report(state, workspace, currency, from, to)
  return (
    <div className="mt-4 grid gap-3">
      <div className="grid gap-3 md:grid-cols-3">
        <input className={fieldClass} type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <input className={fieldClass} type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        <select className={fieldClass} value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}><option>TRY</option><option>USD</option><option>EUR</option></select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Yeni müşteri", String(row.contacts)],
          ["Kazanılan satış", money(row.wonCents, currency)],
          ["Kazanılan adet", String(row.wonCount)],
          ["Kaybedilen adet", String(row.lostCount)],
          ["Teklif toplamı", money(row.quoteCents, currency)],
          ["Tahsil edilen", money(row.collectedCents, currency)],
          ["Geciken tahsilat", String(row.overdueCount)],
        ].map(([label, value]) => (
          <article key={label} className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-2 font-heading text-2xl">{value}</p>
          </article>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Teklif, kazanılan fırsat ve tahsilat ayrı durur. Farklı para birimleri birbirine eklenmez. Görünen alan: {workspace === "personal" ? "kişisel" : "Pinwego"}.</p>
    </div>
  )
}

function Settings({ state, pending, send }: { state: CrmState; pending: boolean; send: (action: Record<string, unknown>) => Promise<boolean | undefined> }) {
  const [tax, setTax] = useState(String(state.settings.taxBps / 100))
  const [days, setDays] = useState(String(state.settings.remindDays))
  return (
    <form className="mt-4 grid max-w-md gap-3" onSubmit={(event) => { event.preventDefault(); void send({ op: "settings.save", taxBps: Math.round(Number(tax) * 100), remindDays: Number(days) }) }}>
      <Field label="Varsayılan vergi yüzdesi"><input className={fieldClass} value={tax} onChange={(event) => setTax(event.target.value)} /></Field>
      <Field label="Hatırlatma günü"><input className={fieldClass} value={days} onChange={(event) => setDays(event.target.value)} /></Field>
      <Button type="submit" disabled={pending}>Ayarları kaydet</Button>
      <p className="text-xs text-muted-foreground">Vergi her kalemde ayrıca değişir. Hatırlatmalar sunucuda, aynı iş için bir kez üretilir.</p>
    </form>
  )
}
