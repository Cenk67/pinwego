import assert from "node:assert/strict"
import { pickShareData, startSystemShare } from "./share"

const share = {
  title: "Kahvaltı · pinwego",
  text: "Saat, masa ve fiyat aynı kartta.",
  url: "https://pinwego.com/blog/rehber/secim/kahvalti?kaynak=paylas",
}

const urlOnly = pickShareData(share, (data) => !("text" in data) && !("title" in data))
assert.deepEqual(urlOnly, { url: share.url })

let seen: unknown = null
const pending = startSystemShare(share, {
  canShare: () => true,
  share(data) {
    seen = data
    return Promise.resolve()
  },
})
assert.deepEqual(seen, { title: share.title, text: share.text, url: share.url })
assert.equal(await pending, "shared")

const cancelled = await startSystemShare(share, {
  share: () => Promise.reject(Object.assign(new Error("iptal"), { name: "AbortError" })),
})
assert.equal(cancelled, "abort")
assert.equal(await startSystemShare(share, {}), "unsupported")
