"use client"

import { ChevronDown, ChevronRight, ChevronUp, ImagePlus, Plus, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { CategoryGlyph, Cover, fieldClass } from "@/components/directory/bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { installTaxonomy, useDirectory } from "@/lib/directory-context"
import { fold } from "@/lib/format"
import { scaleCoverFile } from "@/lib/image-scale"
import { sectorIcons, sectorPhotos, sectorTints } from "@/lib/sectors"
import {
  SECTOR_IMAGE_LIMIT,
  TR_LETTERS,
  childrenOf,
  letterOf,
  nodeDependencies,
  pathOf,
  readPublicNodes,
  rootsOf,
  sortTr,
  subtreeOf,
  type AuditEntry,
  type MigrationReport,
  type NodeStatus,
  type TaxonomyNode,
} from "@/lib/taxonomy"
import type { BookingKind } from "@/lib/types"

type AdminPayload = {
  ok?: boolean
  admin?: boolean
  nodes?: unknown
  remap?: Record<string, string>
  log?: AuditEntry[]
  report?: MigrationReport
  counts?: Record<string, number>
  reason?: string
  deps?: { children: number; businesses: number; listings: number }
  moved?: number
}

type Draft = {
  id: string
  label: string
  parentId: string
  blurb: string
  phrases: string
  booking: BookingKind
  icon: string
  tint: string
  photo: string
  seoTitle: string
  seoDescription: string
  aliases: string
  status: NodeStatus
}

const ACTION_LABEL: Record<string, string> = {
  ekle: "Eklendi",
  duzenle: "Düzenlendi",
  "pasife-al": "Pasife alındı",
  "aktif-et": "Aktif edildi",
  sirala: "Sıralandı",
  sil: "Silindi",
  aktar: "Aktarıldı",
}

function readRemap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {}
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, to]) => typeof to === "string")) as Record<string, string>
}

async function postSektor(body: Record<string, unknown>) {
  const response = await fetch("/api/sektor", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = (await response.json().catch(() => null)) as AdminPayload | null
  return { response, data }
}

function reasonText(reason: string | undefined, deps?: AdminPayload["deps"]) {
  if (reason === "bagli") return `Silinemez: ${deps?.children ?? 0} alt sektör ve ${deps?.businesses ?? 0} işletme bağlı. Pasife al ya da başka sektöre aktar.`
  if (reason === "seed") return "Çekirdek sektörler silinmez; pasife alınır ya da aktarılır."
  if (reason === "dongu") return "Bir sektör kendi altına taşınamaz."
  if (reason === "yok") return "Sektör bulunamadı."
  if (reason === "hedef") return "Aktarılacak hedef sektörü seç."
  if (reason === "yetki") return "Yönetici oturumu kapalı. Yeniden giriş yap."
  if (reason === "limited") return "Çok fazla işlem. Bir süre sonra tekrar dene."
  return "İşlem kaydedilemedi."
}

function emptyDraft(parentId = ""): Draft {
  return {
    id: "",
    label: "",
    parentId,
    blurb: "",
    phrases: "",
    booking: "teklif",
    icon: sectorIcons[0] ?? "building",
    tint: sectorTints[0] ?? "#243044",
    photo: "",
    seoTitle: "",
    seoDescription: "",
    aliases: "",
    status: "aktif",
  }
}

function draftOf(node: TaxonomyNode): Draft {
  return {
    id: node.id,
    label: node.label,
    parentId: node.parentId ?? "",
    blurb: node.blurb,
    phrases: node.phrases.join(", "),
    booking: node.booking,
    icon: node.icon,
    tint: node.tint,
    photo: node.photo,
    seoTitle: node.seoTitle,
    seoDescription: node.seoDescription,
    aliases: node.aliases.join(", "),
    status: node.status,
  }
}

export function SectorAdmin() {
  const { taxonomy, remap, managedBusinesses, legacySectors, forgetLegacySectors } = useDirectory()
  const [log, setLog] = useState<AuditEntry[]>([])
  const [report, setReport] = useState<MigrationReport | null>(null)
  const [serverCounts, setServerCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState("")
  const [query, setQuery] = useState("")
  const [letter, setLetter] = useState("")
  const [level, setLevel] = useState<"" | "ana" | "alt">("")
  const [status, setStatus] = useState<"" | NodeStatus>("")
  const [sortMode, setSortMode] = useState<"az" | "sira">("az")
  const [openRoots, setOpenRoots] = useState<Set<string>>(new Set())
  const [draft, setDraft] = useState<Draft | null>(null)
  const [removing, setRemoving] = useState<TaxonomyNode | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [showLog, setShowLog] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetch("/api/sektor", { credentials: "include" })
      .then((response) => (response.ok ? (response.json() as Promise<AdminPayload>) : null))
      .then((data) => {
        if (cancelled || !data) return
        if (data.admin) {
          installTaxonomy(readPublicNodes(data.nodes), readRemap(data.remap))
          setLog(data.log ?? [])
          setReport(data.report ?? null)
          setServerCounts(data.counts ?? {})
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const node of taxonomy) {
      const ids = new Set(subtreeOf(taxonomy, node.id).map((item) => item.id))
      const local = managedBusinesses.filter((item) => item.category && (ids.has(item.category) || item.categories?.some((id) => ids.has(id)))).length
      map[node.id] = Math.max(local, serverCounts[node.id] ?? 0)
    }
    return map
  }, [taxonomy, managedBusinesses, serverCounts])

  const roots = useMemo(() => {
    const list = rootsOf(taxonomy)
    return sortMode === "az" ? sortTr(list) : [...list].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "tr"))
  }, [taxonomy, sortMode])

  const needle = fold(query)
  function matches(node: TaxonomyNode) {
    if (status && node.status !== status) return false
    if (needle && !fold(`${node.label} ${node.blurb} ${node.id} ${node.phrases.join(" ")} ${node.aliases.join(" ")}`).includes(needle)) return false
    return true
  }

  const rows = roots
    .map((root) => {
      const children = childrenOf(taxonomy, root.id)
      const ordered = sortMode === "az" ? sortTr(children) : [...children].sort((a, b) => a.order - b.order)
      const visibleChildren = level === "ana" ? [] : ordered.filter((child) => matches(child) && (!letter || letterOf(child.label) === letter || letterOf(root.label) === letter))
      const rootHit = level !== "alt" && matches(root) && (!letter || letterOf(root.label) === letter)
      if (!rootHit && !visibleChildren.length) return null
      return { root, children: visibleChildren, rootHit, total: children.length }
    })
    .filter((row): row is { root: TaxonomyNode; children: TaxonomyNode[]; rootHit: boolean; total: number } => row !== null)

  const filtering = Boolean(needle || letter || level === "alt" || status)
  const letters = new Set(taxonomy.map((item) => letterOf(item.label)))

  function applyResult(data: AdminPayload | null) {
    if (!data?.ok) return
    const nodes = readPublicNodes(data.nodes)
    if (nodes) installTaxonomy(nodes, data.remap ? readRemap(data.remap) : remap)
    if (data.log) setLog(data.log)
    if (data.report) setReport(data.report)
  }

  async function run(body: Record<string, unknown>, success?: string) {
    setNotice("")
    const { response, data } = await postSektor(body)
    if (!response.ok || !data?.ok) {
      setNotice(reasonText(data?.reason, data?.deps))
      return false
    }
    applyResult(data)
    if (success) setNotice(success)
    return true
  }

  async function move(node: TaxonomyNode, delta: number) {
    const siblings = [...childrenOf(taxonomy, node.parentId)].sort((a, b) => a.order - b.order)
    const index = siblings.findIndex((item) => item.id === node.id)
    const target = index + delta
    if (index < 0 || target < 0 || target >= siblings.length) return
    const next = [...siblings]
    ;[next[index], next[target]] = [next[target], next[index]]
    await run({ op: "sira", ids: next.map((item) => item.id) })
  }

  function toggleRoot(id: string) {
    setOpenRoots((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="mt-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-heading text-2xl">Sektör ağacı</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {roots.length} ana sektör, {taxonomy.length - roots.length} alt sektör
            {report ? ` · ${report.passive} pasif · ${report.custom} özel` : ""}
            {loading ? " · sunucudan okunuyor" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setShowReport((value) => !value)}>
            Geçiş raporu
          </Button>
          <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setShowLog((value) => !value)}>
            Geçmiş ({log.length})
          </Button>
          <Button type="button" className="h-11 rounded-xl" onClick={() => setDraft(emptyDraft())}>
            <Plus className="size-4" />
            Ana sektör ekle
          </Button>
        </div>
      </div>

      {legacySectors.length ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary/10 px-4 py-3 text-sm">
          <p>
            Bu tarayıcıda eski akıştan kalan {legacySectors.length} yerel sektör var: {legacySectors.map((item) => item.label).join(", ")}.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              className="h-9 rounded-xl"
              onClick={() => {
                void run({ op: "yerel-aktar", sectors: legacySectors }, "Yerel sektörler sunucuya taşındı.").then((ok) => {
                  if (ok) forgetLegacySectors()
                })
              }}
            >
              Sunucuya taşı
            </Button>
            <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={forgetLegacySectors}>
              Sil
            </Button>
          </div>
        </div>
      ) : null}

      {notice ? <p className="mt-4 rounded-2xl bg-secondary px-4 py-2 text-sm">{notice}</p> : null}

      {showReport && report ? <ReportPanel report={report} nodes={taxonomy} /> : null}
      {showLog ? <LogPanel log={log} nodes={taxonomy} /> : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sektör, alt sektör, sözcük ara" className="h-11" />
        <select aria-label="Seviye" className={fieldClass} value={level} onChange={(event) => setLevel(event.target.value as typeof level)}>
          <option value="">Ana ve alt</option>
          <option value="ana">Yalnız ana</option>
          <option value="alt">Yalnız alt</option>
        </select>
        <select aria-label="Durum" className={fieldClass} value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
          <option value="">Aktif ve pasif</option>
          <option value="aktif">Aktif</option>
          <option value="pasif">Pasif</option>
        </select>
        <select aria-label="Sıralama" className={fieldClass} value={sortMode} onChange={(event) => setSortMode(event.target.value as typeof sortMode)}>
          <option value="az">A–Z (Türkçe)</option>
          <option value="sira">El sırası</option>
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-1" role="group" aria-label="Harfe göre süz">
        <button
          type="button"
          onClick={() => setLetter("")}
          className={letter === "" ? "rounded-lg bg-primary px-2.5 py-1 text-xs text-primary-foreground" : "rounded-lg bg-secondary px-2.5 py-1 text-xs"}
        >
          Tümü
        </button>
        {TR_LETTERS.map((item) => (
          <button
            key={item}
            type="button"
            disabled={!letters.has(item)}
            onClick={() => setLetter(item === letter ? "" : item)}
            className={
              letter === item
                ? "rounded-lg bg-primary px-2.5 py-1 text-xs text-primary-foreground"
                : "rounded-lg bg-secondary px-2.5 py-1 text-xs disabled:opacity-30"
            }
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-2">
        {rows.map(({ root, children, total }) => {
          const open = filtering || openRoots.has(root.id)
          return (
            <article key={root.id} className="rounded-3xl bg-card ring-1 ring-foreground/10">
              <NodeRow
                node={root}
                count={counts[root.id] ?? 0}
                childCount={total}
                open={open}
                sortable={sortMode === "sira"}
                onToggle={() => toggleRoot(root.id)}
                onEdit={() => setDraft(draftOf(root))}
                onAddChild={() => setDraft(emptyDraft(root.id))}
                onStatus={() => void run({ op: "durum", id: root.id, status: root.status === "aktif" ? "pasif" : "aktif" })}
                onRemove={() => setRemoving(root)}
                onMove={(delta) => void move(root, delta)}
              />
              {open && children.length ? (
                <div className="grid gap-1 border-t border-foreground/10 px-3 py-2">
                  {children.map((child) => (
                    <NodeRow
                      key={child.id}
                      node={child}
                      count={counts[child.id] ?? 0}
                      childCount={childrenOf(taxonomy, child.id).length}
                      sortable={sortMode === "sira"}
                      nested
                      onEdit={() => setDraft(draftOf(child))}
                      onAddChild={() => setDraft(emptyDraft(child.id))}
                      onStatus={() => void run({ op: "durum", id: child.id, status: child.status === "aktif" ? "pasif" : "aktif" })}
                      onRemove={() => setRemoving(child)}
                      onMove={(delta) => void move(child, delta)}
                    />
                  ))}
                </div>
              ) : null}
            </article>
          )
        })}
        {!rows.length ? <p className="text-sm text-muted-foreground">Bu süzgeçte sektör yok.</p> : null}
      </div>

      {draft ? (
        <NodeDialog
          key={draft.id || `new:${draft.parentId}`}
          draft={draft}
          nodes={taxonomy}
          onClose={() => setDraft(null)}
          onSave={async (next) => {
            const node = {
              label: next.label.trim(),
              parentId: next.parentId || null,
              blurb: next.blurb.trim(),
              phrases: next.phrases.split(/[,;\n]/).map((item) => fold(item)).filter(Boolean),
              booking: next.booking,
              icon: next.icon,
              tint: next.tint,
              photo: next.photo || undefined,
              seoTitle: next.seoTitle.trim(),
              seoDescription: next.seoDescription.trim(),
              aliases: next.aliases.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean),
              status: next.status,
            }
            const ok = await run({ op: "upsert", id: next.id || undefined, node }, next.id ? "Sektör güncellendi." : "Sektör eklendi.")
            if (ok) {
              const parentId = node.parentId
              if (parentId) setOpenRoots((current) => new Set(current).add(pathOf(taxonomy, parentId)[0]?.id ?? parentId))
              setDraft(null)
            }
            return ok
          }}
        />
      ) : null}

      {removing ? (
        <RemoveDialog
          node={removing}
          nodes={taxonomy}
          deps={nodeDependencies(taxonomy, removing.id, managedBusinesses)}
          onClose={() => setRemoving(null)}
          onConfirm={async (mode, targetId) => {
            const ok = await run(
              { op: "sil", id: removing.id, mode, targetId },
              mode === "sil" ? "Sektör silindi." : mode === "pasif" ? "Sektör pasife alındı." : "Sektör aktarıldı; bağlı işletmeler hedefe taşındı.",
            )
            if (ok) setRemoving(null)
            return ok
          }}
        />
      ) : null}
    </div>
  )
}

function NodeRow({
  node,
  count,
  childCount,
  open,
  nested = false,
  sortable,
  onToggle,
  onEdit,
  onAddChild,
  onStatus,
  onRemove,
  onMove,
}: {
  node: TaxonomyNode
  count: number
  childCount: number
  open?: boolean
  nested?: boolean
  sortable: boolean
  onToggle?: () => void
  onEdit: () => void
  onAddChild: () => void
  onStatus: () => void
  onRemove: () => void
  onMove: (delta: number) => void
}) {
  const passive = node.status === "pasif"
  return (
    <div className={nested ? "flex flex-wrap items-center gap-3 rounded-2xl px-2 py-2 hover:bg-secondary/60" : "flex flex-wrap items-center gap-3 px-4 py-3"}>
      {onToggle ? (
        <button type="button" onClick={onToggle} aria-label={open ? "Alt sektörleri gizle" : "Alt sektörleri göster"} className="grid size-8 place-items-center rounded-full bg-secondary">
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
      ) : (
        <span className="w-8" />
      )}
      <div className={nested ? "relative size-9 shrink-0 overflow-hidden rounded-xl" : "relative size-12 shrink-0 overflow-hidden rounded-2xl"} style={{ background: node.tint }}>
        <Cover src={node.photo} alt="" className="absolute inset-0 size-full" />
        <span className="absolute inset-0 grid place-items-center text-white drop-shadow">
          <CategoryGlyph icon={node.icon} className={nested ? "size-3.5" : "size-4"} />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className={nested ? "text-sm font-medium" : "font-medium"}>
          {node.label}
          {passive ? <span className="ms-2 rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-normal">pasif</span> : null}
          {!node.seed ? <span className="ms-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-normal text-primary">özel</span> : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          /ara?kategori={node.id} · {count} işletme
          {childCount ? ` · ${childCount} alt` : ""}
          {node.blurb ? ` · ${node.blurb}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sortable ? (
          <>
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg px-2" aria-label="Yukarı" onClick={() => onMove(-1)}>
              <ChevronUp className="size-3.5" />
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg px-2" aria-label="Aşağı" onClick={() => onMove(1)}>
              <ChevronDown className="size-3.5" />
            </Button>
          </>
        ) : null}
        <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" onClick={onEdit}>
          Düzenle
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" onClick={onAddChild}>
          Alt ekle
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" onClick={onStatus}>
          {passive ? "Aktif et" : "Pasife al"}
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" onClick={onRemove}>
          Sil
        </Button>
      </div>
    </div>
  )
}

function NodeDialog({
  draft,
  nodes,
  onClose,
  onSave,
}: {
  draft: Draft
  nodes: TaxonomyNode[]
  onClose: () => void
  onSave: (draft: Draft) => Promise<boolean>
}) {
  const [value, setValue] = useState(draft)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const editing = Boolean(draft.id)
  const below = editing ? new Set(subtreeOf(nodes, draft.id).map((item) => item.id)) : new Set<string>()
  const parentOptions = sortTr(nodes.filter((item) => !below.has(item.id)).map((item) => ({ ...item, label: pathOf(nodes, item.id).map((part) => part.label).join(" › ") })))
  const parent = value.parentId ? nodes.find((item) => item.id === value.parentId) : null
  const photoPreview = value.photo || parent?.photo || sectorPhotos[0]

  function set<K extends keyof Draft>(key: K, next: Draft[K]) {
    setValue((current) => ({ ...current, [key]: next }))
  }

  async function pickFile(file: File | undefined) {
    if (!file) return
    setError("")
    try {
      const scaled = await scaleCoverFile(file)
      if (scaled.dataUrl.length > SECTOR_IMAGE_LIMIT) {
        setError("Görsel küçültülemedi; daha küçük bir dosya seç.")
        return
      }
      set("photo", scaled.dataUrl)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Görsel okunamadı.")
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">{editing ? `${draft.label} sektörünü düzenle` : value.parentId ? "Alt sektör ekle" : "Ana sektör ekle"}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (value.label.trim().length < 2) {
              setError("Sektör adı en az iki karakter olmalı.")
              return
            }
            setBusy(true)
            void onSave(value).then((ok) => {
              setBusy(false)
              if (!ok) setError("Kaydedilemedi; üstteki uyarıya bak.")
            })
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="sector-label">Ad</Label>
              <Input id="sector-label" value={value.label} onChange={(event) => set("label", event.target.value)} placeholder="Örn. Bisiklet tamiri" className="h-11" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sector-parent">Üst sektör</Label>
              <select id="sector-parent" className={fieldClass} value={value.parentId} onChange={(event) => set("parentId", event.target.value)}>
                <option value="">— Ana sektör (kök) —</option>
                {parentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {editing ? (
            <p className="text-xs text-muted-foreground">
              Kimlik: <code>{draft.id}</code> · adres /ara?kategori={draft.id} değişmez.
            </p>
          ) : null}
          <div className="grid gap-1.5">
            <Label htmlFor="sector-blurb">Kısa açıklama</Label>
            <Input id="sector-blurb" value={value.blurb} onChange={(event) => set("blurb", event.target.value)} placeholder="Servis, yedek parça, kiralama" className="h-11" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sector-phrases">Arama sözcükleri</Label>
            <Textarea id="sector-phrases" value={value.phrases} onChange={(event) => set("phrases", event.target.value)} placeholder="bisiklet, jant, lastik, tamir" className="min-h-16" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="sector-booking">Varsayılan işlem</Label>
              <select id="sector-booking" className={fieldClass} value={value.booking} onChange={(event) => set("booking", event.target.value as BookingKind)}>
                <option value="teklif">Teklif iste</option>
                <option value="randevu">Randevu al</option>
                <option value="rezervasyon">Rezervasyon</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sector-status">Durum</Label>
              <select id="sector-status" className={fieldClass} value={value.status} onChange={(event) => set("status", event.target.value as NodeStatus)}>
                <option value="aktif">Aktif</option>
                <option value="pasif">Pasif (sitede gizli)</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sector-tint">Renk</Label>
              <div className="flex h-11 items-center gap-2">
                <input id="sector-tint" type="color" value={value.tint} onChange={(event) => set("tint", event.target.value)} className="size-9 cursor-pointer rounded-lg border-0 bg-transparent" />
                <div className="flex flex-wrap gap-1">
                  {sectorTints.slice(0, 8).map((item) => (
                    <button key={item} type="button" aria-label={item} onClick={() => set("tint", item)} className="size-5 rounded-full ring-1 ring-foreground/20" style={{ background: item, outline: value.tint === item ? `2px solid ${item}` : undefined, outlineOffset: 2 }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-1.5">
            <p className="text-sm font-medium">Simge</p>
            <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
              {sectorIcons.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-label={item}
                  onClick={() => set("icon", item)}
                  className={value.icon === item ? "grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground" : "grid size-9 place-items-center rounded-xl bg-secondary"}
                >
                  <CategoryGlyph icon={item} className="size-4" />
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Kapak görseli</p>
            <div className="flex flex-wrap items-start gap-3">
              <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-2xl ring-1 ring-foreground/10">
                <Cover src={photoPreview} alt="" className="absolute inset-0 size-full" />
              </div>
              <div className="grid gap-2 text-sm">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => void pickFile(event.target.files?.[0])} />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => fileRef.current?.click()}>
                    <ImagePlus className="size-4" />
                    Görsel yükle
                  </Button>
                  {value.photo ? (
                    <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => set("photo", "")}>
                      <X className="size-4" />
                      Kaldır
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  Yüklenen görsel 1280×720 çerçeveye otomatik küçültülür ve sıkıştırılır. Boş bırakılırsa üst sektörün görseli kullanılır.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {sectorPhotos.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-label={item}
                  onClick={() => set("photo", item)}
                  className={value.photo === item ? "relative h-10 overflow-hidden rounded-lg ring-2 ring-primary" : "relative h-10 overflow-hidden rounded-lg ring-1 ring-foreground/10"}
                >
                  <Cover src={item} alt="" className="absolute inset-0 size-full" />
                </button>
              ))}
            </div>
          </div>
          <details className="rounded-2xl bg-secondary/60 p-3">
            <summary className="cursor-pointer text-sm font-medium">SEO ve eski adresler</summary>
            <div className="mt-3 grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="sector-seo-title">SEO başlığı</Label>
                <Input id="sector-seo-title" value={value.seoTitle} onChange={(event) => set("seoTitle", event.target.value)} maxLength={70} placeholder={`${value.label || "Sektör"} – pinwego`} className="h-11" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sector-seo-desc">SEO açıklaması</Label>
                <Textarea id="sector-seo-desc" value={value.seoDescription} onChange={(event) => set("seoDescription", event.target.value)} maxLength={170} className="min-h-16" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sector-aliases">Eski kimlikler (yönlendirme)</Label>
                <Input id="sector-aliases" value={value.aliases} onChange={(event) => set("aliases", event.target.value)} placeholder="eski-id, diger-eski-id" className="h-11" />
                <p className="text-xs text-muted-foreground">Bu kimliklerle gelen /ara?kategori= bağlantıları bu sektöre yönlenir.</p>
              </div>
            </div>
          </details>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" className="h-11 flex-1 rounded-xl" disabled={busy}>
              {busy ? "Kaydediliyor" : editing ? "Kaydet" : "Sektörü ekle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RemoveDialog({
  node,
  nodes,
  deps,
  onClose,
  onConfirm,
}: {
  node: TaxonomyNode
  nodes: TaxonomyNode[]
  deps: { children: number; businesses: number; listings: number }
  onClose: () => void
  onConfirm: (mode: "sil" | "pasif" | "aktar", targetId?: string) => Promise<boolean>
}) {
  const canHardDelete = !node.seed && !deps.children && !deps.businesses
  const [mode, setMode] = useState<"sil" | "pasif" | "aktar">(canHardDelete ? "sil" : "pasif")
  const [target, setTarget] = useState("")
  const [busy, setBusy] = useState(false)
  const below = new Set(subtreeOf(nodes, node.id).map((item) => item.id))
  const targets = sortTr(nodes.filter((item) => !below.has(item.id)).map((item) => ({ ...item, label: pathOf(nodes, item.id).map((part) => part.label).join(" › ") })))

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">{node.label} sektörünü kaldır</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-6 text-muted-foreground">
          Bağlılık: {deps.children} alt sektör, {deps.businesses} işletme ({deps.listings} sunucu kaydı).
          {node.seed ? " Çekirdek sektör olduğu için kalıcı silinmez; pasife alınır ya da aktarılır." : ""}
        </p>
        <div className="grid gap-2">
          <label className={mode === "pasif" ? "rounded-2xl bg-primary/10 p-3 text-sm ring-1 ring-primary" : "rounded-2xl p-3 text-sm ring-1 ring-foreground/10"}>
            <input type="radio" name="remove-mode" className="me-2" checked={mode === "pasif"} onChange={() => setMode("pasif")} />
            Pasife al — sitede gizlenir, bağlı kayıtlar ve adres korunur; sonradan geri açılır.
          </label>
          <label className={mode === "aktar" ? "rounded-2xl bg-primary/10 p-3 text-sm ring-1 ring-primary" : "rounded-2xl p-3 text-sm ring-1 ring-foreground/10"}>
            <input type="radio" name="remove-mode" className="me-2" checked={mode === "aktar"} onChange={() => setMode("aktar")} />
            Başka sektöre aktar — bağlı işletmeler hedefe taşınır, eski adres hedefe yönlenir.
            {mode === "aktar" ? (
              <select className={`${fieldClass} mt-2`} value={target} onChange={(event) => setTarget(event.target.value)}>
                <option value="">Hedef sektör seç</option>
                {targets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            ) : null}
          </label>
          <label className={mode === "sil" ? "rounded-2xl bg-primary/10 p-3 text-sm ring-1 ring-primary" : "rounded-2xl p-3 text-sm ring-1 ring-foreground/10 opacity-70"}>
            <input type="radio" name="remove-mode" className="me-2" disabled={!canHardDelete} checked={mode === "sil"} onChange={() => setMode("sil")} />
            Kalıcı sil — yalnızca bağlı kaydı olmayan özel sektörler için.
          </label>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={onClose}>
            Vazgeç
          </Button>
          <Button
            type="button"
            className="h-11 flex-1 rounded-xl"
            disabled={busy || (mode === "aktar" && !target)}
            onClick={() => {
              setBusy(true)
              void onConfirm(mode, mode === "aktar" ? target : undefined).then(() => setBusy(false))
            }}
          >
            {busy ? "Uygulanıyor" : mode === "sil" ? "Kalıcı sil" : mode === "pasif" ? "Pasife al" : "Aktar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ReportPanel({ report, nodes }: { report: MigrationReport; nodes: TaxonomyNode[] }) {
  const label = (id: string) => nodes.find((item) => item.id === id)?.label ?? id
  return (
    <section className="mt-4 grid gap-3 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
      <h3 className="font-heading text-xl">Geçiş raporu</h3>
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <p>{report.total} işletme · {report.multi} çoklu sektör</p>
        <p>{report.nodes} düğüm · {report.roots} ana · {report.custom} özel · {report.passive} pasif</p>
        <p>{report.kamuPending} kamu beyanı doğrulama bekliyor</p>
      </div>
      {report.unknownCategory.length ? (
        <div>
          <p className="text-sm font-medium">Ağaçta olmayan sektör kimlikleri</p>
          <p className="text-xs text-muted-foreground">{report.unknownCategory.map((row) => `${row.id} (${row.count})`).join(", ")}</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Her işletmenin sektörü ağaçta var.</p>
      )}
      {report.unmatchedSub.length ? (
        <div>
          <p className="text-sm font-medium">Alt sektöre bağlanamayan serbest metinler</p>
          <ul className="mt-1 grid gap-0.5 text-xs text-muted-foreground sm:grid-cols-2">
            {report.unmatchedSub.map((row) => (
              <li key={`${row.category}|${row.subcategory}`}>
                {label(row.category)} › {row.subcategory} ({row.count})
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Tüm alt kategori metinleri ağaca bağlı.</p>
      )}
      <div>
        <p className="text-sm font-medium">Ana sektör başına işletme</p>
        <p className="text-xs text-muted-foreground">{report.perRoot.map((row) => `${row.label} ${row.count}`).join(" · ")}</p>
      </div>
    </section>
  )
}

function LogPanel({ log, nodes }: { log: AuditEntry[]; nodes: TaxonomyNode[] }) {
  if (!log.length) return <p className="mt-4 text-sm text-muted-foreground">Henüz sektör işlemi kaydedilmedi.</p>
  return (
    <section className="mt-4 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
      <h3 className="font-heading text-xl">Geçmiş</h3>
      <ul className="mt-2 grid gap-1 text-sm">
        {log.slice(0, 40).map((entry, index) => (
          <li key={`${entry.at}-${index}`} className="flex flex-wrap gap-x-3 text-muted-foreground">
            <span className="tabular-nums">{entry.at.replace("T", " ").slice(0, 16)}</span>
            <span className="text-foreground">{ACTION_LABEL[entry.action] ?? entry.action}</span>
            <span>{nodes.find((item) => item.id === entry.nodeId)?.label ?? entry.nodeId}</span>
            <span className="truncate">{entry.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
