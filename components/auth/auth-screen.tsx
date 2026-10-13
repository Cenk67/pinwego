"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { type AuthDoor, type AuthMode } from "@/lib/auth-path"
import { PendingMail } from "@/components/auth/pending-mail"
import { TurnstileField } from "@/components/auth/turnstile-field"
import { destinationFor, safeReturnPath, submittedField } from "@/lib/auth-session"
import { confirmAdminCode, getSnapshot, type AuthNotice } from "@/lib/auth-store"
import { businesses } from "@/lib/catalog"
import { PlaceEditor } from "@/components/directory/place-picker"
import { defaultPlace, placeCity, placeFromPoint, type Place } from "@/lib/place"
import { CLAIM_KEY, claimListing } from "@/lib/claim"
import { adoptListingThreads } from "@/lib/message-store"
import { useDirectory } from "@/lib/directory-context"
import { useLocale } from "@/lib/use-locale"
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
  siteKey = "",
}: {
  initialMode?: Mode
  door?: AuthDoor
  embedded?: boolean
  siteKey?: string
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
            initialEmail=""
            door={mode === "admin" ? "yonetici" : door}
            claim={claim}
            siteKey={siteKey}
          />
        ) : null}
        {mode === "musteri" ? (
          <CustomerForm registerAccount={registerAccount} siteKey={siteKey} />
        ) : null}
        {mode === "isletme" ? (
          <BusinessForm registerAccount={registerAccount} claim={claim} siteKey={siteKey} />
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
  const { t } = useLocale()
  return (
    <div>
      <p className="text-sm font-medium text-primary">{t("auth.signIn")}</p>
      <h1 className="mt-2 font-heading text-4xl leading-tight text-balance">{t("auth.headline")}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{t("auth.lead")}</p>
      {claim ? (
        <p className="mt-4 rounded-2xl bg-primary/10 px-3 py-3 text-sm leading-6 text-primary">
          {claim.name} için sahiplenme bekliyor. Kayıtlı işletme hesabın varsa işletme girişini, ilk kayıtsa işletme
          kaydını kullan.
        </p>
      ) : null}
      <h2 className="mt-8 font-heading text-2xl">{t("auth.signIn")}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <DoorLink
          href="/hesap?kayit=giris&kapi=musteri"
          kicker={t("auth.customer")}
          title={t("auth.customerIn")}
          copy={t("auth.customerInCopy")}
        />
        <DoorLink
          href="/hesap?kayit=giris&kapi=isletme"
          kicker={t("auth.business")}
          title={t("auth.businessIn")}
          copy={t("auth.businessInCopy")}
        />
        <DoorLink
          href="/hesap?kayit=yonetici"
          kicker={t("auth.admin")}
          title={t("auth.adminIn")}
          copy={t("auth.adminInCopy")}
        />
      </div>
      <h2 className="mt-8 font-heading text-2xl">{t("auth.register")}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <DoorLink
          href="/hesap?kayit=musteri"
          kicker={t("auth.newCustomer")}
          title={t("guest.register")}
          copy={t("auth.customerRegCopy")}
        />
        <DoorLink
          href="/hesap?kayit=isletme"
          kicker={t("auth.newBusiness")}
          title={t("auth.businessReg")}
          copy={t("auth.businessRegCopy")}
        />
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">{t("auth.local")}</p>
    </div>
  )
}

function LoginForm({
  login,
  initialEmail = "",
  door,
  claim,
  siteKey,
}: {
  login: (email: string, password: string, door?: AuthDoor, extra?: { turnstile?: string; locale?: string }) => Promise<string | AuthNotice | null>
  initialEmail?: string
  door: AuthDoor
  claim: Business | null
  siteKey: string
}) {
  const router = useRouter()
  const params = useSearchParams()
  const { addListing } = useDirectory()
  const [errors, setErrors] = useState<string[]>([])
  const [pending, setPending] = useState(false)
  const [token, setToken] = useState("")
  const [hold, setHold] = useState<{ email: string; password: string } | null>(null)
  const [codeStep, setCodeStep] = useState(false)
  const [code, setCode] = useState("")
  const { t, locale } = useLocale()
  const title = door === "yonetici" ? t("auth.adminIn") : door === "isletme" ? t("auth.businessIn") : t("auth.customerIn")
  const copy =
    door === "yonetici" ? t("auth.adminCopy") : door === "isletme" ? t("auth.businessCopy") : t("auth.customerCopy")

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const typedEmail = submittedField(form, "username", "login-email", "")
    const typedPassword = submittedField(form, "password", "login-password", "")
    setPending(true)
    try {
      const message = await login(typedEmail, typedPassword, door, { turnstile: token, locale })
      if (message && typeof message === "object" && "code" in message) {
        setErrors([])
        setCode("")
        setCodeStep(true)
        return
      }
      if (message && typeof message === "object" && "pending" in message) {
        setHold({ email: message.pending, password: typedPassword })
        return
      }
      if (message) {
        setErrors([message])
        return
      }
      const account = getSnapshot().account
      if (!account) {
        setErrors(["E-posta veya şifre eşleşmedi."])
        return
      }
      if (account && claim && (account.role === "isletme" || account.role === "admin")) {
        addListing(claimListing(claim, account.id))
        adoptListingThreads(claim.id, account.id)
        sessionStorage.removeItem(CLAIM_KEY)
        router.push(`/isletme/${claim.slug}`)
        return
      }
      if (account) router.push(destinationFor(account.role, null, safeReturnPath(params.get("donus"))))
    } finally {
      setPending(false)
    }
  }

  async function submitCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    try {
      const message = await confirmAdminCode(code)
      if (message) {
        setErrors([
          message === "Kod eşleşmedi." ? t("auth.adminCodeBad") : message === "Yönetici girişi şu an kapalı." ? t("auth.adminClosed") : message,
        ])
        return
      }
      router.push("/yonetim")
    } finally {
      setPending(false)
    }
  }

  if (hold) return <PendingMail email={hold.email} password={hold.password} siteKey={siteKey} />

  if (codeStep) {
    return (
      <form onSubmit={submitCode} autoComplete="off" className="grid gap-4">
        <div>
          <h1 className="font-heading text-4xl">{t("auth.adminCode")}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("auth.adminCodeCopy")}</p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="admin-code">{t("auth.adminCode")}</Label>
          <Input
            id="admin-code"
            name="one-time-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
            className="h-11 tracking-[0.3em]"
          />
        </div>
        <ErrorList errors={errors} />
        <Button type="submit" className="h-11 rounded-xl" disabled={pending || code.length !== 8}>
          {pending ? t("auth.checking") : t("auth.submit")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 rounded-xl"
          onClick={() => {
            setCodeStep(false)
            setCode("")
            setErrors([])
          }}
        >
          {t("auth.back")}
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div>
        <h1 className="font-heading text-4xl">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="login-email">{t("auth.email")}</Label>
        <Input
          id="login-email"
          name="username"
          type="email"
          autoComplete="username"
          defaultValue={initialEmail || undefined}
          className="h-11"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="login-password">{t("auth.password")}</Label>
        <Input id="login-password" name="password" type="password" autoComplete="current-password" className="h-11" />
      </div>
      {door === "yonetici" ? null : (
        <Link href="/sifre" className="text-sm text-primary">
          {t("auth.forgot")}
        </Link>
      )}
      <TurnstileField siteKey={door === "yonetici" ? "" : siteKey} onToken={setToken} />
      <ErrorList errors={errors} />
      <Button type="submit" className="h-11 rounded-xl" disabled={pending || (door !== "yonetici" && Boolean(siteKey) && !token)}>
        {pending ? t("auth.checking") : t("auth.submit")}
      </Button>
      {door === "musteri" ? (
        <Link href="/hesap?kayit=musteri" className="text-center text-sm text-primary">
          {t("auth.noCustomer")}
        </Link>
      ) : null}
      {door === "isletme" ? (
        <Link href="/hesap?kayit=isletme" className="text-center text-sm text-primary">
          {t("auth.noBusiness")}
        </Link>
      ) : null}
      <Button variant="ghost" className="h-11 rounded-xl" nativeButton={false} render={<Link href="/hesap" />}>
        {t("auth.back")}
      </Button>
    </form>
  )
}

function CustomerForm({
  registerAccount,
  siteKey,
}: {
  registerAccount: ReturnType<typeof useAuth>["registerAccount"]
  siteKey: string
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
  const [token, setToken] = useState("")
  const [hold, setHold] = useState<{ email: string; password: string } | null>(null)
  const { locale } = useLocale()
  const router = useRouter()
  const params = useSearchParams()

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const typedName = submittedField(form, "name", "cust-name", name)
    const typedEmail = submittedField(form, "email", "cust-email", email)
    const typedPhone = submittedField(form, "phone", "cust-phone", phone)
    const typedId = submittedField(form, "national-id", "cust-id", nationalId)
    const typedBirth = submittedField(form, "birth", "cust-birth", birthDate)
    const typedPassword = submittedField(form, "password", "cust-pass", password)
    const typedAgain = submittedField(form, "password-again", "cust-again", again)
    const errors = problemsOf([
      typedName.trim().split(/\s+/).length < 2 ? "Ad ve soyadı birlikte yaz." : null,
      validEmail(typedEmail) ? null : "Geçerli bir e-posta yaz.",
      validPhone(typedPhone) ? null : "Telefon 5 ile başlayan bir cep numarası olmalı.",
      validTckn(typedId.replace(/\D/g, "")) ? null : "T.C. kimlik numarası geçersiz.",
      adultBirthDate(typedBirth) ? null : "Doğum tarihi 18 yaşından büyük bir gün olmalı.",
      validPassword(typedPassword) ? null : "Şifre en az 8 karakter olmalı.",
      typedPassword === typedAgain ? null : "Şifre tekrarı eşleşmedi.",
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
        email: typedEmail,
        password: typedPassword,
        name: typedName,
        phone: typedPhone,
        customer: { nationalId: typedId.replace(/\D/g, ""), birthDate: typedBirth },
        uploads: [{ label: "Teyit belgesi", file: document }],
        turnstile: token,
        locale,
      })
      if (message && typeof message === "object") {
        setHold({ email: message.pending, password: typedPassword })
        return
      }
      if (message) {
        setErrors([message])
        return
      }
      router.push(destinationFor("musteri", null, safeReturnPath(params.get("donus"))))
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Belge kaydedilemedi."])
    } finally {
      setPending(false)
    }
  }

  if (hold) return <PendingMail email={hold.email} password={hold.password} siteKey={siteKey} />

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div>
        <h1 className="font-heading text-4xl text-balance">Müşteri kaydı oluşturun</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Kimlik bilgisi ve teyit belgesi tamamlanmadan iletişim bilgileri ve özellikler açılmaz. İzleme kayıtsız da
          durur.
        </p>
      </div>
      <Field id="cust-name" name="name" label="Ad soyad" value={name} onChange={setName} autoComplete="name" />
      <Field id="cust-email" name="email" label="E-posta" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Field id="cust-phone" name="phone" label="Cep telefonu" value={phone} onChange={setPhone} inputMode="tel" autoComplete="tel" />
      <Field id="cust-id" name="national-id" label="T.C. kimlik numarası" value={nationalId} onChange={setNationalId} inputMode="numeric" />
      <div className="grid gap-1.5">
        <Label htmlFor="cust-birth">Doğum tarihi</Label>
        <Input id="cust-birth" name="birth" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} className="h-11" />
      </div>
      <Field id="cust-pass" name="password" label="Şifre" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
      <Field id="cust-again" name="password-again" label="Şifre tekrarı" type="password" value={again} onChange={setAgain} autoComplete="new-password" />
      <DocField
        label="Teyit belgesi"
        hint="Nüfus cüzdanı, kimlik kartı, ehliyet veya yerleşim yeri belgesi. PDF, JPG, PNG veya WEBP. En fazla 4 MB."
        file={document}
        onChange={setDocument}
      />
      <TurnstileField siteKey={siteKey} onToken={setToken} />
      <ErrorList errors={errors} />
      <Button type="submit" className="h-11 rounded-xl" disabled={pending || (Boolean(siteKey) && !token)}>
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
  siteKey,
}: {
  registerAccount: ReturnType<typeof useAuth>["registerAccount"]
  claim: Business | null
  siteKey: string
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
  const [token, setToken] = useState("")
  const [hold, setHold] = useState<{ email: string; password: string } | null>(null)
  const { locale } = useLocale()
  const params = useSearchParams()

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const typedEmail = submittedField(form, "email", "biz-email", email)
    const typedPassword = submittedField(form, "password", "biz-pass", password)
    const typedAgain = submittedField(form, "password-again", "biz-again", again)
    const uploads: Array<{ label: string; file: File | null }> = [
      { label: "Vergi levhası", file: vergi },
      { label: "İmza sirküleri", file: imza },
      { label: "Ticaret sicil veya faaliyet belgesi", file: sicil },
      { label: "Yetkili kimlik belgesi", file: kimlik },
    ]
    const errors = problemsOf([
      title.trim().length < 2 ? "İşletme unvanını yaz." : null,
      owner.trim().split(/\s+/).length < 2 ? "Yetkilinin adını ve soyadını yaz." : null,
      validEmail(typedEmail) ? null : "Geçerli bir e-posta yaz.",
      validPhone(phone) ? null : "Telefon 5 ile başlayan bir cep numarası olmalı.",
      validVkn(taxId.replace(/\D/g, "")) ? null : "Vergi kimlik numarası 10 haneli ve geçerli olmalı.",
      taxOffice.trim().length < 2 ? "Vergi dairesini yaz." : null,
      place.country && Number.isFinite(place.lat) ? null : "Şehir ve konum seç.",
      address.trim().length < 8 ? "Açık adresi yaz." : null,
      validPassword(typedPassword) ? null : "Şifre en az 8 karakter olmalı.",
      typedPassword === typedAgain ? null : "Şifre tekrarı eşleşmedi.",
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
        email: typedEmail,
        password: typedPassword,
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
        turnstile: token,
        locale,
      })
      if (message && typeof message === "object") {
        setHold({ email: message.pending, password: typedPassword })
        return
      }
      if (!message && claim) {
        const ownerId = getSnapshot().account?.id
        addListing(claimListing(claim, ownerId || ""))
        if (ownerId) adoptListingThreads(claim.id, ownerId)
        sessionStorage.removeItem(CLAIM_KEY)
        router.push(`/isletme/${claim.slug}`)
        return
      }
      if (!message) {
        router.push(destinationFor("isletme", null, safeReturnPath(params.get("donus"))))
        return
      }
      setErrors([message])
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Belgeler kaydedilemedi."])
    } finally {
      setPending(false)
    }
  }

  if (hold) return <PendingMail email={hold.email} password={hold.password} siteKey={siteKey} />

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
      <Field id="biz-email" name="email" label="E-posta" type="email" value={email} onChange={setEmail} autoComplete="email" />
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
      <Field id="biz-pass" name="password" label="Şifre" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
      <Field id="biz-again" name="password-again" label="Şifre tekrarı" type="password" value={again} onChange={setAgain} autoComplete="new-password" />
      <DocField label="Vergi levhası" hint="Güncel vergi levhası." file={vergi} onChange={setVergi} />
      <DocField label="İmza sirküleri" hint="Noter onaylı imza sirküleri veya yetki belgesi." file={imza} onChange={setImza} />
      <DocField label="Ticaret sicil veya faaliyet belgesi" hint="Sicil gazetesi ya da faaliyet belgesi." file={sicil} onChange={setSicil} />
      <DocField label="Yetkili kimlik belgesi" hint="İşlemi yapan kişinin kimlik kartı veya ehliyeti." file={kimlik} onChange={setKimlik} />
      <TurnstileField siteKey={siteKey} onToken={setToken} />
      <ErrorList errors={errors} />
      <Button type="submit" className="h-11 rounded-xl" disabled={pending || (Boolean(siteKey) && !token)}>
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
  name,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
}: {
  id: string
  name?: string
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
        name={name}
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
