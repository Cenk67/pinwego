import assert from "node:assert/strict"
import { rankSectors } from "./sector-clicks"

const sectors = [
  { id: "yeme" },
  { id: "konaklama" },
  { id: "saglik" },
  { id: "oto" },
]

assert.deepEqual(
  rankSectors(sectors, {}).map((item) => item.id),
  ["yeme", "konaklama", "saglik", "oto"],
)

assert.deepEqual(
  rankSectors(sectors, { oto: 4, saglik: 4, yeme: 1 }).map((item) => item.id),
  ["saglik", "oto", "yeme", "konaklama"],
)

console.log("sektör sıralaması tıklamaya göre")
