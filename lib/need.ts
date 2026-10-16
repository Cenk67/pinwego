import type { CategoryId } from "@/lib/types"

export type NeedHint = {
  category: CategoryId
  focus: string
  phrases: string[]
}

export const needHints: NeedHint[] = [
  {
    category: "enerji",
    focus: "kombi",
    phrases: ["sicak olmuyor", "isinmiyor", "ev soguk", "petek soguk", "kalorifer soguk", "kombi ariza"],
  },
  {
    category: "usta",
    focus: "tesisat",
    phrases: ["su patladi", "su borusu", "su akiyor", "su kacagi", "musluk tikan", "lavabo tikan"],
  },
  {
    category: "teknoloji",
    focus: "web",
    phrases: ["web sitesi yaptir", "internet sitesi yaptir", "site yaptirmak", "e ticaret sitesi"],
  },
  {
    category: "cocuk",
    focus: "cocuk",
    phrases: ["cocuklarla gide", "cocukla gide", "hafta sonu cocuk"],
  },
  {
    category: "finans",
    focus: "sigorta",
    phrases: ["kasko yaptir", "trafik sigortasi", "konut sigortasi", "saglik sigortasi"],
  },
]

const typos: [RegExp, string][] = [
  [/\bsigrota\b/g, "sigorta"],
  [/\btesisart\b/g, "tesisat"],
  [/\bkombii\b/g, "kombi"],
  [/\bweb sitesii\b/g, "web sitesi"],
]

export function correctNeedText(text: string) {
  return typos.reduce((current, [pattern, word]) => current.replace(pattern, word), text)
}

export function matchNeed(text: string) {
  let best: { hint: NeedHint; length: number } | null = null
  for (const hint of needHints) {
    for (const phrase of hint.phrases) {
      if (!text.includes(phrase)) continue
      if (!best || phrase.length > best.length) best = { hint, length: phrase.length }
    }
  }
  return best?.hint ?? null
}
