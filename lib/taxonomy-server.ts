import { accountStore } from "@/lib/account-kv"
import { activeNodes, buildTaxonomy, emptyTaxonomyState, parseTaxonomyState, pathOf, resolveNodeId, taxonomyKey, type TaxonomyNode } from "@/lib/taxonomy"

/** Active sector tree for server rendering (sitemap, metadata); seeds when no store is reachable. */
export async function publishedTaxonomy(): Promise<{ nodes: TaxonomyNode[]; remap: Record<string, string> }> {
  try {
    const store = await accountStore()
    const state = store ? parseTaxonomyState(await store.get(taxonomyKey)) ?? emptyTaxonomyState() : emptyTaxonomyState()
    return { nodes: activeNodes(buildTaxonomy(state)), remap: state.remap }
  } catch {
    return { nodes: activeNodes(buildTaxonomy(emptyTaxonomyState())), remap: {} }
  }
}

export function sectorSearchPath(id: string) {
  return `/ara?kategori=${encodeURIComponent(id)}`
}

/** Title, description and canonical for /ara?kategori=…; null when the id resolves to nothing. */
export function sectorMetadata(tree: { nodes: TaxonomyNode[]; remap: Record<string, string> }, id: string) {
  const resolved = resolveNodeId(tree.nodes, tree.remap, id)
  if (!resolved) return null
  const path = pathOf(tree.nodes, resolved)
  const node = path[path.length - 1]
  if (!node) return null
  const trail = path.map((item) => item.label).join(" › ")
  return {
    id: resolved,
    title: node.seoTitle || `${trail} işletmeleri`,
    description: node.seoDescription || `${trail}: ${node.blurb || node.label}. Puan, yorum, fiyat aralığı ve açık saatlerle karşılaştır.`,
    canonical: sectorSearchPath(resolved),
  }
}
