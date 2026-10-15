export const sheetRowCap = 1000
export const sheetByteCap = 1_200_000

export type SheetGrid = {
  headers: string[]
  rows: { line: number; cells: string[] }[]
  overflow: number
}

function u16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8)
}

function u32(bytes: Uint8Array, offset: number) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0
}

function decodeXml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
}

async function inflateRaw(data: Uint8Array) {
  const stream = new DecompressionStream("deflate-raw")
  const writer = stream.writable.getWriter()
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  await writer.write(copy)
  await writer.close()
  return new Uint8Array(await new Response(stream.readable).arrayBuffer())
}

async function unzip(bytes: Uint8Array) {
  let end = -1
  const start = Math.max(0, bytes.length - 66_000)
  for (let index = bytes.length - 22; index >= start; index -= 1) {
    if (u32(bytes, index) === 0x06054b50) {
      end = index
      break
    }
  }
  if (end < 0) return null
  const count = u16(bytes, end + 10)
  let cursor = u32(bytes, end + 16)
  if (count > 40 || cursor >= bytes.length) return null
  const entries: { name: string; data: Uint8Array }[] = []
  let total = 0
  for (let index = 0; index < count; index += 1) {
    if (u32(bytes, cursor) !== 0x02014b50) return null
    const method = u16(bytes, cursor + 10)
    const compressed = u32(bytes, cursor + 20)
    const nameLength = u16(bytes, cursor + 28)
    const extraLength = u16(bytes, cursor + 30)
    const commentLength = u16(bytes, cursor + 32)
    const local = u32(bytes, cursor + 42)
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength))
    cursor += 46 + nameLength + extraLength + commentLength
    if (local + 30 > bytes.length) return null
    const localName = u16(bytes, local + 26)
    const localExtra = u16(bytes, local + 28)
    const dataStart = local + 30 + localName + localExtra
    const dataEnd = dataStart + compressed
    if (dataEnd > bytes.length) return null
    const packed = bytes.subarray(dataStart, dataEnd)
    let data: Uint8Array
    if (method === 0) data = packed
    else if (method === 8) {
      if (compressed > 4_000_000) return null
      data = await inflateRaw(packed)
    } else return null
    total += data.length
    if (data.length > 4_000_000 || total > 8_000_000) return null
    entries.push({ name, data })
  }
  return entries
}

function textOf(entry: { data: Uint8Array } | undefined) {
  return entry ? new TextDecoder().decode(entry.data) : ""
}

function sharedStrings(xml: string) {
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((item) =>
    [...item[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => decodeXml(part[1])).join(""),
  )
}

function columnIndex(cell: string) {
  const letters = cell.replace(/\d/g, "")
  let index = 0
  for (const char of letters) index = index * 26 + (char.charCodeAt(0) - 64)
  return Math.max(0, index - 1)
}

function sheetRows(xml: string, strings: string[]) {
  const rows: { line: number; cells: string[] }[] = []
  let fallback = 0
  for (const row of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    fallback += 1
    const marker = row[1].match(/\br="(\d+)"/)
    const line = marker ? Number(marker[1]) : fallback
    const cells: string[] = []
    for (const cell of row[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = cell[1].match(/\br="([A-Z]+)\d+"/i)?.[1] ?? ""
      const kind = cell[1].match(/\bt="([^"]+)"/)?.[1] ?? ""
      const body = cell[2] ?? ""
      const index = ref ? columnIndex(ref) : cells.length
      let value = ""
      if (kind === "s") {
        const pointer = Number(body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "")
        value = strings[pointer] ?? ""
      } else if (kind === "inlineStr") {
        value = [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => decodeXml(part[1])).join("")
      } else if (body.includes("<v>")) {
        value = decodeXml(body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "")
      }
      cells[index] = value.trim()
    }
    if (cells.some((cell) => cell && cell.trim())) rows.push({ line, cells: cells.map((cell) => cell ?? "") })
  }
  return rows
}

function asGrid(table: { line: number; cells: string[] }[]): SheetGrid | { error: "bos" } {
  if (!table.length) return { error: "bos" }
  const header = table[0]
  const rows: SheetGrid["rows"] = []
  let overflow = 0
  for (const row of table.slice(1)) {
    if (!row.cells.some((cell) => cell.trim())) continue
    if (rows.length >= sheetRowCap) {
      overflow += 1
      continue
    }
    rows.push(row)
  }
  return { headers: header.cells.map((cell) => cell.trim()), rows, overflow }
}

export function readCsvGrid(text: string): SheetGrid | { error: "bos" } {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines = clean.split("\n")
  const first = lines.findIndex((line) => line.trim())
  if (first < 0) return { error: "bos" }
  const headerLine = lines[first] ?? ""
  const delimiter = [";", ",", "\t"]
    .map((mark) => ({ mark, count: headerLine.split(mark).length }))
    .sort((left, right) => right.count - left.count)[0]?.mark ?? ";"
  const table: { line: number; cells: string[] }[] = []
  for (let index = first; index < lines.length; index += 1) {
    if (!lines[index]?.trim()) continue
    table.push({ line: index + 1, cells: splitLine(lines[index] ?? "", delimiter) })
  }
  return asGrid(table)
}

function splitLine(line: string, delimiter: string) {
  const cells: string[] = []
  let current = ""
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"'
        index += 1
        continue
      }
      quoted = !quoted
      continue
    }
    if (char === delimiter && !quoted) {
      cells.push(current.trim())
      current = ""
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

export async function readXlsxGrid(bytes: Uint8Array): Promise<SheetGrid | { error: "bozuk" }> {
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) return { error: "bozuk" }
  const entries = await unzip(bytes)
  if (!entries) return { error: "bozuk" }
  const named = (suffix: string) => entries.find((entry) => entry.name === suffix || entry.name.endsWith(`/${suffix}`))
  const workbook = textOf(named("xl/workbook.xml"))
  const rels = textOf(named("xl/_rels/workbook.xml.rels"))
  const relation = workbook.match(/<sheet\b[^>]*r:id="([^"]+)"/)?.[1] ?? ""
  const target = relation ? rels.match(new RegExp(`Id="${relation}"[^>]*Target="([^"]+)"`))?.[1] ?? "" : ""
  const sheetPath = target ? target.replace(/^\//, "").replace(/^xl\//, "xl/") : "xl/worksheets/sheet1.xml"
  const sheet = named(sheetPath.startsWith("xl/") ? sheetPath : `xl/${sheetPath}`) ?? entries.find((entry) => entry.name.includes("worksheets/sheet"))
  if (!sheet) return { error: "bozuk" }
  const strings = sharedStrings(textOf(named("xl/sharedStrings.xml")))
  const grid = asGrid(sheetRows(textOf(sheet), strings))
  if ("error" in grid) return { error: "bozuk" }
  return grid
}

export function bytesFromBase64(value: string) {
  if (!value || value.length > Math.ceil(sheetByteCap / 3) * 4 + 8) return null
  try {
    const binary = atob(value)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
    if (bytes.length > sheetByteCap) return null
    return bytes
  } catch {
    return null
  }
}
