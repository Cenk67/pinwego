"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { loginDoorProblem, type AuthDoor, type AuthMode } from "@/lib/auth-path"
import { ADMIN_EMAIL, getSnapshot, previewLogin } from "@/lib/auth-store"
import { businesses } from "@/lib/catalog"
import { PlaceEditor } from "@/components/directory/place-picker"
import { defaultPlace, placeCity, placeFromPoint, type Place } from "@/lib/place"
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

type Mode = AuthMode

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
  door = "musteri",
  embedded = false,
}: {
  initialMode?: Mode
  door?: AuthDoor
  embedded?: boolean
}) {
  const { login, registerAccount } = useAuth()
  const [claim] = useState<Business | null>(pendingClaim)
  const mode = initialMode

  return (
    <div className={embedded ? "" : "min-h-svh bg-background"}>
      {embedded ? null : (
        <header className="border-b border-foreground/10 bg-card/95">
          <div className="mx-auto flex h-16 max-w-lg items-center px-4">
            <Link href="/" aria-label="pinwego" className="inline-flex items-center">
              <Logo />
            </Link>
          </div>
        </header>
      )}
      <main className={mode === "choose" ? "mx-auto w-full max-w-3xl px-4 py-8" : "mx-auto w-full max-w-lg px-4 py-8"}>
        {mode === "choose" ? <Chooser claim={claim} /> : null}
        {mode === "login" || mode === "admin" ? (
          <LoginForm
            login={login}
            initialEmail={mode === "admin" ? ADMIN_EMAIL : ""}
            door={mode === "admin" ? "yonetici" : door}
            claim={claim}
          />
        ) : null}
        {mode === "musteri" ? (
          <CustomerForm registerAccount={registerAccount} />
        ) : null}
        {mode === "isletme" ? (
          <BusinessForm registerAccount={registerAccount} claim={claim} />
        ) : null}
      </main>
    </div>
  )
}

function DoorLink({
  href,
  kicker,
  title,
  copy,
}: {
  href: string
  kicker: string
  title: string
  copy: string
}) {
  return (
    <Link href={href} className="rounded-3xl bg-card px-4 py-4 ring-1 ring-foreground/10 hover:ring-primary">
      <span className="text-xs font-medium tracking-wide text-primary uppercase">{kicker}</span>
      <span className="mt-1 block font-heading text-2xl">{title}</span>
      <span className="mt-1 block text-sm leading-6 text-muted-foreground">{copy}</span>
    </Link>
  )
}

function Chooser({ claim }: { claim: Business | null }) {
  return (
    <div>
      <p className="text-sm font-medium text-primary">Giriş</p>
      <h1 className="mt-2 font-heading text-4xl leading-tight text-balance">Hesabın varsa gir, yoksa kayıt aç.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Kayıtlı müşteri, kayıtlı işletme ve site yöneticisi ayrı kapıdan girer. İşletmeyi sahiplenmek isteyen yeni
        sahip işletme kaydını buradan açar. Misafir izleme kayıt istemez.
      </p>
      {claim ? (
        <p className="mt-4 rounded-2xl bg-primary/10 px-3 py-3 text-sm leading-6 text-primary">
          {claim.name} için sahiplenme bekliyor. Kayıtlı işletme hesabın varsa işletme girişini, ilk kayıtsa işletme
          kaydını kullan.
        </p>
      ) : null}
      <h2 className="mt-8 font-heading text-2xl">Giriş</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <DoorLink
          href="/hesap?kayit=giris&kapi=musteri"
          kicker="Müşteri"
          title="Müşteri girişi"
          copy="Daha önce müşteri kaydı oluşturduysan e-posta ve şifrenle gir."
        />
        <DoorLink
          href="/hesap?kayit=giris&kapi=isletme"
          kicker="İşletme"
          title="İşletme girişi"
          copy="Kaydı tamamlanmış işletme hesabın varsa gir. Sahiplenilen kayıt açılır."
        />
        <DoorLink
          href="/hesap?kayit=yonetici"
          kicker="Yönetici"
          title="Yönetici girişi"
          copy="Site yönetimi, sektör ve hesaplar bu hesapla açılır."
        />
      </div>
      <h2 className="mt-8 font-heading text-2xl">Kayıt</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <DoorLink
          href="/hesap?kayit=musteri"
          kicker="Yeni müşteri"
          title="Müşteri kaydı oluşturun"
          copy="Ad, telefon, T.C. kimlik numarası ve bir teyit belgesi. İletişim ve özellikler bu kayıtla açılır."
        />
        <DoorLink
          href="/hesap?kayit=isletme"
          kicker="Yeni işletme"
          title="İşletme kaydı"
          copy="İşletmeyi sahiplen dediğinde veya yeni işletme eklerken vergi ve yetki belgeleri istenir."
        />
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        Bilgiler ve belgeler bu tarayıcıda durur. Ayrı bir kimlik servisine gönderilmez.
      </p>
    </div>
  )
}

function LoginForm({
  login,
  initialEmail = "",
  door,
  claim,
}: {
  login: (email: string, password: string) => Promise<string | null>
  initialEmail?: string
  door: AuthDoor
  claim: Business | null
}) {
  const router = useRouter()
  const { addListing } = useDirectory()
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<string[]>([])
  const [pending, setPending] = useState(false)
  const title = door === "yonetici" ? "Yönetici girişi" : door === "isletme" ? "İşletme girişi" : "Müşteri girişi"
  const copy =
    door === "yonetici"
      ? "Site yönetimi bu tarayıcıdaki yönetici hesabıyla açılır."
      : door === "isletme"
        ? "Kayıtlı işletme e-postası ve şifresi. Sahiplenme bekliyorsa girişten sonra kayda yazılır."
        : "Daha önce açtığın müşteri hesabının e-postası ve şifresi."

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      const preview = await previewLogin(email, password)
      if (typeof preview === "string") {
        setErrors([preview])
        return
      }
      const problem = loginDoorProblem(door, preview.role)
      if (problem) {
        setErrors([problem])
        return
      }
      const message = await login(email, password)
      if (message) {
        setErrors([message])
        return
      }
      const account = getSnapshot().account
      if (account && claim && (account.role === "isletme" || account.role === "admin")) {
        addListing(claimListing(claim, account.id))
        adoptListingThreads(claim.id, account.id)
        sessionStorage.removeItem(CLAIM_KEY)
        router.push(`/isletme/${claim.slug}`)
        return
      }
      if (account?.role === "admin") router.push("/yonetim")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div>
        <h1 className="font-heading text-4xl">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
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
      {door === "musteri" ? (
        <Link href="/hesap?kayit=musteri" className="text-center text-sm text-primary">
          Hesabın yok mu? Müşteri kaydı oluşturun
        </Link>
      ) : null}
      {door === "isletme" ? (
        <Link href="/hesap?kayit=isletme" className="text-center text-sm text-primary">
          İşletme kaydın yok mu? İşletme kaydı
        </Link>
      ) : null}
      <Button variant="ghost" className="h-11 rounded-xl" nativeButton={false} render={<Link href="/hesap" />}>
        Tüm girişlere dön
      </Button>
    </form>
  )
}

function CustomerForm({
  registerAccount,
}: {
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
      <Link href="/hesap?kayit=giris&kapi=musteri" className="text-center text-sm text-primary">
        Zaten müşteri hesabım var
      </Link>
      <Button variant="ghost" className="h-11 rounded-xl" nativeButton={false} render={<Link href="/hesap" />}>
        Tüm girişlere dön
      </Button>
    </form>
  )
}

function BusinessForm({
  registerAccount,
  claim,
}: {
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
  const [place, setPlace] = useState<Place>(
    claim ? placeFromPoint({ city: claim.city, district: claim.district, lat: claim.lat, lng: claim.lng }) : defaultPlace,
  )
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
      place.country && Number.isFinite(place.lat) ? null : "Şehir ve konum seç.",
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
          city: placeCity(place),
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
            : "Dört belge de yüklenmeden işletme hesabı açılmaz."}
        </p>
      </div>
      <Field id="biz-title" label="İşletme unvanı" value={title} onChange={setTitle} />
      <Field id="biz-owner" label="Yetkili ad soyad" value={owner} onChange={setOwner} autoComplete="name" />
      <Field id="biz-email" label="E-posta" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Field id="biz-phone" label="Cep telefonu" value={phone} onChange={setPhone} inputMode="tel" />
      <Field id="biz-tax" label="Vergi kimlik numarası" value={taxId} onChange={setTaxId} inputMode="numeric" />
      <Field id="biz-office" label="Vergi dairesi" value={taxOffice} onChange={setTaxOffice} />
      <div className="grid gap-2 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
        <Label>Şehir</Label>
        <p className="text-xs leading-5 text-muted-foreground">
          Ülke, il ve semt seç veya istediğin yeri ara. Seçtiğin nokta Google Haritalar üzerinde durur.
        </p>
        <PlaceEditor current={place} onChange={setPlace} embedded />
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
      <Link href="/hesap?kayit=giris&kapi=isletme" className="text-center text-sm text-primary">
        Zaten işletme hesabım var
      </Link>
      <Button variant="ghost" className="h-11 rounded-xl" nativeButton={false} render={<Link href="/hesap" />}>
        Tüm girişlere dön
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
