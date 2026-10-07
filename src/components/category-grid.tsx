import Link from "next/link"
import {
  Briefcase,
  Building2,
  Car,
  Coffee,
  Hammer,
  Hotel,
  Scissors,
  ShoppingBag,
  Stethoscope,
  UtensilsCrossed,
} from "lucide-react"
import { CATEGORIES } from "@/lib/categories"

const ICONS = {
  utensils: UtensilsCrossed,
  coffee: Coffee,
  scissors: Scissors,
  hammer: Hammer,
  stethoscope: Stethoscope,
  building: Building2,
  hotel: Hotel,
  briefcase: Briefcase,
  shopping: ShoppingBag,
  car: Car,
} as const

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {CATEGORIES.map((c) => {
        const Icon = ICONS[c.icon as keyof typeof ICONS]
        return (
          <Link
            key={c.id}
            href={`/kategori/${c.id}`}
            className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-sand text-primary">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="font-medium">{c.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{c.hint}</p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
