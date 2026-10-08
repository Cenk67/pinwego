import assert from "node:assert/strict"
import { classifyAttachment, isChatAttachment } from "./chat-files"

function kindOf(file: { name: string; type: string; size: number }) {
  const result = classifyAttachment(file)
  return typeof result === "string" ? result : result.kind
}

assert.equal(kindOf({ name: "vitrin.jpg", type: "image/jpeg", size: 1200 }), "image")
assert.equal(kindOf({ name: "vitrin.JPEG", type: "", size: 1200 }), "image")
assert.equal(kindOf({ name: "plan.png", type: "image/png", size: 80 }), "image")
assert.equal(kindOf({ name: "kart.webp", type: "image/webp", size: 80 }), "image")
assert.equal(kindOf({ name: "hareket.gif", type: "image/gif", size: 80 }), "image")
assert.equal(kindOf({ name: "teklif.PDF", type: "application/pdf", size: 400 }), "pdf")
assert.equal(kindOf({ name: "teklif.pdf", type: "", size: 400 }), "pdf")
assert.match(kindOf({ name: "not.txt", type: "text/plain", size: 20 }), /Yalnızca görsel/)
assert.match(kindOf({ name: "logo.svg", type: "image/svg+xml", size: 20 }), /Yalnızca görsel/)
assert.match(kindOf({ name: "sahte.pdf", type: "image/png", size: 20 }), /türü uyuşmuyor/)
assert.match(kindOf({ name: "buyuk.png", type: "image/png", size: 4 * 1024 * 1024 + 1 }), /4 MB/)
assert.match(kindOf({ name: "bos.jpg", type: "image/jpeg", size: 0 }), /boş/)

const image = classifyAttachment({ name: "a.jpg", type: "image/jpeg", size: 10 })
assert.equal(typeof image === "string", false)
if (typeof image !== "string") assert.equal(image.type, "image/jpeg")

assert.equal(
  isChatAttachment({ id: "1", name: "a.pdf", type: "application/pdf", size: 10, kind: "pdf" }),
  true,
)
assert.equal(
  isChatAttachment({ id: "1", name: "a.pdf", type: "text/html", size: 10, kind: "pdf" }),
  false,
)
assert.equal(isChatAttachment({ id: "", name: "a.png", type: "image/png", size: 10, kind: "image" }), false)

console.log("mesaj ekleri beklenen türleri kabul etti")
