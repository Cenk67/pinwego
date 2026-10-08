"use client"

import {
  Apple,
  ArrowUpDown,
  Baby,
  BadgeCheck,
  Bath,
  BatteryCharging,
  BedDouble,
  Bookmark,
  BookOpen,
  Brain,
  Briefcase,
  Bug,
  Building2,
  Car,
  Clapperboard,
  Compass,
  Cross,
  Dumbbell,
  Factory,
  Flame,
  FlaskConical,
  Flower2,
  Gem,
  Glasses,
  Globe,
  GraduationCap,
  Hammer,
  Handshake,
  HardHat,
  Headphones,
  HeartPulse,
  House,
  KeyRound,
  Laptop,
  Languages,
  Megaphone,
  Music,
  Newspaper,
  Paintbrush,
  Palette,
  ParkingCircle,
  PartyPopper,
  PawPrint,
  Pill,
  Plane,
  Printer,
  Radio,
  Recycle,
  Repeat,
  Ruler,
  Scale,
  Scissors,
  Shield,
  Ship,
  Shirt,
  ShoppingBag,
  Shovel,
  Smartphone,
  Snowflake,
  Sofa,
  Sparkles,
  Square,
  Stamp,
  Star,
  Truck,
  UtensilsCrossed,
  Wallet,
  Warehouse,
  Waves,
  Wheat,
  Wind,
  Wine,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import { categoryById } from "@/lib/catalog"
import { useDirectory } from "@/lib/directory-context"
import { formatRating } from "@/lib/format"
import type { Business, CategoryId } from "@/lib/types"
import { cn } from "cn"

const SECTOR_ICONS: Record<string, LucideIcon> = {
  utensils: UtensilsCrossed,
  bed: BedDouble,
  scissors: Scissors,
  paint: Paintbrush,
  sparkles: Sparkles,
  wrench: Wrench,
  heart: HeartPulse,
  pill: Pill,
  glasses: Glasses,
  building: Building2,
  sofa: Sofa,
  car: Car,
  bag: ShoppingBag,
  grad: GraduationCap,
  dumbbell: Dumbbell,
  clapper: Clapperboard,
  house: House,
  scale: Scale,
  wallet: Wallet,
  truck: Truck,
  paw: PawPrint,
  party: PartyPopper,
  laptop: Laptop,
  baby: Baby,
  wheat: Wheat,
  hat: HardHat,
  shield: Shield,
  megaphone: Megaphone,
  zap: Zap,
  plane: Plane,
  briefcase: Briefcase,
  shirt: Shirt,
  apple: Apple,
  gem: Gem,
  flower: Flower2,
  handshake: Handshake,
  ruler: Ruler,
  compass: Compass,
  flask: FlaskConical,
  printer: Printer,
  key: KeyRound,
  warehouse: Warehouse,
  recycle: Recycle,
  flame: Flame,
  palette: Palette,
  music: Music,
  globe: Globe,
  ship: Ship,
  parking: ParkingCircle,
  bath: Bath,
  phone: Smartphone,
  languages: Languages,
  repeat: Repeat,
  wind: Wind,
  bug: Bug,
  brain: Brain,
  radio: Radio,
  hammer: Hammer,
  square: Square,
  arrows: ArrowUpDown,
  waves: Waves,
  book: BookOpen,
  newspaper: Newspaper,
  headphones: Headphones,
  hospital: Cross,
  wine: Wine,
  shovel: Shovel,
  stamp: Stamp,
  badge: BadgeCheck,
  snowflake: Snowflake,
  battery: BatteryCharging,
  factory: Factory,
}

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex", className)} aria-label={`${rating.toFixed(1)} / 5`}>
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.min(1, Math.max(0, rating - index))
        return (
          <span key={index} className="relative size-3.5">
            <Star className="size-3.5 text-amber-200" />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star className="size-3.5 fill-amber-500 text-amber-500" />
            </span>
          </span>
        )
      })}
    </span>
  )
}

export function Cover({
  src,
  alt,
  position = "center",
  className,
}: {
  src: string
  alt: string
  position?: string
  className?: string
}) {
  const [visible, setVisible] = useState(true)
  if (!visible) {
    return <div className={cn("bg-primary/15", className)} aria-hidden />
  }
  return (
    // Local catalog photos; next/image would require per-file sizes without improving the demo.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("object-cover", className)}
      style={{ objectPosition: position }}
      onError={() => setVisible(false)}
    />
  )
}

export function CategoryGlyph({
  id,
  icon,
  className,
}: {
  id?: CategoryId
  icon?: string
  className?: string
}) {
  const key = icon ?? (id ? categoryById(id).icon : "")
  const Icon = SECTOR_ICONS[key] ?? Building2
  return <Icon className={className} />
}

export function SaveButton({ business, className }: { business: Business; className?: string }) {
  const { isSaved, toggleSaved } = useDirectory()
  const saved = isSaved(business.id)
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `${business.name} kaydı kaldır` : `${business.name} kaydet`}
      onClick={() => toggleSaved(business.id)}
      className={cn(
        "grid size-9 place-items-center rounded-full bg-white/95 text-foreground shadow-sm ring-1 ring-foreground/10",
        className,
      )}
    >
      <Bookmark className={cn("size-4", saved && "fill-primary text-primary")} />
    </button>
  )
}

export function RatingBlock({ business }: { business: Business }) {
  return (
    <div className="text-right">
      <div className="font-heading text-lg leading-none">{formatRating(business)}</div>
      <Stars rating={business.reviewCount ? business.rating : 0} className="mt-1 justify-end" />
    </div>
  )
}

export function categoryTint(id: CategoryId) {
  return categoryById(id).tint
}

export const fieldClass =
  "h-11 w-full rounded-xl bg-card px-3 text-sm ring-1 ring-foreground/10 outline-none focus-visible:ring-2 focus-visible:ring-ring"
