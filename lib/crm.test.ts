import assert from "node:assert/strict"
import {
  applyCrm,
  customerTicket,
  emptyCrm,
  istanbulDay,
  parseCrm,
  paymentStatus,
  quoteTotals,
  report,
  sweep,
  type Ticket,
} from "./crm"

const now = Date.parse("2026-10-13T09:00:00+03:00")
let state = emptyCrm()

function run(action: Record<string, unknown>) {
  const result = applyCrm(state, action, now)
  assert.equal(result.ok, true, result.ok ? "" : result.error)
  if (result.ok) state = result.state
  return result
}

const contact = run({ op: "contact.save", contact: { workspace: "personal", firstName: "Ada", lastName: "Yılmaz", email: "ada@ornek.com", phone: "05551112233", source: "telefon" } })
assert.equal(contact.ok, true)
const personal = state.contacts[0]
const business = run({ op: "contact.save", contact: { workspace: "pinwego", contactType: "platform", businessId: "yokustepe", company: "Yokuştepe", source: "platform" } })
assert.equal(business.ok, true)

assert.equal(applyCrm(state, { op: "contact.save", contact: { workspace: "pinwego", contactType: "platform" } }, now).ok, false)
assert.equal(applyCrm(state, { op: "deal.save", deal: { contactId: personal.id, title: "Paket", stage: "kaybedildi", amountCents: 1000, probability: 10 } }, now).ok, false)

run({ op: "deal.save", deal: { contactId: personal.id, title: "Kişisel iş", stage: "kazanildi", amountCents: 150000, currency: "TRY", probability: 80 } })
run({ op: "deal.save", deal: { contactId: state.contacts.find((item) => item.workspace === "pinwego")!.id, title: "Pinwego paket", stage: "kazanildi", amountCents: 90000, currency: "USD", probability: 50 } })
const view = report(state, "personal", "TRY", "2026-10-01", "2026-10-31")
assert.equal(view.wonCents, 150000)
assert.equal(view.wonCount, 1)
assert.equal(report(state, "pinwego", "TRY", "2026-10-01", "2026-10-31").wonCents, 0)

const totals = quoteTotals([
  { id: "a", description: "Kurulum", quantity: 2, unitCents: 10000, taxBps: 2000 },
  { id: "b", description: "Destek", quantity: 1, unitCents: 5000, taxBps: 1000 },
])
assert.equal(totals.subtotal, 25000)
assert.equal(totals.tax, 4500)
assert.equal(totals.total, 29500)

run({
  op: "quote.save",
  quote: {
    contactId: personal.id,
    currency: "TRY",
    validUntil: "2026-10-20",
    items: [{ description: "Kurulum", quantity: 2, unitCents: 10000, taxBps: 2000 }],
  },
})
const quote = state.quotes[0]
assert.equal(quote.number, "PW-2026-0001")
assert.equal(quoteTotals(quote.items).total, 24000)
run({ op: "quote.status", id: quote.id, status: "kabul" })
assert.equal(state.payments.length, 0)

run({ op: "payment.save", clientKey: "tahsil-1", payment: { contactId: personal.id, quoteId: quote.id, amountCents: 24000, currency: "TRY", dueDate: "2026-10-12" } })
run({ op: "payment.save", clientKey: "tahsil-1", payment: { contactId: personal.id, amountCents: 24000, currency: "TRY", dueDate: "2026-10-12" } })
assert.equal(state.payments.length, 1)
const payment = state.payments[0]
assert.equal(paymentStatus(payment, now), "gecikti")
run({ op: "payment.receive", id: payment.id, amountCents: 10000, clientKey: "hareket-1", reference: "elden" })
run({ op: "payment.receive", id: payment.id, amountCents: 10000, clientKey: "hareket-1", reference: "elden" })
assert.equal(state.payments[0].marks.length, 1)
assert.equal(paymentStatus(state.payments[0], now), "kismi")
assert.equal(applyCrm(state, { op: "payment.receive", id: payment.id, amountCents: 20000, clientKey: "hareket-2" }, now).ok, false)
run({ op: "payment.receive", id: payment.id, amountCents: 14000, clientKey: "hareket-2" })
assert.equal(paymentStatus(state.payments[0], now), "odendi")
assert.equal(report(state, "personal", "TRY", "2026-10-01", "2026-10-31").collectedCents, 24000)
assert.equal(report(state, "personal", "TRY", "2026-10-01", "2026-10-31").quoteCents, 24000)

run({ op: "task.save", task: { workspace: "personal", title: "Ara", dueAt: "2026-10-13T08:00:00+03:00", reminderAt: "2026-10-13T08:30:00+03:00", recurrence: "hafta", until: "2026-10-20" } })
const task = state.tasks[0]
run({ op: "task.status", id: task.id, status: "tamamlandi" })
assert.equal(state.tasks.filter((item) => item.title === "Ara").length, 2)
const again = applyCrm(state, { op: "notice.read", id: state.notices[0]?.id || "yok" }, now)
assert.equal(state.notices.filter((item) => item.key.startsWith("task-remind:")).length, 1)
const swept = sweep(structuredClone(again.ok ? again.state : state), now + 1000)
assert.equal(swept.notices.filter((item) => item.key.startsWith("task-remind:")).length, 1)

run({ op: "event.save", event: { workspace: "pinwego", title: "Toplantı", startAt: "2026-10-14T10:00:00+03:00", endAt: "2026-10-14T11:00:00+03:00" } })
const clash = applyCrm(state, { op: "event.save", event: { workspace: "pinwego", title: "İkinci", startAt: "2026-10-14T10:30:00+03:00", endAt: "2026-10-14T12:00:00+03:00" } }, now)
assert.equal(clash.ok && clash.warning.includes("Toplantı"), true)
assert.equal(applyCrm(state, { op: "event.save", event: { workspace: "pinwego", title: "Ters", startAt: "2026-10-14T12:00:00+03:00", endAt: "2026-10-14T11:00:00+03:00" } }, now).ok, false)

run({ op: "subscription.save", subscription: { contactId: personal.id, plan: "Ajanda", amountCents: 50000, currency: "TRY", period: "aylik", startsAt: "2026-10-01", nextRenewal: "2026-10-16", status: "aktif" } })
const renewalKey = (rows: typeof state.tasks) => rows.filter((item) => item.seriesKey.startsWith("sub:")).length
assert.equal(renewalKey(state.tasks), 1)
assert.equal(renewalKey(sweep(structuredClone(state), now).tasks), 1)

run({ op: "ticket.save", ticket: { contactId: personal.id, subject: "Fatura", description: "Kopya", priority: "acil", dueAt: "2026-10-12T09:00:00+03:00" } })
const ticket = state.tickets[0]
run({ op: "ticket.note", id: ticket.id, message: "Müşteriye görünen not", internal: false })
run({ op: "ticket.note", id: ticket.id, message: "İç not", internal: true })
const hidden = customerTicket(state.tickets[0])
assert.equal(hidden.messages.length, 1)
assert.equal(hidden.messages[0].body.includes("İç"), false)

const broken = parseCrm("{")
assert.equal(broken, null)
assert.equal(parseCrm(null)?.version, 1)
assert.equal(istanbulDay("2026-10-13T00:30:00Z"), "2026-10-13")

const sample: Ticket = state.tickets[0]
assert.equal(sample.messages.length, 2)

console.log("crm hesabı sabit")
