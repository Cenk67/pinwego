import type { BoundSender } from "@/lib/mailer"

export async function emailSender(): Promise<BoundSender | null> {
  try {
    const loaded = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "cloudflare:workers")) as {
      env?: { EMAIL?: BoundSender }
    }
    const email = loaded.env?.EMAIL
    if (email && typeof email.send === "function") return email
  } catch {
    // Local Next has no email binding. Resend or the development inbox remains.
  }
  return null
}
