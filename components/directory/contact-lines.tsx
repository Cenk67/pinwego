"use client"

import { Phone, Smartphone } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useGuestGate } from "@/components/auth/guest-gate"
import { contactKinds, visibleContacts, type ContactDraft, type ContactKind } from "@/lib/contacts"
import type { Business } from "@/lib/types"

function Mark({ kind }: { kind: ContactKind }) {
  if (kind === "mobile") return <Smartphone className="size-4" />
  if (kind === "whatsapp") {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path
          fill="currentColor"
          d="M12.1 4.2a7.6 7.6 0 0 0-6.6 11.3L4.4 19.6l4.2-1.1A7.6 7.6 0 1 0 12.1 4.2Zm4.4 10.8c-.2.5-1 .9-1.4 1-.4.1-.8.1-1.3 0-.3-.1-1.1-.4-2.1-1.2-1.2-1-2-2.3-2.2-2.6-.2-.4-.5-1.1 0-1.6.2-.2.5-.5.7-.7.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6-.1-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.6 5.8 5 .8.3 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 2-.8 2.3-1.6.3-.8.3-1.5.2-1.6-.1-.1-.3-.2-.6-.3Z"
        />
      </svg>
    )
  }
  return <Phone className="size-4" />
}

export function ContactLines({ business }: { business: Pick<Business, "contacts" | "phone"> }) {
  const items = visibleContacts(business)
  const { member, allow } = useGuestGate()
  if (!items.length) return null
  return (
    <div className="grid gap-2">
      <h2 className="font-heading text-lg">İletişim</h2>
      {items.map((item) =>
        member ? (
          <Button
            key={item.id}
            variant="outline"
            className="h-11 justify-start rounded-xl"
            nativeButton={false}
            render={
              <a
                href={item.href}
                target={item.id === "whatsapp" ? "_blank" : undefined}
                rel={item.id === "whatsapp" ? "noreferrer" : undefined}
              />
            }
          >
            <Mark kind={item.id} />
            <span className="text-muted-foreground">{item.label}</span>
            <span>{item.value}</span>
          </Button>
        ) : (
          <Button
            key={item.id}
            type="button"
            variant="outline"
            className="h-11 justify-start rounded-xl"
            onClick={() => allow(() => undefined)}
          >
            <Mark kind={item.id} />
            {item.guest}
          </Button>
        ),
      )}
    </div>
  )
}

export function ContactEditor({
  value,
  onChange,
}: {
  value: ContactDraft
  onChange: (next: ContactDraft) => void
}) {
  const [notice, setNotice] = useState("")
  return (
    <fieldset className="grid gap-2">
      <legend className="font-heading text-lg">İletişim</legend>
      <p className="text-xs leading-5 text-muted-foreground">
        Sabit telefon, GSM ve WhatsApp ayrı durur. Boş bırakılan numara işletme sayfasında görünmez.
      </p>
      {contactKinds.map((kind) => (
        <div key={kind.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-secondary">
            <Mark kind={kind.id} />
          </span>
          <Input
            aria-label={kind.label}
            inputMode="tel"
            value={value[kind.id]}
            placeholder={`${kind.label} · ${kind.placeholder}`}
            className="h-10"
            onChange={(event) => {
              setNotice("")
              onChange({ ...value, [kind.id]: event.target.value })
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl px-3"
            disabled={!value[kind.id].trim()}
            onClick={() => {
              onChange({ ...value, [kind.id]: "" })
              setNotice(`${kind.label} silindi. Kaydedince sayfadan kalkar.`)
            }}
          >
            Sil
          </Button>
        </div>
      ))}
      {notice ? <p className="text-xs text-muted-foreground">{notice}</p> : null}
    </fieldset>
  )
}
