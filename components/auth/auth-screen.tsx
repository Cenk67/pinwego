"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
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
import type { MessageKey } from "@/lib/messages"
import type { Business } from "@/lib/types"
import {
  fileProblem,
  validBirthDate,
  validEmail,
  validGsm,
  validPassword,
  validPhone,
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

function adminCodeValue(value: string) {
  if (/[A-Za-z@]/.test(value)) return ""
  return value.replace(/\D/g, "").slice(0, 8)
}

function adminShown(message: string, t: (key: MessageKey) => string) {
  if (message === "Kod eşleşmedi.") return t("auth.adminCodeBad")
  if (message === "Yönetici girişi şu an kapalı.") return t("auth.adminClosed")
  if (message === "Çok fazla deneme. Bir süre sonra tekrar dene.") return t("auth.limited")
  if (message === "Kullanıcı adı veya şifre eşleşmedi." || message === "E-posta veya şifre eşleşmedi.") return t("auth.adminMismatch")
  return message
}

function FillTrap() {
  return (
    <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
      <input tabIndex={-1} type="text" name="username" autoComplete="username" defaultValue="" />
      <input tabIndex={-1} type="password" name="password" autoComplete="current-password" defaultValue="" />
    </div>
  )
}

function quietField(ready: boolean, arm: () => void) {
  return {
    autoComplete: "off" as const,
    autoCapitalize: "none" as const,
    autoCorrect: "off" as const,
    spellCheck: false as const,
    readOnly: !ready,
    "data-1p-ignore": "true",
    "data-lpignore": "true",
    "data-bwignore": "true",
    "data-form-type": "other",
    onFocus: (event: React.FocusEvent<HTMLInputElement>) => {
      arm()
      const element = event.currentTarget
      const wipe = () => {
        if (element.dataset.typed === "1") return
        element.value = ""
      }
      window.setTimeout(wipe, 60)
      window.setTimeout(wipe, 400)
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      event.currentTarget.dataset.typed = "1"
    },
    onInput: (event: React.FormEvent<HTMLInputElement>) => {
      const native = event.nativeEvent
      if (!(native instanceof InputEvent)) return
      if (native.inputType === "insertReplacementText") {
        event.currentTarget.value = ""
        delete event.currentTarget.dataset.typed
        return
      }
      if (native.inputType === "insertText" || native.inputType === "insertFromPaste" || native.inputType === "deleteContentBackward") {
        event.currentTarget.dataset.typed = "1"
      }
    },
  }
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
  const [loginReady, setLoginReady] = useState(false)
  const [codeReady, setCodeReady] = useState(false)
  const { t, locale } = useLocale()
  const adminDoor = door === "yonetici"
  const title = adminDoor ? t("auth.adminIn") : door === "isletme" ? t("auth.businessIn") : t("auth.customerIn")
  const copy =
    adminDoor ? t("auth.adminCopy") : door === "isletme" ? t("auth.businessCopy") : t("auth.customerCopy")

  useEffect(() => {
    if (!adminDoor || codeStep) return
    const wipe = () => {
      for (const id of ["admin-login", "admin-secret"]) {
        const element = document.getElementById(id)
        if (!(element instanceof HTMLInputElement) || element.dataset.typed === "1") continue
        element.value = ""
      }
    }
    wipe()
    const timers = [40, 200, 700, 1500].map((delay) => window.setTimeout(wipe, delay))
    return () => {
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [adminDoor, codeStep])

  useEffect(() => {
    if (!codeStep) return
    const wipe = () => {
      const element = document.getElementById("admin-code")
      if (!(element instanceof HTMLInputElement) || !/[A-Za-z@]/.test(element.value)) return
      element.value = ""
      setCode("")
    }
    wipe()
    const timers = [40, 200, 700].map((delay) => window.setTimeout(wipe, delay))
    return () => {
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [codeStep, codeReady])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const typedEmail = adminDoor
      ? submittedField(form, "pinwego-admin-login", "admin-login", "")
      : submittedField(form, "username", "login-email", "")
    const typedPassword = adminDoor
      ? submittedField(form, "pinwego-admin-secret", "admin-secret", "")
      : submittedField(form, "password", "login-password", "")
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
        setErrors([adminDoor ? adminShown(message, t) : message])
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
        setErrors([adminShown(message, t)])
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
      <form onSubmit={submitCode} autoComplete="off" className="relative grid gap-4">
        <FillTrap />
        <div>
          <h1 className="font-heading text-4xl">{t("auth.adminCode")}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("auth.adminCodeCopy")}</p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="admin-code">{t("auth.adminCode")}</Label>
          <Input
            id="admin-code"
            name="pinwego-yonetici-kod"
            type="text"
            inputMode="numeric"
            {...quietField(codeReady, () => setCodeReady(true))}
            maxLength={8}
            value={code}
            onChange={(event) => setCode(adminCodeValue(event.target.value))}
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
            setCodeReady(false)
            setLoginReady(false)
            setErrors([])
          }}
        >
          {t("auth.back")}
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={submit} autoComplete={adminDoor ? "off" : undefined} className="relative grid gap-4">
      {adminDoor ? <FillTrap /> : null}
      <div>
        <h1 className="font-heading text-4xl">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
      </div>
      {adminDoor ? (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor="admin-login">{t("auth.username")}</Label>
            <Input
              id="admin-login"
              name="pinwego-admin-login"
              type="text"
              defaultValue=""
              className="h-11"
              {...quietField(loginReady, () => setLoginReady(true))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="admin-secret">{t("auth.password")}</Label>
            <Input
              id="admin-secret"
              name="pinwego-admin-secret"
              type="password"
              defaultValue=""
              className="h-11"
              {...quietField(loginReady, () => setLoginReady(true))}
            />
          </div>
        </>
      ) : (
        <>
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
        </>
      )}
      {adminDoor ? null : (
        <Link href="/sifre" className="text-sm text-primary">
          {t("auth.forgot")}
        </Link>
      )}
      <TurnstileField siteKey={adminDoor ? "" : siteKey} onToken={setToken} />
      <ErrorList errors={errors} />
      <Button type="submit" className="h-11 rounded-xl" disabled={pending || (!adminDoor && Boolean(siteKey) && !token)}>
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

type CustomerMiss = Partial<Record<"first" | "last" | "birth" | "job" | "phone" | "email" | "password" | "again" | "terms", string>>

function CustomerForm({
  registerAccount,
  siteKey,
}: {
  registerAccount: ReturnType<typeof useAuth>["registerAccount"]
  siteKey: string
}) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [occupation, setOccupation] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [password, setPassword] = useState("")
  const [again, setAgain] = useState("")
  const [miss, setMiss] = useState<CustomerMiss>({})
  const [errors, setErrors] = useState<string[]>([])
  const [pending, setPending] = useState(false)
  const [token, setToken] = useState("")
  const [terms, setTerms] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [hold, setHold] = useState<{ email: string; password: string; failed: boolean } | null>(null)
  const { locale } = useLocale()
  const router = useRouter()
  const params = useSearchParams()

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const typedFirst = submittedField(form, "given-name", "cust-first", firstName).trim()
    const typedLast = submittedField(form, "family-name", "cust-last", lastName).trim()
    const typedEmail = submittedField(form, "email", "cust-email", email).trim()
    const typedPhone = submittedField(form, "phone", "cust-phone", phone).trim()
    const typedJob = submittedField(form, "occupation", "cust-job", occupation).trim()
    const typedBirth = submittedField(form, "birth", "cust-birth", birthDate)
    const typedPassword = submittedField(form, "password", "cust-pass", password)
    const typedAgain = submittedField(form, "password-again", "cust-again", again)
    const next: CustomerMiss = {}
    if (typedFirst.length < 2) next.first = "Adı yaz."
    if (typedLast.length < 2) next.last = "Soyadı yaz."
    if (!validBirthDate(typedBirth)) next.birth = "Doğum tarihi geçerli bir gün olmalı ve bugünden sonra olamaz."
    if (typedJob.length < 2) next.job = "Mesleği yaz."
    if (!validGsm(typedPhone)) next.phone = "Türkiye cep numarası ya da ülke kodlu uluslararası numara yaz."
    if (!validEmail(typedEmail)) next.email = "Geçerli bir e-posta yaz."
    if (!validPassword(typedPassword)) next.password = "Şifre en az 8 karakter olmalı ve harf ile rakam içermeli."
    if (typedPassword !== typedAgain) next.again = "Şifre tekrarı eşleşmedi."
    if (!terms) next.terms = "Üyelik sözleşmesini, kullanım koşullarını ve aydınlatma metnini onaylamadan kayıt açılmaz."
    setMiss(next)
    setErrors([])
    if (Object.keys(next).length) return
    setPending(true)
    try {
      const message = await registerAccount({
        role: "musteri",
        email: typedEmail,
        password: typedPassword,
        name: `${typedFirst} ${typedLast}`,
        phone: typedPhone,
        customer: { firstName: typedFirst, lastName: typedLast, birthDate: typedBirth, occupation: typedJob },
        uploads: [],
        turnstile: token,
        locale,
        acceptTerms: terms,
        marketing,
      })
      if (message && typeof message === "object" && "pending" in message) {
        setHold({ email: message.pending, password: typedPassword, failed: message.mail === "failed" })
        return
      }
      if (typeof message === "string") {
        setErrors([message])
        return
      }
      router.push(destinationFor("musteri", null, safeReturnPath(params.get("donus"))))
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Kayıt tamamlanamadı."])
    } finally {
      setPending(false)
    }
  }

  if (hold) return <PendingMail email={hold.email} password={hold.password} siteKey={siteKey} failed={hold.failed} />

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div>
        <h1 className="font-heading text-4xl text-balance">Müşteri kaydı oluşturun</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Ad, soyad, doğum tarihi, meslek ve iletişim bilgisiyle hesap açılır. Kimlik belgesi ve kimlik numarası istenmez.
          E-posta doğrulanmadan hesap açılmaz.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="cust-first" name="given-name" label="Adı" value={firstName} onChange={setFirstName} autoComplete="given-name" error={miss.first} />
        <Field id="cust-last" name="family-name" label="Soyadı" value={lastName} onChange={setLastName} autoComplete="family-name" error={miss.last} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="cust-birth">Doğum Tarihi</Label>
        <Input id="cust-birth" name="birth" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} aria-invalid={Boolean(miss.birth)} className="h-11" />
        {miss.birth ? <p className="text-sm text-destructive">{miss.birth}</p> : null}
      </div>
      <Field id="cust-job" name="occupation" label="Meslek" value={occupation} onChange={setOccupation} autoComplete="organization-title" error={miss.job} />
      <Field id="cust-phone" name="phone" label="GSM" value={phone} onChange={setPhone} inputMode="tel" autoComplete="tel" error={miss.phone} />
      <Field id="cust-email" name="email" label="E-posta" type="email" value={email} onChange={setEmail} autoComplete="email" error={miss.email} />
      <Field id="cust-pass" name="password" label="Şifre" type="password" value={password} onChange={setPassword} autoComplete="new-password" error={miss.password} />
      <p className="-mt-2 text-xs leading-5 text-muted-foreground">En az 8 karakter, bir harf ve bir rakam. Şifre tekrarı saklanmaz.</p>
      <Field id="cust-again" name="password-again" label="Şifre Tekrarı" type="password" value={again} onChange={setAgain} autoComplete="new-password" error={miss.again} />
      <ConsentFields terms={terms} marketing={marketing} onTerms={setTerms} onMarketing={setMarketing} />
      {miss.terms ? <p className="-mt-2 text-sm text-destructive">{miss.terms}</p> : null}
      <TurnstileField siteKey={siteKey} onToken={setToken} />
      <ErrorList errors={errors} />
      <Button type="submit" className="h-11 rounded-xl" disabled={pending || (Boolean(siteKey) && !token)}>
        {pending ? "Kayıt açılıyor" : "Doğrula ve Kaydı Aç"}
      </Button>
      <Link href="/hesap?kayit=giris&kapi=musteri" className="text-center text-sm text-primary">
        Zaten Müşteri Hesabım Var
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
  const [terms, setTerms] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [hold, setHold] = useState<{ email: string; password: string; failed: boolean } | null>(null)
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
      validPassword(typedPassword) ? null : "Şifre en az 8 karakter olmalı ve harf ile rakam içermeli.",
      typedPassword === typedAgain ? null : "Şifre tekrarı eşleşmedi.",
      ...uploads.map((item) => (item.file ? fileProblem(item.file) && `${item.label}: ${fileProblem(item.file)}` : `${item.label} yükle.`)),
      terms ? null : "Üyelik sözleşmesini onaylamadan kayıt açılmaz.",
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
        acceptTerms: terms,
        marketing,
      })
      if (message && typeof message === "object" && "pending" in message) {
        setHold({ email: message.pending, password: typedPassword, failed: message.mail === "failed" })
        return
      }
      if (typeof message === "string") {
        setErrors([message])
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
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Belgeler kaydedilemedi."])
    } finally {
      setPending(false)
    }
  }

  if (hold) return <PendingMail email={hold.email} password={hold.password} siteKey={siteKey} failed={hold.failed} />

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
      <ConsentFields terms={terms} marketing={marketing} onTerms={setTerms} onMarketing={setMarketing} />
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

function ConsentFields({
  terms,
  marketing,
  onTerms,
  onMarketing,
}: {
  terms: boolean
  marketing: boolean
  onTerms: (value: boolean) => void
  onMarketing: (value: boolean) => void
}) {
  return (
    <div className="grid gap-3 text-sm leading-6">
      <label className="flex items-start gap-2">
        <input type="checkbox" checked={terms} onChange={(event) => onTerms(event.target.checked)} className="mt-1" />
        <span>
          <Link href="/uyelik-sozlesmesi" className="text-primary">Üyelik sözleşmesini</Link>,{" "}
          <Link href="/kullanim-kosullari" className="text-primary">kullanım koşullarını</Link> ve{" "}
          <Link href="/kvkk-aydinlatma-metni" className="text-primary">aydınlatma metnini</Link> okudum. Üyelik için sözleşmeyi kabul ediyorum.
        </span>
      </label>
      <label className="flex items-start gap-2">
        <input type="checkbox" checked={marketing} onChange={(event) => onMarketing(event.target.checked)} className="mt-1" />
        <span>Kampanya ve duyuru e-postası almak istiyorum. Bu seçenek üyelik için zorunlu değildir ve önceden işaretli gelmez.</span>
      </label>
    </div>
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
  error,
}: {
  id: string
  name?: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
  inputMode?: "text" | "tel" | "numeric" | "email"
  error?: string
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
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="h-11"
      />
      {error ? <p id={`${id}-error`} className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
