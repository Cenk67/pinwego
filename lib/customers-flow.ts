import { adminSessionOpen, readAdminCookie } from "@/lib/admin-gate"
import { correctCustomerFields, setCustomerStatus } from "@/lib/account-record"
import { accountStore } from "@/lib/account-kv"
import { jsonReply, readJson, requestIp, takeIpSlot } from "@/lib/account-route"
import { customerTotals, noteCustomerAudit, readCustomerAudit, readCustomers, rememberCustomer } from "@/lib/customers"
import { memberEmail, publicAccount, readMemberCookie } from "@/lib/member-session"
import { consentsFor, latestMarketing, setMarketingConsent } from "@/lib/pages-flow"

export async function musteriGetFlow(request: Request) {
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  if (await adminSessionOpen(store, readAdminCookie(request.headers.get("cookie")))) {
    const id = new URL(request.url).searchParams.get("id")?.slice(0, 80) ?? ""
    const items = await readCustomers(store)
    if (id) {
      const item = items.find((row) => row.id === id)
      if (!item) return jsonReply({ ok: false, reason: "unknown" }, 404)
      return jsonReply({ ok: true, item, consents: await consentsFor(store, id), audit: await readCustomerAudit(store, id) })
    }
    return jsonReply({ ok: true, items, totals: customerTotals(items) })
  }
  const email = await memberEmail(store, readMemberCookie(request.headers.get("cookie")))
  const account = email ? await publicAccount(store, email) : null
  if (!account || account.role !== "musteri" || account.status === "silindi") return jsonReply({ ok: false, reason: "yetki" }, 401)
  return jsonReply({
    ok: true,
    own: {
      id: account.id,
      firstName: account.customer?.firstName ?? "",
      lastName: account.customer?.lastName ?? "",
      birthDate: account.customer?.birthDate ?? "",
      occupation: account.customer?.occupation ?? "",
      phone: account.phone,
      status: account.status,
      marketing: await latestMarketing(store, account.id),
    },
  })
}

export async function musteriPostFlow(request: Request, now = Date.now()) {
  const body = await readJson(request, 4000)
  if (!body || typeof body.op !== "string") return jsonReply({ ok: false, reason: "invalid" }, 400)
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  const stamp = new Date(now).toISOString()
  if (await adminSessionOpen(store, readAdminCookie(request.headers.get("cookie")))) {
    const id = typeof body.id === "string" ? body.id.slice(0, 80) : ""
    const item = (await readCustomers(store)).find((row) => row.id === id)
    if (!item) return jsonReply({ ok: false, reason: "unknown" }, 404)
    if (body.op === "durum") {
      const status = body.status === "aktif" || body.status === "askida" || body.status === "silindi" ? body.status : ""
      if (!status) return jsonReply({ ok: false, reason: "invalid" }, 400)
      const account = await setCustomerStatus(store, item.email, status, stamp)
      if (!account) return jsonReply({ ok: false, reason: "invalid" }, 400)
      await rememberCustomer(store, account, await latestMarketing(store, account.id))
      await noteCustomerAudit(store, account.id, "yonetici", "durum", status, stamp)
      return jsonReply({ ok: true })
    }
    if (body.op === "duzelt") {
      const account = await correctCustomerFields(
        store,
        item.email,
        {
          firstName: typeof body.firstName === "string" ? body.firstName : "",
          lastName: typeof body.lastName === "string" ? body.lastName : "",
          birthDate: typeof body.birthDate === "string" ? body.birthDate : "",
          occupation: typeof body.occupation === "string" ? body.occupation : "",
          phone: typeof body.phone === "string" ? body.phone : "",
        },
        stamp,
      )
      if (account === "invalid") return jsonReply({ ok: false, reason: "invalid" }, 400)
      if (!account) return jsonReply({ ok: false, reason: "unknown" }, 404)
      await rememberCustomer(store, account, await latestMarketing(store, account.id))
      await noteCustomerAudit(store, account.id, "yonetici", "duzelt", "ad, doğum tarihi, meslek veya telefon", stamp)
      return jsonReply({ ok: true })
    }
    if (body.op === "pazarlama" && body.accepted === false) {
      if (!(await setMarketingConsent(store, item.id, false, now))) return jsonReply({ ok: false, reason: "invalid" }, 400)
      const account = await publicAccount(store, item.email)
      if (account) await rememberCustomer(store, account, false)
      await noteCustomerAudit(store, item.id, "yonetici", "pazarlama", "kampanya postası kapatıldı", stamp)
      return jsonReply({ ok: true })
    }
    return jsonReply({ ok: false, reason: "invalid" }, 400)
  }
  if (body.op !== "pazarlama") return jsonReply({ ok: false, reason: "yetki" }, 401)
  if (!(await takeIpSlot(requestIp(request), "pazarlama", now, 20, 60_000))) return jsonReply({ ok: false, reason: "limited" })
  const email = await memberEmail(store, readMemberCookie(request.headers.get("cookie")))
  const account = email ? await publicAccount(store, email) : null
  if (!account || account.role !== "musteri" || account.status === "silindi" || account.status === "askida") {
    return jsonReply({ ok: false, reason: "yetki" }, 401)
  }
  const accepted = body.accepted === true
  if (!(await setMarketingConsent(store, account.id, accepted, now))) return jsonReply({ ok: false, reason: "invalid" }, 400)
  await rememberCustomer(store, account, accepted)
  await noteCustomerAudit(store, account.id, "musteri", "pazarlama", accepted ? "kampanya postası açıldı" : "kampanya postası kapatıldı", stamp)
  return jsonReply({ ok: true, marketing: accepted })
}
