import { fold, slugifyKey } from "@/lib/format"
import { seedSectors, setSectorTree } from "@/lib/sectors"
import type { BookingKind, Business, OrgKind, ProviderKind, Sector } from "@/lib/types"

/**
 * Sector taxonomy: a multi-level tree whose roots are the code-seeded sectors. The server keeps
 * only the differences (edits of seeds, custom nodes, redirects, log) under `taxonomy:v1`; the
 * tree is rebuilt from seeds + state so existing sector ids and business links never change.
 */

export const taxonomyKey = "taxonomy:v1"
export const SECTOR_IMAGE_LIMIT = 120_000
const LOG_CAP = 300
const NODE_CAP = 1500

export type NodeStatus = "aktif" | "pasif"

export type TaxonomyNode = Sector & {
  parentId: string | null
  status: NodeStatus
  order: number
  seoTitle: string
  seoDescription: string
  aliases: string[]
  seed: boolean
  updatedAt: string
}

export type NodePatch = Partial<
  Pick<
    TaxonomyNode,
    "label" | "blurb" | "photo" | "tint" | "icon" | "booking" | "phrases" | "parentId" | "status" | "order" | "seoTitle" | "seoDescription" | "aliases"
  >
> & { updatedAt?: string }

export type AuditEntry = { at: string; by: string; action: string; nodeId: string; detail: string }

export type TaxonomyState = {
  version: 1
  overrides: Record<string, NodePatch>
  nodes: TaxonomyNode[]
  remap: Record<string, string>
  log: AuditEntry[]
}

export const orgKinds: { id: OrgKind; label: string; hint: string }[] = [
  { id: "ozel", label: "Özel", hint: "Devlete bağlı olmayan işletme, şirket veya kişi" },
  { id: "kamu", label: "Kamu", hint: "Bakanlık, belediye, kamu hastanesi ve bağlı kuruluşlar" },
]

export const providerKinds: { id: ProviderKind; label: string; hint: string }[] = [
  { id: "isletme", label: "İşletme / şirket", hint: "Mağaza, restoran, acente, klinik, ajans" },
  { id: "kurum", label: "Kamu kurumu", hint: "Belediye, bakanlık birimi, kamu hastanesi" },
  { id: "usta", label: "Bağımsız usta", hint: "Kendi adına çalışan tesisatçı, elektrikçi, boyacı" },
  { id: "ulasim", label: "Bireysel ulaşım", hint: "Taksici, bağımsız sürücü, transfer" },
  { id: "icerik", label: "İçerik üreticisi", hint: "Influencer, YouTuber, yayıncı, podcast" },
  { id: "serbest", label: "Serbest profesyonel", hint: "Tasarımcı, yazılımcı, fotoğrafçı, danışman" },
  { id: "diger", label: "Diğer bağımsız", hint: "Yukarıdakilere girmeyen bağımsız hizmet sunucuları" },
]

export function isOrgKind(value: unknown): value is OrgKind {
  return value === "kamu" || value === "ozel"
}

export function isProviderKind(value: unknown): value is ProviderKind {
  return providerKinds.some((item) => item.id === value)
}

export function orgKindLabel(kind: OrgKind | undefined) {
  return orgKinds.find((item) => item.id === (kind ?? "ozel"))?.label ?? "Özel"
}

export function providerKindLabel(kind: ProviderKind | undefined) {
  return providerKinds.find((item) => item.id === (kind ?? "isletme"))?.label ?? "İşletme / şirket"
}

// Starter sub-sectors. Labels mirror the free-text `subcategory` values already in the catalog
// so existing businesses attach to them without any data change (see businessInNode).
const seedChildren: [parent: string, label: string, phrases?: string[]][] = [
  ["yeme", "Restoran", ["lokanta"]],
  ["yeme", "Kafe", ["kahve", "cafe"]],
  ["yeme", "Kahvaltı", ["brunch", "kahvalti & kafe"]],
  ["yeme", "Meyhane"],
  ["yeme", "Balık restoranı", ["balik"]],
  ["yeme", "Hızlı yemek", ["fast food", "doner", "burger"]],
  ["yeme", "Ev yemeği"],
  ["yeme", "Izgara", ["kebap", "mangal"]],
  ["yeme", "Fırın & kahve", ["firin", "pastane", "simit"]],
  ["konaklama", "Otel"],
  ["konaklama", "Butik otel"],
  ["konaklama", "Pansiyon"],
  ["konaklama", "Konak", ["butik konak"]],
  ["konaklama", "Suit & apart", ["suit", "apart", "sahil suit"]],
  ["guzellik", "Kuaför", ["sac", "fon"]],
  ["guzellik", "Berber", ["sakal", "tras"]],
  ["guzellik", "Spa", ["masaj"]],
  ["guzellik", "Cilt bakımı", ["cilt", "kozmetik"]],
  ["guzellik", "Manikür & pedikür", ["manikur", "pedikur", "tirnak"]],
  ["ev", "Boya ustası", ["boyaci", "badana"]],
  ["ev", "Mutfak dolabı", ["dolap", "mutfak"]],
  ["ev", "Tadilat", ["dekorasyon", "yenileme"]],
  ["ev", "Parke & zemin", ["parke", "laminat", "zemin"]],
  ["temizlik", "Ev temizliği"],
  ["temizlik", "Ofis temizliği"],
  ["temizlik", "Halı yıkama", ["hali", "koltuk yikama"]],
  ["temizlik", "Dış cephe", ["cam temizligi"]],
  ["usta", "Tesisatçı", ["tesisat", "su kacagi", "petek"]],
  ["usta", "Elektrikçi", ["elektrik", "sigorta kutusu", "priz"]],
  ["usta", "Klima servisi", ["klima", "klima bakim"]],
  ["usta", "Kapı ve kilit", ["cilingir", "kilit", "celik kapi"]],
  ["usta", "Elektronik", ["televizyon tamiri", "elektronik tamir"]],
  ["usta", "Beyaz eşya servisi", ["beyaz esya", "camasir makinesi", "buzdolabi"]],
  ["saglik", "Diş kliniği", ["dis", "dis hekimi", "dis sagligi"]],
  ["saglik", "Fizyoterapi", ["fizik tedavi", "fizyoterapist"]],
  ["saglik", "Göz kliniği", ["goz", "goz doktoru"]],
  ["saglik", "Klinik", ["poliklinik", "muayenehane"]],
  ["b2b", "Toptan", ["toptanci"]],
  ["b2b", "Ambalaj", ["koli", "paketleme"]],
  ["b2b", "Lojistik", ["sehirler arasi tasima", "nakliyat"]],
  ["b2b", "Ofis sarf malzemesi", ["sarf malzeme"]],
  ["b2b", "Endüstriyel kimya", ["kimya"]],
  ["dekor", "Mobilya", ["koltuk", "yatak"]],
  ["dekor", "İç mimarlık", ["ic mimar", "ic mimari"]],
  ["dekor", "Peyzaj", ["bahce", "bahce duzenleme"]],
  ["oto", "Oto servis", ["oto tamir", "periyodik bakim"]],
  ["oto", "Lastik", ["lastikci", "jant"]],
  ["oto", "Kaporta", ["boya kaporta"]],
  ["oto", "Galeri", ["ikinci el arac", "oto galeri"]],
  ["oto", "Oto yıkama", ["yikama", "detayli temizlik"]],
  ["alisveris", "Market", ["supermarket", "bakkal"]],
  ["alisveris", "Giyim", ["butik", "tekstil magaza"]],
  ["alisveris", "Elektronik mağaza", ["elektronik", "teknoloji magazasi"]],
  ["alisveris", "Ayakkabı", ["ayakkabici", "canta"]],
  ["egitim", "Dil kursu", ["ingilizce", "almanca"]],
  ["egitim", "Sürücü kursu", ["ehliyet", "surucu"]],
  ["egitim", "Etüt", ["etut merkezi", "dershane"]],
  ["egitim", "Özel ders", ["ozel ders", "ogretmen"]],
  ["spor", "Fitness", ["spor salonu", "gym"]],
  ["spor", "Pilates", ["reformer"]],
  ["spor", "Yoga"],
  ["spor", "Yüzme", ["yuzme havuzu", "yuzme kursu"]],
  ["eglence", "Sinema"],
  ["eglence", "Canlı müzik", ["konser", "sahne"]],
  ["eglence", "Tiyatro"],
  ["emlak", "Emlak ofisi", ["emlakci"]],
  ["emlak", "Kiralık", ["kiralik daire", "kiralik ofis"]],
  ["emlak", "Satılık", ["satilik daire", "satilik arsa"]],
  ["hukuk", "Avukatlık", ["avukat", "hukuk burosu"]],
  ["hukuk", "Arabuluculuk", ["arabulucu"]],
  ["finans", "Sigorta", ["sigorta acentesi", "kasko", "police"]],
  ["finans", "Muhasebe", ["mali musavir", "muhasebeci"]],
  ["finans", "Banka", ["banka subesi"]],
  ["ulasim", "Taksi", ["taksici", "taksi duragi"]],
  ["ulasim", "Nakliye", ["evden eve", "nakliyat"]],
  ["ulasim", "Kurye", ["moto kurye"]],
  ["ulasim", "Transfer", ["havalimani transfer", "vip transfer"]],
  ["hayvan", "Veteriner", ["veteriner klinigi"]],
  ["hayvan", "Pet shop", ["mama", "pet magaza"]],
  ["hayvan", "Pet kuaför", ["kopek kuaforu", "pet bakim"]],
  ["dugun", "Düğün salonu", ["dugun", "nikah salonu"]],
  ["dugun", "Fotoğrafçı", ["dugun fotografcisi", "fotograf"]],
  ["dugun", "Organizasyon", ["kina", "nisan"]],
  ["teknoloji", "Yazılım", ["yazilim sirketi", "uygulama"]],
  ["teknoloji", "Web tasarım", ["web sitesi", "web ajans"]],
  ["teknoloji", "Bilgisayar servisi", ["bilgisayar tamiri", "laptop"]],
  ["cocuk", "Kreş", ["kres"]],
  ["cocuk", "Anaokulu"],
  ["cocuk", "Oyun alanı", ["oyun parki", "cocuk etkinligi"]],
  ["tarim", "Sera", ["fide", "sera uretim"]],
  ["tarim", "Fidan", ["fidanlik"]],
  ["tarim", "Çiftlik", ["ciftlik", "hayvancilik"]],
  ["insaat", "Müteahhit", ["muteahhitlik", "kat karsiligi"]],
  ["insaat", "Yapı malzemesi", ["yapi market", "insaat malzemesi"]],
  ["medya", "Reklam ajansı", ["ajans", "reklam"]],
  ["medya", "Sosyal medya", ["sosyal medya yonetimi", "icerik"]],
  ["medya", "Baskı", ["dijital baski", "afis"]],
  ["enerji", "Kombi & doğalgaz", ["kombi", "dogalgaz", "kombi servisi"]],
  ["enerji", "Güneş enerjisi", ["gunes paneli", "solar"]],
  ["enerji", "Kalorifer", ["petek", "kalorifer tesisati"]],
]

export function childNodeId(parentId: string, label: string) {
  return `${parentId}-${slugifyKey(label)}`
}

function seedTree(): TaxonomyNode[] {
  const roots: TaxonomyNode[] = seedSectors.map((sector, index) => ({
    ...sector,
    parentId: null,
    status: "aktif",
    order: index,
    seoTitle: "",
    seoDescription: "",
    aliases: [],
    seed: true,
    updatedAt: "",
  }))
  const byId = new Map(roots.map((item) => [item.id, item]))
  const children: TaxonomyNode[] = []
  const orders = new Map<string, number>()
  for (const [parentId, label, extra = []] of seedChildren) {
    const parent = byId.get(parentId)
    if (!parent) continue
    const order = orders.get(parentId) ?? 0
    orders.set(parentId, order + 1)
    children.push({
      id: childNodeId(parentId, label),
      label,
      blurb: parent.label,
      photo: parent.photo,
      tint: parent.tint,
      icon: parent.icon,
      booking: parent.booking,
      phrases: [...new Set([fold(label), ...extra.map((item) => fold(item))])].filter(Boolean),
      parentId,
      status: "aktif",
      order,
      seoTitle: "",
      seoDescription: "",
      aliases: [],
      seed: true,
      updatedAt: "",
    })
  }
  return [...roots, ...children]
}

let seedCache: TaxonomyNode[] | null = null

export function seedTaxonomy() {
  if (!seedCache) seedCache = seedTree()
  return seedCache
}

export function emptyTaxonomyState(): TaxonomyState {
  return { version: 1, overrides: {}, nodes: [], remap: {}, log: [] }
}

function clip(value: unknown, max: number) {
  if (typeof value !== "string") return ""
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
}

export function storedSectorImage(value: unknown) {
  if (typeof value !== "string") return ""
  const image = value.trim()
  if (!image || image.length > SECTOR_IMAGE_LIMIT) return ""
  if (image.startsWith("/") && !image.startsWith("//") && !image.includes("..") && !image.includes("\\") && image.length <= 120) return image
  if (/^https:\/\/\S+$/i.test(image) && image.length <= 200) return image
  if (/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/]+={0,2}$/i.test(image)) return image
  return ""
}

function readPhrases(value: unknown) {
  if (!Array.isArray(value)) return undefined
  return [...new Set(value.map((item) => fold(String(item))).filter((item) => item && item.length <= 40))].slice(0, 40)
}

function readAliases(value: unknown) {
  if (!Array.isArray(value)) return undefined
  return [...new Set(value.map((item) => slugifyKey(String(item))).filter((item) => item && item !== "sektor"))].slice(0, 12)
}

/** Sanitizes a patch coming from the admin UI or storage; unknown or malformed fields are dropped. */
export function readNodePatch(raw: unknown): NodePatch {
  if (!raw || typeof raw !== "object") return {}
  const row = raw as Record<string, unknown>
  const patch: NodePatch = {}
  if (typeof row.label === "string" && clip(row.label, 60).length >= 2) patch.label = clip(row.label, 60)
  if (typeof row.blurb === "string") patch.blurb = clip(row.blurb, 120)
  if (typeof row.photo === "string") {
    const photo = storedSectorImage(row.photo)
    if (photo) patch.photo = photo
  }
  if (typeof row.tint === "string" && /^#[0-9a-f]{6}$/i.test(row.tint)) patch.tint = row.tint.toLowerCase()
  if (typeof row.icon === "string" && /^[a-z0-9-]{1,24}$/.test(row.icon)) patch.icon = row.icon
  if (row.booking === "randevu" || row.booking === "rezervasyon" || row.booking === "teklif") patch.booking = row.booking as BookingKind
  const phrases = readPhrases(row.phrases)
  if (phrases) patch.phrases = phrases
  if (row.parentId === null) patch.parentId = null
  else if (typeof row.parentId === "string" && /^[a-z0-9-]{1,80}$/.test(row.parentId)) patch.parentId = row.parentId
  if (row.status === "aktif" || row.status === "pasif") patch.status = row.status
  if (typeof row.order === "number" && Number.isFinite(row.order)) patch.order = Math.max(0, Math.min(9999, Math.round(row.order)))
  if (typeof row.seoTitle === "string") patch.seoTitle = clip(row.seoTitle, 70)
  if (typeof row.seoDescription === "string") patch.seoDescription = clip(row.seoDescription, 170)
  const aliases = readAliases(row.aliases)
  if (aliases) patch.aliases = aliases
  if (typeof row.updatedAt === "string") patch.updatedAt = row.updatedAt.slice(0, 32)
  return patch
}

function readCustomNode(raw: unknown): TaxonomyNode | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as Record<string, unknown>
  if (typeof row.id !== "string" || !/^[a-z0-9-]{1,80}$/.test(row.id)) return null
  const patch = readNodePatch(row)
  if (!patch.label) return null
  return {
    id: row.id,
    label: patch.label,
    blurb: patch.blurb ?? "",
    photo: patch.photo ?? "/photos/office.jpg",
    tint: patch.tint ?? "#243044",
    icon: patch.icon ?? "building",
    booking: patch.booking ?? "teklif",
    phrases: patch.phrases?.length ? patch.phrases : [fold(patch.label)],
    custom: true,
    parentId: patch.parentId ?? null,
    status: patch.status ?? "aktif",
    order: patch.order ?? 0,
    seoTitle: patch.seoTitle ?? "",
    seoDescription: patch.seoDescription ?? "",
    aliases: patch.aliases ?? [],
    seed: false,
    updatedAt: patch.updatedAt ?? "",
  }
}

function readLog(value: unknown): AuditEntry[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .filter((item) => typeof item.at === "string" && typeof item.action === "string")
    .slice(0, LOG_CAP)
    .map((item) => ({
      at: String(item.at).slice(0, 32),
      by: clip(item.by, 40),
      action: clip(item.action, 24),
      nodeId: clip(item.nodeId, 80),
      detail: clip(item.detail, 200),
    }))
}

export function parseTaxonomyState(raw: string | null): TaxonomyState | null {
  if (raw === null) return emptyTaxonomyState()
  try {
    const data = JSON.parse(raw) as Partial<TaxonomyState>
    if (!data || typeof data !== "object" || Array.isArray(data)) return null
    const overrides: Record<string, NodePatch> = {}
    if (data.overrides && typeof data.overrides === "object" && !Array.isArray(data.overrides)) {
      for (const [id, patch] of Object.entries(data.overrides)) {
        if (/^[a-z0-9-]{1,80}$/.test(id)) overrides[id] = readNodePatch(patch)
      }
    }
    const nodes = Array.isArray(data.nodes)
      ? data.nodes.map(readCustomNode).filter((item): item is TaxonomyNode => item !== null).slice(0, NODE_CAP)
      : []
    const remap: Record<string, string> = {}
    if (data.remap && typeof data.remap === "object" && !Array.isArray(data.remap)) {
      for (const [from, to] of Object.entries(data.remap)) {
        if (typeof to === "string" && /^[a-z0-9-]{1,80}$/.test(from) && /^[a-z0-9-]{1,80}$/.test(to) && from !== to) remap[from] = to
      }
    }
    return { version: 1, overrides, nodes, remap, log: readLog(data.log) }
  } catch {
    return null
  }
}

function wouldCycle(byId: Map<string, TaxonomyNode>, id: string, parentId: string | null) {
  let cursor = parentId
  let guard = 0
  while (cursor && guard < 64) {
    if (cursor === id) return true
    cursor = byId.get(cursor)?.parentId ?? null
    guard += 1
  }
  return guard >= 64
}

/** Seeds + state → full tree. Missing parents become roots; cycles are cut at the offending node. */
export function buildTaxonomy(state: TaxonomyState | null | undefined): TaxonomyNode[] {
  const current = state ?? emptyTaxonomyState()
  const seeds = seedTaxonomy()
  const seedIds = new Set(seeds.map((item) => item.id))
  const merged: TaxonomyNode[] = seeds.map((node) => {
    const patch = current.overrides[node.id]
    if (!patch) return node
    const { updatedAt, ...rest } = patch
    const next: TaxonomyNode = { ...node, ...rest, updatedAt: updatedAt ?? node.updatedAt }
    if (!next.phrases.length) next.phrases = [fold(next.label)]
    return next
  })
  for (const node of current.nodes) {
    if (seedIds.has(node.id)) continue
    merged.push(node)
  }
  const byId = new Map(merged.map((item) => [item.id, item]))
  for (const node of merged) {
    if (node.parentId && (!byId.has(node.parentId) || wouldCycle(byId, node.id, node.parentId))) {
      byId.set(node.id, { ...node, parentId: null })
    }
  }
  return [...byId.values()]
}

type Index = {
  byId: Map<string, TaxonomyNode>
  children: Map<string | null, TaxonomyNode[]>
  aliasOf: Map<string, string>
}

const indexCache = new WeakMap<TaxonomyNode[], Index>()

function indexOf(nodes: TaxonomyNode[]): Index {
  const cached = indexCache.get(nodes)
  if (cached) return cached
  const byId = new Map<string, TaxonomyNode>()
  const children = new Map<string | null, TaxonomyNode[]>()
  const aliasOf = new Map<string, string>()
  for (const node of nodes) {
    byId.set(node.id, node)
    const list = children.get(node.parentId) ?? []
    list.push(node)
    children.set(node.parentId, list)
    for (const alias of node.aliases) if (!byId.has(alias)) aliasOf.set(alias, node.id)
  }
  for (const list of children.values()) list.sort((a, b) => a.order - b.order || collator.compare(a.label, b.label))
  const index = { byId, children, aliasOf }
  indexCache.set(nodes, index)
  return index
}

export const collator = new Intl.Collator("tr", { sensitivity: "base", numeric: true })

export function nodeById(nodes: TaxonomyNode[], id: string) {
  return indexOf(nodes).byId.get(id) ?? null
}

export function childrenOf(nodes: TaxonomyNode[], id: string | null) {
  return indexOf(nodes).children.get(id) ?? []
}

export function rootsOf(nodes: TaxonomyNode[]) {
  return childrenOf(nodes, null)
}

export function pathOf(nodes: TaxonomyNode[], id: string): TaxonomyNode[] {
  const { byId } = indexOf(nodes)
  const path: TaxonomyNode[] = []
  let cursor = byId.get(id) ?? null
  let guard = 0
  while (cursor && guard < 64) {
    path.unshift(cursor)
    cursor = cursor.parentId ? byId.get(cursor.parentId) ?? null : null
    guard += 1
  }
  return path
}

export function rootOf(nodes: TaxonomyNode[], id: string) {
  return pathOf(nodes, id)[0] ?? null
}

export function depthOf(nodes: TaxonomyNode[], id: string) {
  return Math.max(0, pathOf(nodes, id).length - 1)
}

/** The node and every node below it, breadth-first. */
export function subtreeOf(nodes: TaxonomyNode[], id: string): TaxonomyNode[] {
  const start = nodeById(nodes, id)
  if (!start) return []
  const out: TaxonomyNode[] = []
  const queue = [start]
  while (queue.length && out.length < NODE_CAP + seedTaxonomy().length) {
    const current = queue.shift() as TaxonomyNode
    out.push(current)
    queue.push(...childrenOf(nodes, current.id))
  }
  return out
}

export function isActive(nodes: TaxonomyNode[], id: string) {
  const path = pathOf(nodes, id)
  return path.length > 0 && path.every((item) => item.status === "aktif")
}

/** Nodes shown to visitors: active and with every ancestor active. */
export function activeNodes(nodes: TaxonomyNode[]) {
  return nodes.filter((item) => isActive(nodes, item.id))
}

export function resolveNodeId(nodes: TaxonomyNode[], remap: Record<string, string>, id: string): string | null {
  const index = indexOf(nodes)
  if (index.byId.has(id)) return id
  const alias = index.aliasOf.get(id)
  if (alias) return alias
  const moved = remap[id]
  if (moved && index.byId.has(moved)) return moved
  return null
}

export function sortTr<T extends { label: string }>(list: T[]) {
  return [...list].sort((a, b) => collator.compare(a.label, b.label))
}

export const TR_LETTERS = ["A", "B", "C", "Ç", "D", "E", "F", "G", "Ğ", "H", "I", "İ", "J", "K", "L", "M", "N", "O", "Ö", "P", "R", "S", "Ş", "T", "U", "Ü", "V", "Y", "Z"]

export function letterOf(label: string) {
  const first = label.trim().charAt(0).toLocaleUpperCase("tr-TR")
  return TR_LETTERS.includes(first) ? first : "#"
}

export function letterGroups<T extends { label: string }>(list: T[]) {
  const groups = new Map<string, T[]>()
  for (const item of sortTr(list)) {
    const letter = letterOf(item.label)
    groups.set(letter, [...(groups.get(letter) ?? []), item])
  }
  const order = [...TR_LETTERS, "#"]
  return [...groups.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])).map(([letter, items]) => ({ letter, items }))
}

export function businessCategoryIds(business: Pick<Business, "category" | "categories">) {
  return [...new Set([business.category, ...(business.categories ?? [])].filter(Boolean))]
}

/**
 * A business belongs to a node when one of its category ids is the node or lies below it, or —
 * for sub-sectors — when its free-text `subcategory` equals the node label under the same root.
 */
export function businessInNode(nodes: TaxonomyNode[], business: Pick<Business, "category" | "categories" | "subcategory">, nodeId: string) {
  const node = nodeById(nodes, nodeId)
  if (!node) return businessCategoryIds(business).includes(nodeId)
  const ids = businessCategoryIds(business)
  const below = new Set(subtreeOf(nodes, nodeId).map((item) => item.id))
  if (ids.some((id) => below.has(id))) return true
  if (!node.parentId) return false
  const root = rootOf(nodes, nodeId)
  if (!root || !ids.includes(root.id)) return false
  return fold(business.subcategory) === fold(node.label)
}

/** Resolves the sub-sector a business sits in (explicit id first, then the subcategory bridge). */
export function businessLeaf(nodes: TaxonomyNode[], business: Pick<Business, "category" | "categories" | "subcategory"> & Partial<Business>) {
  const ids = businessCategoryIds(business)
  for (const id of ids) {
    const node = nodeById(nodes, id)
    if (node?.parentId) return node
  }
  const needle = fold(business.subcategory)
  if (!needle) return null
  for (const id of ids) {
    const hit = subtreeOf(nodes, id).find((item) => item.parentId && fold(item.label) === needle)
    if (hit) return hit
  }
  return null
}

export function applyRemap<T extends Pick<Business, "category" | "categories">>(business: T, remap: Record<string, string>): T {
  const category = remap[business.category]
  const categories = business.categories?.map((id) => remap[id] ?? id)
  if (!category && !categories?.some((id, index) => id !== business.categories?.[index])) return business
  return { ...business, category: category ?? business.category, categories: categories ? [...new Set(categories)] : business.categories }
}

/** Loose label key: folded, "&"/"ve"/"and" and punctuation dropped, no spaces. */
export function labelKey(value: string) {
  return fold(value.replace(/&/g, " "))
    .replace(/\b(ve|and|ile)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "")
}

/** Finds a node for free text: id, alias, label, or a "root > child" / "root / child" path. */
export function matchNodeByText(nodes: TaxonomyNode[], text: string): TaxonomyNode | null {
  const raw = text.trim()
  if (!raw) return null
  const parts = raw.split(/\s*[>/»]\s*/).filter(Boolean)
  if (parts.length > 1) {
    const parent = matchNodeByText(nodes, parts.slice(0, -1).join(" > "))
    if (!parent) return null
    const leaf = labelKey(parts[parts.length - 1])
    return childrenOf(nodes, parent.id).find((item) => labelKey(item.label) === leaf) ?? null
  }
  const key = labelKey(raw)
  if (!key) return null
  const index = indexOf(nodes)
  const direct = index.byId.get(raw.toLowerCase()) ?? index.byId.get(slugifyKey(raw))
  if (direct) return direct
  const alias = index.aliasOf.get(slugifyKey(raw))
  if (alias) return index.byId.get(alias) ?? null
  const roots = rootsOf(nodes).find((item) => labelKey(item.label) === key)
  if (roots) return roots
  const hits = nodes.filter((item) => item.parentId && labelKey(item.label) === key)
  return hits.length === 1 ? hits[0] : null
}

export type NodeDependencies = { children: number; businesses: number; listings: number }

export function nodeDependencies(nodes: TaxonomyNode[], id: string, businesses: Pick<Business, "category" | "categories" | "subcategory" | "source">[]): NodeDependencies {
  const below = subtreeOf(nodes, id)
  const ids = new Set(below.map((item) => item.id))
  const hit = businesses.filter((item) => businessCategoryIds(item).some((cid) => ids.has(cid)))
  return {
    children: Math.max(0, below.length - 1),
    businesses: hit.length,
    listings: hit.filter((item) => item.source === "senin").length,
  }
}

export type TaxonomyOp =
  | { op: "upsert"; id?: string; node: unknown }
  | { op: "durum"; id: string; status: NodeStatus }
  | { op: "sira"; ids: string[] }
  | { op: "sil"; id: string; mode: "sil" | "pasif" | "aktar"; targetId?: string }

export type OpResult =
  | { ok: true; state: TaxonomyState; nodes: TaxonomyNode[]; id: string; moved?: { from: string[]; to: string } }
  | { ok: false; reason: "invalid" | "yok" | "dongu" | "seed" | "bagli" | "hedef"; deps?: NodeDependencies }

function logged(state: TaxonomyState, entry: AuditEntry): TaxonomyState {
  return { ...state, log: [entry, ...state.log].slice(0, LOG_CAP) }
}

function uniqueNodeId(label: string, parentId: string | null, taken: Set<string>) {
  const base = parentId ? childNodeId(parentId, label) : slugifyKey(label)
  if (!taken.has(base)) return base
  let index = 2
  while (taken.has(`${base}-${index}`)) index += 1
  return `${base}-${index}`
}

/** Pure reducer behind the admin API. `businesses` lets delete decisions see the real links. */
export function applyTaxonomyOp(
  state: TaxonomyState,
  op: TaxonomyOp,
  context: { now: number; by: string; businesses: Pick<Business, "category" | "categories" | "subcategory" | "source">[] },
): OpResult {
  const at = new Date(context.now).toISOString()
  const nodes = buildTaxonomy(state)
  const byId = new Map(nodes.map((item) => [item.id, item]))

  if (op.op === "upsert") {
    const patch = readNodePatch(op.node)
    const id = typeof op.id === "string" && /^[a-z0-9-]{1,80}$/.test(op.id) ? op.id : ""
    const existing = id ? byId.get(id) : undefined
    if (!existing && !patch.label) return { ok: false, reason: "invalid" }
    const parentId = patch.parentId === undefined ? existing?.parentId ?? null : patch.parentId
    if (parentId && !byId.has(parentId)) return { ok: false, reason: "yok" }
    if (existing && parentId && (parentId === existing.id || wouldCycle(byId, existing.id, parentId))) return { ok: false, reason: "dongu" }
    if (existing) {
      const { updatedAt: _ignored, ...fields } = patch
      void _ignored
      if (existing.seed) {
        const previous = state.overrides[existing.id] ?? {}
        const next: TaxonomyState = {
          ...state,
          overrides: { ...state.overrides, [existing.id]: { ...previous, ...fields, updatedAt: at } },
        }
        return finish(next, "duzenle", existing.id, `${existing.label}: ${Object.keys(fields).join(", ")}`)
      }
      const next: TaxonomyState = {
        ...state,
        nodes: state.nodes.map((item) => (item.id === existing.id ? { ...item, ...fields, updatedAt: at } : item)),
      }
      return finish(next, "duzenle", existing.id, `${existing.label}: ${Object.keys(fields).join(", ")}`)
    }
    if (state.nodes.length >= NODE_CAP) return { ok: false, reason: "invalid" }
    const label = patch.label as string
    const parent = parentId ? byId.get(parentId) : undefined
    const newId = uniqueNodeId(label, parentId, new Set(byId.keys()))
    const siblings = childrenOf(nodes, parentId)
    const node: TaxonomyNode = {
      id: newId,
      label,
      blurb: patch.blurb ?? parent?.label ?? "Özel sektör",
      photo: patch.photo ?? parent?.photo ?? "/photos/office.jpg",
      tint: patch.tint ?? parent?.tint ?? "#243044",
      icon: patch.icon ?? parent?.icon ?? "building",
      booking: patch.booking ?? parent?.booking ?? "teklif",
      phrases: patch.phrases?.length ? patch.phrases : [fold(label)],
      custom: true,
      parentId,
      status: patch.status ?? "aktif",
      order: patch.order ?? (siblings.length ? Math.max(...siblings.map((item) => item.order)) + 1 : 0),
      seoTitle: patch.seoTitle ?? "",
      seoDescription: patch.seoDescription ?? "",
      aliases: patch.aliases ?? [],
      seed: false,
      updatedAt: at,
    }
    return finish({ ...state, nodes: [...state.nodes, node] }, "ekle", newId, `${label}${parent ? ` → ${parent.label}` : ""}`)
  }

  if (op.op === "durum") {
    const node = byId.get(op.id)
    if (!node) return { ok: false, reason: "yok" }
    if (op.status !== "aktif" && op.status !== "pasif") return { ok: false, reason: "invalid" }
    return finish(setFields(state, node, { status: op.status }, at), op.status === "pasif" ? "pasife-al" : "aktif-et", node.id, node.label)
  }

  if (op.op === "sira") {
    if (!Array.isArray(op.ids) || !op.ids.length || op.ids.length > 400) return { ok: false, reason: "invalid" }
    let next = state
    const first = byId.get(op.ids[0])
    if (!first) return { ok: false, reason: "yok" }
    op.ids.forEach((id, order) => {
      const node = byId.get(id)
      if (node && node.parentId === first.parentId) next = setFields(next, node, { order }, at)
    })
    return finish(next, "sirala", first.parentId ?? "kok", `${op.ids.length} kayıt`)
  }

  if (op.op === "sil") {
    const node = byId.get(op.id)
    if (!node) return { ok: false, reason: "yok" }
    const deps = nodeDependencies(nodes, node.id, context.businesses)
    if (op.mode === "pasif") {
      return finish(setFields(state, node, { status: "pasif" }, at), "pasife-al", node.id, `${node.label} (${deps.businesses} işletme, ${deps.children} alt)`)
    }
    if (op.mode === "sil") {
      if (node.seed) return { ok: false, reason: "seed", deps }
      if (deps.children || deps.businesses) return { ok: false, reason: "bagli", deps }
      const next: TaxonomyState = { ...state, nodes: state.nodes.filter((item) => item.id !== node.id) }
      return finish(next, "sil", node.id, node.label)
    }
    if (op.mode === "aktar") {
      const target = op.targetId ? byId.get(op.targetId) : undefined
      if (!target) return { ok: false, reason: "hedef", deps }
      const below = subtreeOf(nodes, node.id)
      if (below.some((item) => item.id === target.id)) return { ok: false, reason: "dongu", deps }
      const remap = { ...state.remap }
      for (const item of below) remap[item.id] = target.id
      for (const [from, to] of Object.entries(remap)) if (below.some((item) => item.id === to)) remap[from] = target.id
      let next: TaxonomyState = { ...state, remap }
      if (node.seed) {
        next = setFields(next, node, { status: "pasif" }, at)
      } else {
        const gone = new Set(below.filter((item) => !item.seed).map((item) => item.id))
        next = { ...next, nodes: next.nodes.filter((item) => !gone.has(item.id)) }
        for (const item of below.filter((item) => item.seed)) next = setFields(next, item, { status: "pasif" }, at)
      }
      const result = finish(next, "aktar", node.id, `${node.label} → ${target.label} (${deps.businesses} işletme)`)
      if (!result.ok) return result
      return { ...result, moved: { from: below.map((item) => item.id), to: target.id } }
    }
    return { ok: false, reason: "invalid" }
  }

  return { ok: false, reason: "invalid" }

  function finish(next: TaxonomyState, action: string, nodeId: string, detail: string): OpResult {
    const stamped = logged(next, { at, by: context.by, action, nodeId, detail })
    return { ok: true, state: stamped, nodes: buildTaxonomy(stamped), id: nodeId }
  }
}

function setFields(state: TaxonomyState, node: TaxonomyNode, fields: NodePatch, at: string): TaxonomyState {
  if (node.seed) {
    const previous = state.overrides[node.id] ?? {}
    return { ...state, overrides: { ...state.overrides, [node.id]: { ...previous, ...fields, updatedAt: at } } }
  }
  return { ...state, nodes: state.nodes.map((item) => (item.id === node.id ? { ...item, ...fields, updatedAt: at } : item)) }
}

export type MigrationReport = {
  total: number
  nodes: number
  roots: number
  custom: number
  passive: number
  unknownCategory: { id: string; count: number }[]
  unmatchedSub: { category: string; subcategory: string; count: number }[]
  kamuPending: number
  multi: number
  perRoot: { id: string; label: string; count: number; direct: number }[]
}

/** Health check for the migration: what in the business data does not line up with the tree. */
export function migrationReport(
  nodes: TaxonomyNode[],
  businesses: (Pick<Business, "category" | "categories" | "subcategory" | "orgKind" | "orgVerified"> & Partial<Business>)[],
): MigrationReport {
  const byId = new Map(nodes.map((item) => [item.id, item]))
  const unknown = new Map<string, number>()
  const unmatched = new Map<string, { category: string; subcategory: string; count: number }>()
  let kamuPending = 0
  let multi = 0
  for (const business of businesses) {
    const ids = businessCategoryIds(business)
    if (ids.length > 1) multi += 1
    if (business.orgKind === "kamu" && !business.orgVerified) kamuPending += 1
    for (const id of ids) if (!byId.has(id)) unknown.set(id, (unknown.get(id) ?? 0) + 1)
    const root = byId.get(business.category)
    if (!root) continue
    const sub = business.subcategory.trim()
    if (!sub || fold(sub) === fold(root.label)) continue
    if (businessLeaf(nodes, business)) continue
    const key = `${root.id}|${fold(sub)}`
    const row = unmatched.get(key) ?? { category: root.id, subcategory: sub, count: 0 }
    row.count += 1
    unmatched.set(key, row)
  }
  const roots = rootsOf(nodes)
  return {
    total: businesses.length,
    nodes: nodes.length,
    roots: roots.length,
    custom: nodes.filter((item) => !item.seed).length,
    passive: nodes.filter((item) => item.status === "pasif").length,
    unknownCategory: [...unknown.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count),
    unmatchedSub: [...unmatched.values()].sort((a, b) => b.count - a.count).slice(0, 60),
    kamuPending,
    multi,
    perRoot: roots
      .map((root) => ({
        id: root.id,
        label: root.label,
        count: businesses.filter((item) => businessInNode(nodes, item, root.id)).length,
        direct: businesses.filter((item) => item.category === root.id).length,
      }))
      .sort((a, b) => b.count - a.count),
  }
}

/** Fields visitors receive; admin-only bookkeeping stays on the server. */
export function publicNode(node: TaxonomyNode) {
  const { updatedAt: _updatedAt, ...rest } = node
  void _updatedAt
  return rest
}

export function readPublicNodes(value: unknown): TaxonomyNode[] | null {
  if (!Array.isArray(value)) return null
  const nodes = value
    .map((item): TaxonomyNode | null => {
      if (!item || typeof item !== "object") return null
      const row = item as Record<string, unknown>
      const node = readCustomNode({ ...row, status: row.status === "pasif" ? "pasif" : "aktif" })
      if (!node) return null
      return { ...node, custom: row.custom === true, seed: row.seed !== false }
    })
    .filter((item): item is TaxonomyNode => item !== null)
  return nodes.length ? nodes : null
}

let live: TaxonomyNode[] | null = null

/** Installs the tree every module reads (`allSectors`, search filters, labels). */
export function setLiveTaxonomy(nodes: TaxonomyNode[] | null) {
  live = nodes && nodes.length ? nodes : seedTaxonomy()
  setSectorTree(activeNodes(live))
}

export function liveTaxonomy() {
  if (!live) setLiveTaxonomy(null)
  return live as TaxonomyNode[]
}

/** Tree-aware replacement for `business.category === id`. */
export function inSector(business: Pick<Business, "category" | "categories" | "subcategory">, id: string) {
  return businessInNode(liveTaxonomy(), business, id)
}
