"use client"

import { X } from "lucide-react"
import { useState } from "react"
import { fieldClass } from "@/components/directory/bits"
import { Label } from "@/components/ui/label"
import {
  activeNodes,
  childrenOf,
  defaultProviderKind,
  nodeById,
  orgKinds,
  pathOf,
  providerKinds,
  providerKindsFor,
  rootsOf,
  sortTr,
  type TaxonomyNode,
} from "@/lib/taxonomy"
import type { CategoryId, OrgKind, ProviderKind } from "@/lib/types"

export type Classification = {
  category: CategoryId
  /** Extra nodes (sub-sectors or other roots) the record also belongs to. */
  categories: CategoryId[]
  orgKind: OrgKind
  providerKind: ProviderKind
  orgVerified: boolean
}

export const defaultClassification: Classification = {
  category: "yeme",
  categories: [],
  orgKind: "ozel",
  providerKind: "isletme",
  orgVerified: false,
}

/** Label such as "Usta ve tamir › Tesisatçı" for any node. */
export function nodePathLabel(nodes: TaxonomyNode[], id: string) {
  const path = pathOf(nodes, id)
  return path.length ? path.map((item) => item.label).join(" › ") : id
}

/** The primary sub-sector (first extra id that sits under the main sector), used for `subcategory`. */
export function primarySubLabel(nodes: TaxonomyNode[], value: Pick<Classification, "category" | "categories">) {
  for (const id of value.categories) {
    const node = nodeById(nodes, id)
    if (node?.parentId && pathOf(nodes, id)[0]?.id === value.category) return node.label
  }
  return ""
}

export function ClassificationFields({
  value,
  onChange,
  nodes,
  admin = false,
  idPrefix = "cls",
}: {
  value: Classification
  onChange: (next: Classification) => void
  nodes: TaxonomyNode[]
  admin?: boolean
  idPrefix?: string
}) {
  const visible = admin ? nodes : activeNodes(nodes)
  const roots = sortTr(rootsOf(visible))
  const children = sortTr(childrenOf(visible, value.category))
  const sub = value.categories.find((id) => nodeById(visible, id)?.parentId === value.category) ?? ""
  const extras = value.categories.filter((id) => id !== sub)
  const [extraPick, setExtraPick] = useState("")

  function setRoot(category: CategoryId) {
    onChange({ ...value, category, categories: extras.filter((id) => id !== category) })
  }

  function setSub(id: string) {
    const rest = value.categories.filter((item) => item !== sub)
    onChange({ ...value, categories: id ? [id, ...rest] : rest })
  }

  function addExtra(id: string) {
    setExtraPick("")
    if (!id || id === value.category || value.categories.includes(id)) return
    if (value.categories.length >= 5) return
    onChange({ ...value, categories: [...value.categories, id] })
  }

  const extraOptions = visible.filter((item) => item.id !== value.category && !value.categories.includes(item.id))
  const grouped = roots.map((root) => ({
    root,
    items: sortTr(extraOptions.filter((item) => item.id !== root.id && pathOf(visible, item.id)[0]?.id === root.id)),
    self: extraOptions.some((item) => item.id === root.id),
  }))

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-category`}>Sektör</Label>
          <select
            id={`${idPrefix}-category`}
            className={fieldClass}
            value={value.category}
            onChange={(event) => setRoot(event.target.value)}
          >
            {roots.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
                {item.status === "pasif" ? " (pasif)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-sub`}>Alt sektör</Label>
          <select
            id={`${idPrefix}-sub`}
            className={fieldClass}
            value={sub}
            onChange={(event) => setSub(event.target.value)}
            disabled={!children.length}
          >
            <option value="">{children.length ? "Seçilmedi" : "Bu sektörde alt sektör yok"}</option>
            {children.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
                {item.status === "pasif" ? " (pasif)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-extra`}>Ek sektörler</Label>
        {extras.length ? (
          <div className="flex flex-wrap gap-1.5">
            {extras.map((id) => (
              <span key={id} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs">
                {nodePathLabel(visible, id)}
                <button
                  type="button"
                  aria-label={`${nodePathLabel(visible, id)} kaldır`}
                  onClick={() => onChange({ ...value, categories: value.categories.filter((item) => item !== id) })}
                  className="grid size-4 place-items-center rounded-full hover:bg-foreground/10"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <select
          id={`${idPrefix}-extra`}
          className={fieldClass}
          value={extraPick}
          onChange={(event) => addExtra(event.target.value)}
          disabled={value.categories.length >= 5}
        >
          <option value="">{value.categories.length >= 5 ? "En fazla beş ek sektör" : "Başka bir sektör ekle"}</option>
          {grouped.map(({ root, items, self }) =>
            self || items.length ? (
              <optgroup key={root.id} label={root.label}>
                {self ? <option value={root.id}>{root.label} (genel)</option> : null}
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {nodePathLabel(visible, item.id).replace(`${root.label} › `, "")}
                  </option>
                ))}
              </optgroup>
            ) : null,
          )}
        </select>
        <p className="text-xs leading-5 text-muted-foreground">Kayıt birden fazla sektörde aranabilir; aramada hepsinde çıkar.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <fieldset className="grid gap-1.5">
          <legend className="text-sm font-medium">Kuruluş türü</legend>
          <div className="flex flex-wrap gap-2">
            {orgKinds.map((kind) => (
              <label
                key={kind.id}
                className={
                  value.orgKind === kind.id
                    ? "flex-1 cursor-pointer rounded-xl bg-primary px-3 py-2 text-center text-sm text-primary-foreground"
                    : "flex-1 cursor-pointer rounded-xl bg-secondary px-3 py-2 text-center text-sm"
                }
                title={kind.hint}
              >
                <input
                  type="radio"
                  name={`${idPrefix}-org`}
                  value={kind.id}
                  checked={value.orgKind === kind.id}
                  onChange={() => {
                    const fits = providerKindsFor(kind.id).some((item) => item.id === value.providerKind)
                    onChange({
                      ...value,
                      orgKind: kind.id,
                      providerKind: fits ? value.providerKind : defaultProviderKind(kind.id),
                      orgVerified: kind.id === "kamu" ? value.orgVerified : false,
                    })
                  }}
                  className="sr-only"
                />
                {kind.label}
              </label>
            ))}
          </div>
          <p className="text-xs leading-5 text-muted-foreground">{orgKinds.find((kind) => kind.id === value.orgKind)?.hint}</p>
          {value.orgKind === "kamu" ? (
            admin ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={value.orgVerified}
                  onChange={(event) => onChange({ ...value, orgVerified: event.target.checked })}
                />
                Kamu kurumu doğrulandı
              </label>
            ) : (
              <p className="text-xs leading-5 text-muted-foreground">Kamu beyanı yönetici doğrulamasından sonra rozet olarak görünür.</p>
            )
          ) : null}
        </fieldset>
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-provider`}>Profil türü</Label>
          <select
            id={`${idPrefix}-provider`}
            className={fieldClass}
            value={value.providerKind}
            onChange={(event) => onChange({ ...value, providerKind: event.target.value as ProviderKind })}
          >
            {orgKinds.map((org) => (
              <optgroup key={org.id} label={org.label}>
                {providerKindsFor(org.id).map((kind) => (
                  <option key={kind.id} value={kind.id} title={kind.hint}>
                    {kind.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="text-xs leading-5 text-muted-foreground">
            {providerKinds.find((kind) => kind.id === value.providerKind)?.hint}
          </p>
        </div>
      </div>
    </>
  )
}
