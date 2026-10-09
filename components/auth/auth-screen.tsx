"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { fieldClass } from "@/components/directory/bits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { ADMIN_EMAIL, getSnapshot } from "@/lib/auth-store"
import { businesses, cities } from "@/lib/catalog"
import { CLAIM_KEY, claimListing } from "@/lib/claim"
import { adoptListingThreads } from "@/lib/message-store"
import { useDirectory } from "@/lib/directory-context"
import type { Business } from "@/lib/types"
import {
  adultBirthDate,
  fileProblem,
  validEmail,
  validPassword,
  validPhone,
  validTckn,
  validVkn,
} from "@/lib/identity"

type Mode = "choose" | "login" | "admin" | "musteri" | "isletme"

function problemsOf(items: Array<string | null>) {
  return items.filter((item): item is string => Boolean(item))
}

function DocField({
  label,
  hint,
  file,
  onChange,
}: {
  label: string
  hint: string
  file: File | null
  onChange: (file: File | null) => void
}) {
  const [stamp, setStamp] = useState(0)
  return (
    <div className="rounded-2xl bg-background px-3 py-3 ring-1 ring-foreground/10">
      <Label>{label}</Label>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>
      <label className="mt-3 inline-flex h-9 cursor-pointer items-center rounded-full bg-primary px-3 text-sm text-primary-foreground">
        <input
          key={stamp}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
          className="sr-only"
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
        Belge seç
      </label>
      {file ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {file.name} · {Math.max(1, Math.round(file.size / 1024))} KB
          <button
            type="button"
            className="ml-2 text-primary"
            onClick={() => {
              onChange(null)
              setStamp((value) => value + 1)
            }}
          >
            Kaldır
          </button>
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Henüz dosya yok.</p>
      )}
    </div>
  )
}

function ErrorList({ errors }: { errors: string[] }) {
  if (!errors.length) return null
  return (
    <ul className="grid gap-1 rounded-2xl bg-destructive/10 px-3 py-3 text-sm text-destructive" role="alert">
      {errors.map((error) => (
        <li key={error}>{error}</li>
      ))}
    </ul>
  )
}

function pendingClaim() {
  if (typeof window === "undefined") return null
  const slug = sessionStorage.getItem(CLAIM_KEY)
  if (!slug) return null
  return businesses.find((item) => item.slug === slug && item.source === "google") ?? null
}

export function AuthScreen({
  initialMode = "choose",
  embedded = false,
}: {
  initialMode?: Mode
  embedded?: boolean
}) {
  const { login, registerAccount } = useAuth()
  const [claim] = useState<Business | null>(pendingClaim)
  const [mode, setMode] = useState<Mode>(claim ? "isletme" : initialMode)

  return (
    <div className={embedded ? "" : "min-h-svh bg-background"}>
      {embedded ? null : (
        <header className="border-b border-foreground/10">
          <div className="mx-auto flex h-16 max-w-lg items-center gap-2 px-4">
            <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                <circle cx="12" cy="9" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 12.5 V19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <span className="font-heading text-xl tracking-tight">pinwego</span>
          </div>
        </header>
      )}
      <main className="mx-auto w-full max-w-lg px-4 py-8">
        {mode === "choose" ? <Chooser onPick={setMode} claim={claim} /> : null}
        {mode === "login" || mode === "admin" ? (
          <LoginForm
            onBack={() => setMode("choose")}
            login={login}
            initialEmail={mode === "admin" ? ADMIN_EMAIL : ""}
            admin={mode === "admin"}
          />
        ) : null}
        {mode === "musteri" ? (
          <CustomerForm onBack={() => setMode("choose")} registerAccount={registerAccount} />
        ) : null}
        {mode === "isletme" ? (
          <BusinessForm onBack={() => setMode("choose")} registerAccount={registerAccount} claim={claim} />
        ) : null}
      </main>
    </div>
  )
}

function Chooser({ onPick, claim }: { onPick: (mode: Mode) => void; claim: Business | null }) {
  return (
    <div>
      <p className="text-sm font-medium text-primary">Açık rehber</p>
      <h1 className="mt-2 font-heading text-4xl leading-tight text-balance">Misafir olarak izleyebilirsin.</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        İşletmeleri, sektörleri ve haritayı kayıt olmadan görebilirsin. Telefon, site, randevu, mesaj, kayıt ve talep
        için müşteri kaydı gerekir. İşletme vergi ve yetki belgelerini yükler.
      </p>
      {claim ? (
        <p className="mt-4 rounded-2xl bg-primary/10 px-3 py-3 text-sm leading-6 text-primary">
          {claim.name} için sahiplenme açık. İşletme kaydı tamamlanınca bu Google kaydı projeye yazılır.
        </p>
      ) : null}
      <div className="mt-6 grid gap-3">
        <button
          type="button"
          onClick={() => onPick("musteri")}
          className="rounded-3xl bg-card px-4 py-4 text-left ring-1 ring-foreground/10"
        >
          <span className="font-heading text-2xl">Müşteri kaydı oluşturun</span>
          <span className="mt-1 block text-sm leading-6 text-muted-foreground">
            Ad, telefon, T.C. kimlik numarası ve bir teyit belgesi.
          </span>
        </button>
        <button
          type="button"
          onClick={() => onPick("isletme")}
          className="rounded-3xl bg-card px-4 py-4 text-left ring-1 ring-foreground/10"
        >
          <span className="font-heading text-2xl">İşletme kaydı</span>
          <span className="mt-1 block text-sm leading-6 text-muted-foreground">
            Vergi levhası, imza sirküleri, sicil belgesi ve yetkili kimliği.
          </span>
        </button>
      </div>
      <button
        type="button"
        onClick={() => onPick("admin")}
        className="mt-3 w-full rounded-3xl bg-card px-4 py-4 text-left ring-1 ring-foreground/10"
      >
        <span className="font-heading text-2xl">Yönetici girişi</span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">
          Sektör, işletme, talep ve hesapları yönetim panelinden yönet.
        </span>
      </button>
      <Button type="button" variant="outline" className="mt-4 h-11 w-full rounded-xl" onClick={() => onPick("login")}>
        Zaten hesabım var
      </Button>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        Bilgiler ve belgeler bu tarayıcıda durur. Ayrı bir kimlik servisine gönderilmez; numara ve dosya türü burada
        kontrol edilir.
      </p>
    </div>
  )
}

function LoginForm({
  onBack,
  login,
  initialEmail = "",
  admin = false,
}: {
  onBack: () => void
  login: (email: string, password: string) => Promise<string | null>
  initialEmail?: string
  admin?: boolean
}) {
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<string[]>([])
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    const message = await login(email, password)
    setPending(false)
    setErrors(message ? [message] : [])
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div>
        <h1 className="font-heading text-4xl">{admin ? "Yönetici girişi" : "Giriş"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {admin
            ? "Yönetim paneli bu tarayıcıdaki yönetici hesabıyla açılır."
            : "Kayıtlı e-posta ve şifreyle devam et."}
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="login-email">E-posta</Label>
        <Input id="login-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="login-password">Şifre</Label>
        <Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11" />
      </div>
      <ErrorList errors={errors} />
      <Button type="submit" className="h-11 rounded-xl" disabled={pending}>
        {pending ? "Kontrol ediliyor" : "Giriş yap"}
      </Button>
      <Button type="button" variant="ghost" className="h-11 rounded-xl" onClick={onBack}>
        Kayıt seçeneklerine dön
      </Button>
    </form>
  )
}

function CustomerForm({
  onBack,
  registerAccount,
}: {
  onBack: () => void
  registerAccount: ReturnType<typeof useAuth>["registerAccount"]
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [nationalId, setNationalId] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [password, setPassword] = useState("")
  const [again, setAgain] = useState("")
  const [document, setDocument] = useState<File | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const errors = problemsOf([
      name.trim().split(/\s+/).length < 2 ? "Ad ve soyadı birlikte yaz." : null,
      validEmail(email) ? null : "Geçerli bir e-posta yaz.",
      validPhone(phone) ? null : "Telefon 5 ile başlayan bir cep numarası olmalı.",
      validTckn(nationalId.replace(/\D/g, "")) ? null : "T.C. kimlik numarası geçersiz.",
      adultBirthDate(birthDate) ? null : "Doğum tarihi 18 yaşından büyük bir gün olmalı.",
      validPassword(password) ? null : "Şifre en az 8 karakter olmalı.",
      password === again ? null : "Şifre tekrarı eşleşmedi.",
      document ? fileProblem(document) : "Teyit belgesi yükle.",
    ])
    if (errors.length || !document) {
      setErrors(errors)
      return
    }
    setPending(true)
    try {
      const message = await registerAccount({
        role: "musteri",
        email,
        password,
        name,
        phone,
        customer: { nationalId: nationalId.replace(/\D/g, ""), birthDate },
        uploads: [{ label: "Teyit belgesi", file: document }],
      })
      setErrors(message ? [message] : [])
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Belge kaydedilemedi."])
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div>
        <h1 className="font-heading text-4xl text-balance">Müşteri kaydı oluşturun</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Kimlik bilgisi ve teyit belgesi tamamlanmadan iletişim bilgileri ve özellikler açılmaz. İzleme kayıtsız da
          durur.
        </p>
      </div>
      <Field id="cust-name" label="Ad soyad" value={name} onChange={setName} autoComplete="name" />
      <Field id="cust-email" label="E-posta" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Field id="cust-phone" label="Cep telefonu" value={phone} onChange={setPhone} inputMode="tel" autoComplete="tel" />
      <Field id="cust-id" label="T.C. kimlik numarası" value={nationalId} onChange={setNationalId} inputMode="numeric" />
      <div className="grid gap-1.5">
        <Label htmlFor="cust-birth">Doğum tarihi</Label>
        <Input id="cust-birth" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} className="h-11" />
      </div>
      <Field id="cust-pass" label="Şifre" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
      <Field id="cust-again" label="Şifre tekrarı" type="password" value={again} onChange={setAgain} autoComplete="new-password" />
      <DocField
        label="Teyit belgesi"
        hint="Nüfus cüzdanı, kimlik kartı, ehliyet veya yerleşim yeri belgesi. PDF, JPG, PNG veya WEBP. En fazla 4 MB."
        file={document}
        onChange={setDocument}
      />
      <ErrorList errors={errors} />
      <Button type="submit" className="h-11 rounded-xl" disabled={pending}>
        {pending ? "Belgeler kaydediliyor" : "Doğrula ve kaydı aç"}
      </Button>
      <Button type="button" variant="ghost" className="h-11 rounded-xl" onClick={onBack}>
        Geri
      </Button>
    </form>
  )
}

function BusinessForm({
  onBack,
  registerAccount,
  claim,
}: {
  onBack: () => void
  registerAccount: ReturnType<typeof useAuth>["registerAccount"]
  claim: Business | null
}) {
  const router = useRouter()
  const { addListing } = useDirectory()
  const [title, setTitle] = useState(claim?.name ?? "")
  const [owner, setOwner] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [taxId, setTaxId] = useState("")
  const [taxOffice, setTaxOffice] = useState("")
  const [city, setCity] = useState(claim?.city ?? cities[0]?.name ?? "İstanbul")
  const [address, setAddress] = useState(claim?.address ?? "")
  const [password, setPassword] = useState("")
  const [again, setAgain] = useState("")
  const [vergi, setVergi] = useState<File | null>(null)
  const [imza, setImza] = useState<File | null>(null)
  const [sicil, setSicil] = useState<File | null>(null)
  const [kimlik, setKimlik] = useState<File | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const uploads: Array<{ label: string; file: File | null }> = [
      { label: "Vergi levhası", file: vergi },
      { label: "İmza sirküleri", file: imza },
      { label: "Ticaret sicil veya faaliyet belgesi", file: sicil },
      { label: "Yetkili kimlik belgesi", file: kimlik },
    ]
    const errors = problemsOf([
      title.trim().length < 2 ? "İşletme unvanını yaz." : null,
      owner.trim().split(/\s+/).length < 2 ? "Yetkilinin adını ve soyadını yaz." : null,
      validEmail(email) ? null : "Geçerli bir e-posta yaz.",
      validPhone(phone) ? null : "Telefon 5 ile başlayan bir cep numarası olmalı.",
      validVkn(taxId.replace(/\D/g, "")) ? null : "Vergi kimlik numarası 10 haneli ve geçerli olmalı.",
      taxOffice.trim().length < 2 ? "Vergi dairesini yaz." : null,
      address.trim().length < 8 ? "Açık adresi yaz." : null,
      validPassword(password) ? null : "Şifre en az 8 karakter olmalı.",
      password === again ? null : "Şifre tekrarı eşleşmedi.",
      ...uploads.map((item) => (item.file ? fileProblem(item.file) && `${item.label}: ${fileProblem(item.file)}` : `${item.label} yükle.`)),
    ])
    if (errors.length || uploads.some((item) => !item.file)) {
      setErrors(errors)
      return
    }
    setPending(true)
    try {
      const message = await registerAccount({
        role: "isletme",
        email,
        password,
        name: title,
        phone,
        business: {
          owner: owner.trim(),
          taxId: taxId.replace(/\D/g, ""),
          taxOffice: taxOffice.trim(),
          city,
          address: address.trim(),
        },
        uploads: uploads.map((item) => ({ label: item.label, file: item.file as File })),
      })
      if (!message && claim) {
        const ownerId = getSnapshot().account?.id
        addListing(claimListing(claim, ownerId || ""))
        if (ownerId) adoptListingThreads(claim.id, ownerId)
        sessionStorage.removeItem(CLAIM_KEY)
        router.push(`/isletme/${claim.slug}`)
      }
      setErrors(message ? [message] : [])
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Belgeler kaydedilemedi."])
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div>
        <h1 className="font-heading text-4xl text-balance">
          {claim ? "İşletmeyi sahiplen" : "İşletme doğrulaması"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {claim
            ? `${claim.name} kaydı, belgeler tamamlanınca pinwego’ya yazılır. Dört belge de gerekir.`
            : "Dört belge de yüklenmeden işletme hesabı açılmaz ve rehber kullanılamaz."}
        </p>
      </div>
      <Field id="biz-title" label="İşletme unvanı" value={title} onChange={setTitle} />
      <Field id="biz-owner" label="Yetkili ad soyad" value={owner} onChange={setOwner} autoComplete="name" />
      <Field id="biz-email" label="E-posta" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Field id="biz-phone" label="Cep telefonu" value={phone} onChange={setPhone} inputMode="tel" />
      <Field id="biz-tax" label="Vergi kimlik numarası" value={taxId} onChange={setTaxId} inputMode="numeric" />
      <Field id="biz-office" label="Vergi dairesi" value={taxOffice} onChange={setTaxOffice} />
      <div className="grid gap-1.5">
        <Label htmlFor="biz-city">Şehir</Label>
        <select id="biz-city" className={fieldClass} value={city} onChange={(event) => setCity(event.target.value)}>
          {cities.map((item) => (
            <option key={item.name}>{item.name}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="biz-address">Açık adres</Label>
        <Textarea id="biz-address" value={address} onChange={(event) => setAddress(event.target.value)} className="min-h-20" />
      </div>
      <Field id="biz-pass" label="Şifre" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
      <Field id="biz-again" label="Şifre tekrarı" type="password" value={again} onChange={setAgain} autoComplete="new-password" />
      <DocField label="Vergi levhası" hint="Güncel vergi levhası." file={vergi} onChange={setVergi} />
      <DocField label="İmza sirküleri" hint="Noter onaylı imza sirküleri veya yetki belgesi." file={imza} onChange={setImza} />
      <DocField label="Ticaret sicil veya faaliyet belgesi" hint="Sicil gazetesi ya da faaliyet belgesi." file={sicil} onChange={setSicil} />
      <DocField label="Yetkili kimlik belgesi" hint="İşlemi yapan kişinin kimlik kartı veya ehliyeti." file={kimlik} onChange={setKimlik} />
      <ErrorList errors={errors} />
      <Button type="submit" className="h-11 rounded-xl" disabled={pending}>
        {pending ? "Belgeler kaydediliyor" : "Belgeleri yükle ve kaydı aç"}
      </Button>
      <Button type="button" variant="ghost" className="h-11 rounded-xl" onClick={onBack}>
        Geri
      </Button>
    </form>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
  inputMode?: "text" | "tel" | "numeric" | "email"
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className="h-11"
      />
    </div>
  )
}
