import handler from "vinext/server/fetch-handler"
import { crmRemindSweep } from "@/lib/crm-flow"
import { notifyDigestSweep } from "@/lib/notify-flow"

export * from "vinext/server/fetch-handler"

const fetch = typeof handler === "function" ? handler : handler.fetch

const worker = {
  fetch(request, env, ctx) {
    return fetch(request, env, ctx)
  },
  scheduled(_event, _env, ctx) {
    ctx.waitUntil(Promise.all([
      crmRemindSweep().catch(() => undefined),
      notifyDigestSweep().catch(() => undefined),
    ]))
  },
}

export default worker
