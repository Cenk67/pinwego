import { adminSessionOpen, readAdminCookie } from "@/lib/admin-gate"
import { correctCustomerFields, setCustomerStatus } from "@/lib/account-record"
import { accountStore } from "@/lib/account-kv"
import { jsonReply, readJson, requestIp, takeIpSlot } from "@/lib/account-route"
import { channelLabel, channelsOf, commsPrefsKey, enrichCustomers, filterCustomers, forgetCustomer, noteEmailConsent, paginate, setChannelConsent } from "@/lib/comms"
import { customerCommsDetail, readComms, readCustomerFilter } from "@/lib/comms-flow"
import { customerTotals, noteCustomerAudit, readCustomerAudit, readCustomers, rememberCustomer } from "@/lib/customers"
import { memberEmail, publicAccount, readMemberCookie } from "@/lib/member-session"
import { consentsFor, latestMarketing, setMarketingConsent } from "@/lib/pages-flow"

export async function musteriGetFlow(request: Request) {
  const store = await accountStore()
  if (!store) return jsonReply({ ok: false, reason: "unavailable" }, 503)
  if (await adminSessionOpen(store, readAdminCookie(request.headers.get("cookie")))) {
    const url = new URL(request.url)
    const id = url.searchParams.get("id")?.slice(0, 80) ?? ""
    const items = await readCustomers(store)
    const comms = await readComms(store)
    if (!comms) return jsonReply({ ok: false, reason: "bozuk" }, 500)
    const enriched = enrichCustomers(items, comms)
    if (id) {
      const item = enriched.find((row) => row.id === id)
      if (!item) return jsonReply({ ok: false, reason: "unknown" }, 404)
      return jsonReply({ ok: true, item, consents: await consentsFor(store, id), audit: await readCustomerAudit(store, id), comms: await customerCommsDetail(store, id) })
    }
    const totals = customerTotals(items)
    const sayfa = url.searchParams.get("sayfa")
    if (sayfa === null) return jsonReply({ ok: true, items: enriched, totals })
    const filtered = filterCustomers(enriched, readCustomerFilter(url.searchParams))
    const paged = paginate(filtered, Number(sayfa), Number(url.searchParams.get("adet") ?? 50))
    return jsonReply({ ok: true, items: paged.items, totals, page: paged.page })
  }
  const email = await memberEmail(store, readMemberCookie(request.headers.get("cookie")))
  const account = email ? await publicAccount(store, email) : null
  if (!account || account.role !== "musteri" || account.status === "silindi") return jsonReply({ ok: false, reason: "yetki" }, 401)
  const comms = await readComms(store)
  const marketing = await latestMarketing(store, account.id)
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
      marketing,
      channels: channelsOf(comms?.prefs[account.id], marketing),
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
      if (status === "silindi") {
        const comms = await readComms(store)
        if (comms) await store.put(commsPrefsKey, JSON.stringify(forgetCustomer(comms, account.id, stamp)))
      }
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
      const comms = await readComms(store)
      if (comms) await store.put(commsPrefsKey, JSON.stringify(noteEmailConsent(comms, item.id, false, "yonetici", stamp, "Yönetici kapattı")))
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
  const channel = body.kanal === "sms" || body.kanal === "whatsapp" ? body.kanal : "eposta"
  const comms = await readComms(store)
  if (channel !== "eposta") {
    if (!comms) return jsonReply({ ok: false, reason: "bozuk" }, 500)
    const next = setChannelConsent(comms, account.id, channel, accepted, "hesap", stamp)
    await store.put(commsPrefsKey, JSON.stringify(next))
    await noteCustomerAudit(store, account.id, "musteri", "pazarlama", `${channelLabel[channel]} ${accepted ? "açıldı" : "kapatıldı"}`, stamp)
    return jsonReply({ ok: true, marketing: await latestMarketing(store, account.id), channels: channelsOf(next.prefs[account.id], await latestMarketing(store, account.id)) })
  }
  if (!(await setMarketingConsent(store, account.id, accepted, now))) return jsonReply({ ok: false, reason: "invalid" }, 400)
  await rememberCustomer(store, account, accepted)
  if (comms) await store.put(commsPrefsKey, JSON.stringify(noteEmailConsent(comms, account.id, accepted, "hesap", stamp)))
  await noteCustomerAudit(store, account.id, "musteri", "pazarlama", accepted ? "kampanya postası açıldı" : "kampanya postası kapatıldı", stamp)
  return jsonReply({ ok: true, marketing: accepted, channels: channelsOf(comms?.prefs[account.id], accepted) })
}
