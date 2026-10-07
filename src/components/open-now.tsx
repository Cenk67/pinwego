"use client"

import { isOpenAt } from "@/lib/hours"
import type { DayHours } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { useBrowserValue } from "@/lib/use-browser"

export function OpenNow({ hours }: { hours: Record<string, DayHours> }) {
  const open = useBrowserValue(() => isOpenAt(hours, new Date()), null)

  if (open === null) return null
  return (
    <Badge variant={open ? "secondary" : "outline"}>
      {open ? "Şu an açık" : "Kapalı"}
    </Badge>
  )
}
