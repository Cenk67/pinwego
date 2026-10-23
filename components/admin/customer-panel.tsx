"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { channelLabel, channels, sourceLabel, type Channel, type MessageKind, type Template } from "@/lib/comms"
import {
  emptyFilter,
  failText,
  getJson,
  postJson,
  query,
  reasonText,
  stamp,
  statusText,
  type Audit,
  type CommsDetail,
  type Consent,
  type Filter,
  type PageInfo,
  type Providers,
  type Row,
  type Totals,
} from "@/components/admin/comms-client"

const selectClass = "h-11 rounded-xl bg-card px-3 text-sm ring-1 ring-foreground/10"

export function ChannelBadges({ row }: { row: Row }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {channels.map((channel) => (
        <span
          key={channel}
          className={row.channels[channel] ? "rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary" : "rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground line-through"}
          title={`${channelLabel[channel]} pazarlama izni ${row.channels[channel] ? "var" : "yok"}`}
        >
          {channelLabel[channel]}
        </span>
      ))}
      {row.block ? (
        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive">{row.block.kind === "iletisim" ? "İletişim engeli" : "Pazarlama engeli"}</span>
      ) : null}
    </span>
  )
}

export function CustomerPanel() {
  const [items, setItems] = useState<Row[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [page, setPage] = useState<PageInfo | null>(null)
  const [note, setNote] = useState("Müşteri listesi açılıyor.")
  const [filter, setFilter] = useState<Filter>({ ...emptyFilter, izin: "" })
  const [sayfa, setSayfa] = useState(1)
  const [selected, setSelected] = useState("")
  const [exportAsk, setExportAsk] = useState(false)

  const listUrl = `/api/musteri?${query({ ...filter, sayfa: String(sayfa), adet: "50" } as unknown as Partial<Filter>)}`

  const load = useCallback(async () => {
    const result = await getJson<{ items: Row[]; totals: Totals; page: PageInfo }>(listUrl)
    if (!result.ok || !result.data?.items) {
      setNote(result.status === 401 ? "Bu liste yönetici oturumu ister. Müşteri hesabı başka müşterileri göremez." : "Müşteri listesi açılamadı.")
      return
    }
    setItems(result.data.items)
    setTotals(result.data.totals)
    setPage(result.data.page)
    setNote("")
  }, [listUrl])

  useEffect(() => {
    let gone = false
    void getJson<{ items: Row[]; totals: Totals; page: PageInfo }>(listUrl).then((result) => {
      if (gone) return
      if (!result.ok || !result.data?.items) {
        setNote(result.status === 401 ? "Bu liste yönetici oturumu ister. Müşteri hesabı başka müşterileri göremez." : "Müşteri listesi açılamadı.")
        return
      }
      setItems(result.data.items)
      setTotals(result.data.totals)
      setPage(result.data.page)
      setNote("")
    })
    return () => {
      gone = true
    }
  }, [listUrl])

  function update(patch: Partial<Filter>) {
    setFilter((current) => ({ ...current, ...patch }))
    setSayfa(1)
  }

  return (
    <div className="mt-6 grid gap-4">
      {totals ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Kayıt", String(totals.total)],
            ["Aktif", String(totals.aktif)],
            ["Doğrulama bekleyen", String(totals.bekliyor)],
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
        Üyelik pazarlama izni sayılmaz; kanal izinleri müşterinin kendi tercihidir. Yönetici izni yalnız kapatır ya da yazılı / İYS kanıtıyla açar.
        Parola ve doğrulama bağlantısı burada görünmez. Eski müşteriler yeniden giriş yapınca listeye düşer.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input value={filter.q} onChange={(event) => update({ q: event.target.value })} placeholder="Ad, soyad, GSM, e-posta veya kayıt no" className="h-11 lg:col-span-2" />
        <select value={filter.durum} onChange={(event) => update({ durum: event.target.value })} className={selectClass} aria-label="Hesap durumu">
          <option value="">Tüm durumlar</option>
          <option value="bekliyor">E-posta doğrulaması bekleniyor</option>
          <option value="aktif">Aktif</option>
          <option value="askida">Askıya alınmış</option>
          <option value="silindi">Silinmiş</option>
        </select>
        <select value={filter.dogrulama} onChange={(event) => update({ dogrulama: event.target.value })} className={selectClass} aria-label="Doğrulama">
          <option value="">Doğrulama: hepsi</option>
          <option value="evet">Doğrulandı</option>
          <option value="hayir">Doğrulanmadı</option>
        </select>
        <select value={filter.kanal} onChange={(event) => update({ kanal: event.target.value, izin: event.target.value ? filter.izin || "evet" : "" })} className={selectClass} aria-label="Kanal">
          <option value="">Kanal izni: hepsi</option>
          <option value="eposta">E-posta izni</option>
          <option value="sms">SMS izni</option>
          <option value="whatsapp">WhatsApp izni</option>
        </select>
        <select value={filter.izin} onChange={(event) => update({ izin: event.target.value })} className={selectClass} aria-label="İzin durumu" disabled={!filter.kanal}>
          <option value="evet">İzinli</option>
          <option value="hayir">İzinsiz</option>
        </select>
        <select value={filter.engel} onChange={(event) => update({ engel: event.target.value })} className={selectClass} aria-label="Engel">
          <option value="">Engel: hepsi</option>
          <option value="yok">Engelsiz</option>
          <option value="var">Engelli (hepsi)</option>
          <option value="pazarlama">Pazarlama engeli</option>
          <option value="iletisim">İletişim engeli</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={filter.from} onChange={(event) => update({ from: event.target.value })} aria-label="Kayıt başlangıç" className="h-11" />
          <Input type="date" value={filter.to} onChange={(event) => update({ to: event.target.value })} aria-label="Kayıt bitiş" className="h-11" />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {page ? `${page.toplam} kayıt · sayfa ${page.sayfa} / ${page.sayfaSayisi}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-9 rounded-xl" disabled={!page || page.sayfa <= 1} onClick={() => setSayfa((current) => Math.max(1, current - 1))}>
            Önceki
          </Button>
          <Button type="button" variant="outline" className="h-9 rounded-xl" disabled={!page || page.sayfa >= page.sayfaSayisi} onClick={() => setSayfa((current) => current + 1)}>
            Sonraki
          </Button>
          {exportAsk ? (
            <>
              <Button
                type="button"
                className="h-9 rounded-xl"
                nativeButton={false}
                render={<a href={`/api/musteri/iletisim?${query({ ...filter, disa: "csv", onay: "1" } as unknown as Partial<Filter>)}`} download onClick={() => setExportAsk(false)} />}
              >
                {page ? `${page.toplam} satırı indir` : "İndir"}
              </Button>
              <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => setExportAsk(false)}>
                Vazgeç
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => setExportAsk(true)}>
              Excel’e aktar (CSV)
            </Button>
          )}
        </div>
      </div>
      {exportAsk ? (
        <p className="text-sm text-muted-foreground">
          Dışa aktarma kişisel veri içerir; işlem denetim kaydına yazılır. Dosyayı yalnızca yetkili kişilerle paylaş ve işi bitince sil. Silinmiş hesaplar dosyaya yazılmaz.
        </p>
      ) : null}
      {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
      <ul className="grid gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => setSelected(item.id)} className={`w-full rounded-3xl px-4 py-3 text-left ring-1 ${selected === item.id ? "bg-primary/5 ring-primary/40" : "bg-card ring-foreground/10"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{item.status === "silindi" ? "Silinen hesap" : `${item.firstName} ${item.lastName}`.trim() || item.email}</p>
                <ChannelBadges row={item} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.email} · {item.phone || "GSM yok"} · {statusText[item.status]} · kayıt {item.createdAt.slice(0, 10)}
                {item.lastLoginAt ? ` · son giriş ${item.lastLoginAt.slice(0, 10)}` : ""}
              </p>
            </button>
          </li>
        ))}
        {!note && items.length === 0 ? <li className="text-sm text-muted-foreground">Süzgece uyan müşteri yok.</li> : null}
      </ul>
      {selected ? <CustomerDetail key={selected} id={selected} onChanged={load} onClose={() => setSelected("")} /> : null}
    </div>
  )
}

type DetailData = { item: Row; consents: Consent[]; audit: Audit[]; comms: CommsDetail | null }

function CustomerDetail({ id, onChanged, onClose }: { id: string; onChanged: () => Promise<void>; onClose: () => void }) {
  const [data, setData] = useState<DetailData | null>(null)
  const [note, setNote] = useState("")
  const [draft, setDraft] = useState({ firstName: "", lastName: "", birthDate: "", occupation: "", phone: "" })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [evidence, setEvidence] = useState({ channel: "sms", source: "yazili", note: "" })
  const [block, setBlock] = useState({ kind: "pazarlama", reason: "" })
  const [waText, setWaText] = useState("Merhaba {ad}, Pinwego destek ekibinden yazıyoruz.")
  const [waLink, setWaLink] = useState("")

  const open = useCallback(async () => {
    const result = await getJson<DetailData>(`/api/musteri?id=${encodeURIComponent(id)}`)
    if (!result.ok || !result.data?.item) {
      setNote("Kayıt açılamadı.")
      return
    }
    setData(result.data)
    setDraft({
      firstName: result.data.item.firstName,
      lastName: result.data.item.lastName,
      birthDate: result.data.item.birthDate,
      occupation: result.data.item.occupation,
      phone: result.data.item.phone,
    })
  }, [id])

  useEffect(() => {
    let gone = false
    void getJson<DetailData>(`/api/musteri?id=${encodeURIComponent(id)}`).then((result) => {
      if (gone) return
      if (!result.ok || !result.data?.item) {
        setNote("Kayıt açılamadı.")
        return
      }
      setData(result.data)
      setDraft({
        firstName: result.data.item.firstName,
        lastName: result.data.item.lastName,
        birthDate: result.data.item.birthDate,
        occupation: result.data.item.occupation,
        phone: result.data.item.phone,
      })
    })
    return () => {
      gone = true
    }
  }, [id])

  async function act(url: string, body: Record<string, unknown>, okText = "") {
    setNote("")
    const result = await postJson(url, body)
    if (!result.ok) {
      setNote(failText(result.data, "İşlem kaydedilmedi. Silinmiş hesap yeniden açılamaz; doğrulanmamış hesap aktif yapılamaz."))
      return null
    }
    await open()
    await onChanged()
    if (okText) setNote(okText)
    return result.data
  }

  if (!data) return <article className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10 text-sm text-muted-foreground">{note || "Kayıt açılıyor."}</article>
  const current = data.item
  const comms = data.comms
  const emailConsent = data.consents.filter((item) => item.kind === "pazarlama").at(-1)

  const channelRows: Array<{ channel: Channel; allowed: boolean; source: string; at: string; detail: string }> = [
    {
      channel: "eposta",
      allowed: current.channels.eposta,
      source: emailConsent ? (emailConsent.context === "kayit" ? sourceLabel.kayit : emailConsent.context === "cikis" ? sourceLabel.cikis : emailConsent.context === "kanit" ? "Yazılı / İYS kanıtı" : sourceLabel.hesap) : "Kayıt yok",
      at: emailConsent?.at ?? "",
      detail: emailConsent ? `${emailConsent.pageId} sürüm ${emailConsent.version}` : "",
    },
    { channel: "sms", allowed: current.channels.sms, source: comms?.sms ? sourceLabel[comms.sms.source] : "Kayıt yok", at: comms?.sms?.at ?? "", detail: comms?.sms?.note ?? "" },
    { channel: "whatsapp", allowed: current.channels.whatsapp, source: comms?.whatsapp ? sourceLabel[comms.whatsapp.source] : "Kayıt yok", at: comms?.whatsapp?.at ?? "", detail: comms?.whatsapp?.note ?? "" },
  ]

  return (
    <article className="grid gap-5 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-2xl">{current.status === "silindi" ? "Silinen hesap" : `${current.firstName} ${current.lastName}`}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {statusText[current.status]} · {current.id}
          </p>
        </div>
        <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={onClose}>
          Kapat
        </Button>
      </div>
      <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["E-posta", current.email],
          ["GSM", current.phone || "—"],
          ["Doğum tarihi", current.birthDate || "—"],
          ["Meslek", current.occupation || "—"],
          ["Kayıt", stamp(current.createdAt)],
          ["E-posta doğrulama", current.verifiedAt ? stamp(current.verifiedAt) : "bekliyor"],
          ["Son giriş", current.lastLoginAt ? stamp(current.lastLoginAt) : "yok"],
          ["Son güncelleme", stamp(current.updatedAt)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm">{value}</dd>
          </div>
        ))}
      </dl>
      {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}

      <section className="grid gap-2">
        <h3 className="font-medium">Hesap durumu</h3>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => void act("/api/musteri", { op: "durum", id: current.id, status: "askida" })}>Askıya al</Button>
          <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => void act("/api/musteri", { op: "durum", id: current.id, status: "aktif" })}>Aktifleştir</Button>
          {confirmDelete ? (
            <Button type="button" className="h-10 rounded-xl" onClick={() => void act("/api/musteri", { op: "durum", id: current.id, status: "silindi" })}>Silmeyi kaydet</Button>
          ) : (
            <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => setConfirmDelete(true)}>Silinmiş işaretle</Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Askıya alma hesabın girişini kapatır; pazarlama izniyle karıştırılmaz. Silinen hesapta ad ve GSM boşalır, kanal izinleri kapanır.</p>
      </section>

      <section className="grid gap-2">
        <h3 className="font-medium">Pazarlama izinleri (kanal bazında)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1 pr-3">Kanal</th>
                <th className="py-1 pr-3">Durum</th>
                <th className="py-1 pr-3">Kaynak</th>
                <th className="py-1 pr-3">Tarih</th>
                <th className="py-1 pr-3">Not</th>
                <th className="py-1"></th>
              </tr>
            </thead>
            <tbody>
              {channelRows.map((row) => (
                <tr key={row.channel} className="border-t border-foreground/5">
                  <td className="py-2 pr-3">{channelLabel[row.channel]}</td>
                  <td className="py-2 pr-3">{row.allowed ? <span className="text-primary">İzinli</span> : <span className="text-muted-foreground">İzinsiz</span>}</td>
                  <td className="py-2 pr-3">{row.source}</td>
                  <td className="py-2 pr-3">{stamp(row.at)}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{row.detail}</td>
                  <td className="py-2 text-right">
                    {row.allowed ? (
                      <Button type="button" variant="outline" className="h-8 rounded-lg" onClick={() => void act("/api/musteri/iletisim", { op: "izin.kapat", id: current.id, channel: row.channel }, `${channelLabel[row.channel]} izni kapatıldı.`)}>
                        Kapat
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {current.status !== "silindi" ? (
          <form
            className="grid gap-2 rounded-2xl bg-secondary/40 p-3 sm:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault()
              void act("/api/musteri/iletisim", { op: "izin.kanit", id: current.id, channel: evidence.channel, source: evidence.source, note: evidence.note }, "İzin kanıtla açıldı.").then((ok) => {
                if (ok) setEvidence({ ...evidence, note: "" })
              })
            }}
          >
            <p className="text-xs text-muted-foreground sm:col-span-4">İzni yalnız müşteri açar. Elinde imzalı form veya İYS kaydı varsa kanıt notuyla buradan işlenir; işlem denetim kaydına düşer.</p>
            <select value={evidence.channel} onChange={(event) => setEvidence({ ...evidence, channel: event.target.value })} className={selectClass} aria-label="Kanal">
              {channels.map((channel) => (
                <option key={channel} value={channel}>{channelLabel[channel]}</option>
              ))}
            </select>
            <select value={evidence.source} onChange={(event) => setEvidence({ ...evidence, source: event.target.value })} className={selectClass} aria-label="Kaynak">
              <option value="yazili">Yazılı onay</option>
              <option value="iys">İYS kaydı</option>
            </select>
            <Input value={evidence.note} onChange={(event) => setEvidence({ ...evidence, note: event.target.value })} placeholder="Kanıt: belge no, tarih, İYS kayıt no" className="h-11" required minLength={5} />
            <Button type="submit" variant="outline" className="h-11 rounded-xl">Kanıtla aç</Button>
          </form>
        ) : null}
      </section>

      <section className="grid gap-2">
        <h3 className="font-medium">Kara liste</h3>
        {current.block ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-destructive/5 p-3 text-sm">
            <p>
              <span className="font-medium">{current.block.kind === "iletisim" ? "İletişim engeli" : "Pazarlama engeli"}</span> · {current.block.reason} · {stamp(current.block.at)}
            </p>
            <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => void act("/api/musteri/iletisim", { op: "engel.kaldir", id: current.id }, "Engel kaldırıldı.")}>
              Engeli kaldır
            </Button>
          </div>
        ) : (
          <form
            className="grid gap-2 sm:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault()
              void act("/api/musteri/iletisim", { op: "engel.koy", id: current.id, kind: block.kind, reason: block.reason }, "Engel kaydedildi.").then((ok) => {
                if (ok) setBlock({ ...block, reason: "" })
              })
            }}
          >
            <select value={block.kind} onChange={(event) => setBlock({ ...block, kind: event.target.value })} className={selectClass} aria-label="Engel türü">
              <option value="pazarlama">Pazarlama engeli (kampanya gitmez)</option>
              <option value="iletisim">İletişim engeli (yönetici mesajı da gitmez)</option>
            </select>
            <Input value={block.reason} onChange={(event) => setBlock({ ...block, reason: event.target.value })} placeholder="Gerekçe" className="h-11 sm:col-span-2" required minLength={3} />
            <Button type="submit" variant="outline" className="h-11 rounded-xl">Engelle</Button>
          </form>
        )}
        <p className="text-xs text-muted-foreground">Hesap güvenliği ve zorunlu hizmet postaları (doğrulama, şifre) engelden etkilenmez; onlar ayrı kategoridir.</p>
      </section>

      {current.status !== "silindi" ? (
        <section className="grid gap-2">
          <h3 className="font-medium">WhatsApp ile yaz (manuel)</h3>
          <div className="grid gap-2 sm:grid-cols-4">
            <Input value={waText} onChange={(event) => setWaText(event.target.value)} className="h-11 sm:col-span-3" placeholder="Açılış metni; {ad} kullanılabilir" />
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() =>
                void act("/api/musteri/iletisim", { op: "manuel", id: current.id, kind: "hizmet", text: waText }).then((result) => {
                  const link = result && typeof result.link === "string" ? result.link : ""
                  setWaLink(link)
                  if (link) window.open(link, "_blank", "noopener")
                })
              }
            >
              WhatsApp’ta aç
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Telefondaki WhatsApp uygulamasını açar; mesajı sen gönderirsin. Bu bir hizmet iletişimidir, kampanya metni için müşterinin WhatsApp izni gerekir.
            {waLink ? (
              <>
                {" "}
                <a className="underline" href={waLink} target="_blank" rel="noopener noreferrer">Bağlantı</a>
              </>
            ) : null}
          </p>
        </section>
      ) : null}

      {current.status !== "silindi" ? <SingleSend row={current} onDone={() => void open()} /> : null}

      {current.status !== "silindi" ? (
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            void act("/api/musteri", { op: "duzelt", id: current.id, ...draft }, "Düzeltme kaydedildi.")
          }}
        >
          <h3 className="font-medium sm:col-span-2">Kayıt düzeltme</h3>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="font-medium">İzin geçmişi</h3>
          <ul className="mt-2 grid gap-1 text-sm">
            {(comms?.history ?? []).map((item) => (
              <li key={`${item.at}-${item.channel}-${item.source}`}>
                {stamp(item.at)} · {item.channel === "engel" ? "engel" : channelLabel[item.channel]} · {item.accepted ? (item.channel === "engel" ? "kaldırıldı" : "açık") : item.channel === "engel" ? "kondu" : "kapalı"} · {sourceLabel[item.source]}
                {item.note ? ` · ${item.note}` : ""}
              </li>
            ))}
            {!comms?.history?.length ? <li className="text-muted-foreground">Kanal izni değişikliği yok.</li> : null}
          </ul>
        </div>
        <div>
          <h3 className="font-medium">Gönderimler</h3>
          <ul className="mt-2 grid gap-1 text-sm">
            {(comms?.sends ?? []).map((item) => (
              <li key={`${item.jobId}-${item.at}`}>
                {stamp(item.at)} · {channelLabel[item.channel]} · {item.kind} · {item.mode} · {item.status === "gonderildi" ? "gönderildi" : item.status === "hata" ? "hata" : "atlandı"}
                {item.reason ? ` (${reasonText[item.reason] ?? item.reason})` : ""}
                {item.subject ? ` · ${item.subject}` : ""}
              </li>
            ))}
            {!comms?.sends?.length ? <li className="text-muted-foreground">Bu müşteriye gönderim yok.</li> : null}
          </ul>
        </div>
        <div>
          <h3 className="font-medium">Sözleşme onayları</h3>
          <ul className="mt-2 grid gap-1 text-sm">
            {data.consents.map((item) => (
              <li key={`${item.pageId}-${item.at}-${item.context}`}>{item.pageId} · sürüm {item.version} · {item.accepted ? "kabul" : "ret"} · {stamp(item.at)} · {item.context}</li>
            ))}
            {data.consents.length === 0 ? <li className="text-muted-foreground">Onay satırı yok.</li> : null}
          </ul>
        </div>
        <div>
          <h3 className="font-medium">İşlem günlüğü</h3>
          <ul className="mt-2 grid gap-1 text-sm">
            {data.audit.map((item) => (
              <li key={`${item.at}-${item.action}-${item.detail}`}>{stamp(item.at)} · {item.actor} · {item.action} · {item.detail}</li>
            ))}
            {data.audit.length === 0 ? <li className="text-muted-foreground">Henüz işlem yok.</li> : null}
          </ul>
        </div>
      </div>
    </article>
  )
}

type Preview = { eligible: number; skipped: Record<string, number>; providers: Providers }

function SingleSend({ row, onDone }: { row: Row; onDone: () => void }) {
  const [channel, setChannel] = useState<Channel>("eposta")
  const [kind, setKind] = useState<MessageKind>("hizmet")
  const [templates, setTemplates] = useState<Template[]>([])
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [waName, setWaName] = useState("")
  const [waLanguage, setWaLanguage] = useState("tr")
  const [taken, setTaken] = useState<{ signature: string; preview: Preview } | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const signature = JSON.stringify([channel, kind, subject, body, waName])
  const preview = taken && taken.signature === signature ? taken.preview : null

  useEffect(() => {
    void getJson<{ templates: Template[] }>("/api/musteri/iletisim").then((result) => {
      if (result.ok && result.data?.templates) setTemplates(result.data.templates)
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

  async function check() {
    setBusy(true)
    setNote("")
    const result = await postJson<Preview>("/api/musteri/iletisim", { op: "onizle", channel, kind, id: row.id })
    setBusy(false)
    if (!result.ok || !result.data) {
      setNote(failText(result.data, "Ön izleme alınamadı."))
      return
    }
    setTaken({ signature, preview: result.data })
    setConfirm(false)
  }

  async function send() {
    if (!preview) return
    setBusy(true)
    setNote("")
    const result = await postJson<{ job: { sent: number; failed: number; skipped: Record<string, number> } }>("/api/musteri/iletisim", {
      op: "gonder",
      channel,
      kind,
      id: row.id,
      subject,
      body,
      waName,
      waLanguage,
      expected: preview.eligible,
      confirm,
    })
    setBusy(false)
    if (!result.ok || !result.data?.job) {
      setNote(failText(result.data, "Gönderim yapılmadı."))
      return
    }
    const job = result.data.job
    setNote(job.sent ? "Gönderildi." : job.failed ? `Gönderim hatası: ${Object.keys(job.skipped).map((key) => reasonText[key] ?? key).join(", ") || "sağlayıcı"}` : `Atlandı: ${Object.keys(job.skipped).map((key) => reasonText[key] ?? key).join(", ")}`)
    setTaken(null)
    setConfirm(false)
    onDone()
  }

  const skipKeys = preview ? Object.keys(preview.skipped) : []
  const providerOff = preview ? (channel === "eposta" ? !preview.providers.mail : channel === "whatsapp" ? !preview.providers.whatsapp : !preview.providers.sms) : false

  return (
    <section className="grid gap-2">
      <h3 className="font-medium">Bu müşteriye mesaj gönder</h3>
      <div className="grid gap-2 sm:grid-cols-4">
        <select value={channel} onChange={(event) => setChannel(event.target.value as Channel)} className={selectClass} aria-label="Kanal">
          <option value="eposta">E-posta</option>
          <option value="whatsapp">WhatsApp (API)</option>
          <option value="sms">SMS</option>
        </select>
        <select value={kind} onChange={(event) => setKind(event.target.value as MessageKind)} className={selectClass} aria-label="Tür">
          <option value="hizmet">Hizmet bildirimi (izin aranmaz)</option>
          <option value="kampanya">Kampanya (kanal izni gerekir)</option>
        </select>
        <select defaultValue="" onChange={(event) => pick(event.target.value)} className={`${selectClass} sm:col-span-2`} aria-label="Şablon">
          <option value="">Şablon seç…</option>
          {templates.filter((item) => item.channel === channel).map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        {channel === "eposta" ? <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Konu ({ad} kullanılabilir)" className="h-11 sm:col-span-4" /> : null}
        {channel === "whatsapp" ? (
          <>
            <Input value={waName} onChange={(event) => setWaName(event.target.value)} placeholder="Onaylı şablon adı (ör. hosgeldin_v1)" className="h-11 sm:col-span-3" />
            <Input value={waLanguage} onChange={(event) => setWaLanguage(event.target.value)} placeholder="Dil (tr)" className="h-11" />
          </>
        ) : null}
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={channel === "whatsapp" ? "Şablon parametreleri virgülle: {ad}, {soyad}" : "Mesaj metni; {ad}, {soyad}, {eposta} kullanılabilir"}
          className="min-h-24 sm:col-span-4"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className="h-10 rounded-xl" disabled={busy} onClick={() => void check()}>
          Ön izle
        </Button>
        {preview ? (
          <>
            <span className="text-sm">
              {preview.eligible ? "Alıcı uygun." : `Gönderilmez: ${skipKeys.map((key) => reasonText[key] ?? key).join(", ")}`}
              {providerOff ? " · Servis bağlı değil." : ""}
            </span>
            {preview.eligible && !providerOff ? (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={confirm} onChange={(event) => setConfirm(event.target.checked)} />
                  1 alıcıya {channelLabel[channel]} ile {kind} gönderimini onaylıyorum
                </label>
                <Button type="button" className="h-10 rounded-xl" disabled={busy || !confirm} onClick={() => void send()}>
                  Gönder
                </Button>
              </>
            ) : null}
          </>
        ) : null}
      </div>
      {kind === "kampanya" && channel === "eposta" ? <p className="text-xs text-muted-foreground">Kampanya postasına ret bağlantısı otomatik eklenir. Aynı alıcıya günde en çok 3 kampanya postası gider.</p> : null}
      {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
    </section>
  )
}
