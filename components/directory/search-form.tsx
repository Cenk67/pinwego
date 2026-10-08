"use client"

import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { PlaceButton } from "@/components/directory/place-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "cn"

export function SearchForm({
  initial = "",
  large = false,
  placeholder = "Örn. Kadıköy'de çocukla akşam yemeği",
  onSearch,
}: {
  initial?: string
  large?: boolean
  placeholder?: string
  onSearch?: (query: string) => void
}) {
  const router = useRouter()
  const [value, setValue] = useState(initial)

  return (
    <form
      className={cn(
        "flex flex-col gap-2 rounded-3xl bg-card p-2 ring-1 ring-foreground/10 sm:flex-row",
        large && "shadow-[0_24px_50px_-32px_rgba(48,36,16,0.55)]",
      )}
      onSubmit={(event) => {
        event.preventDefault()
        const query = value.trim()
        if (onSearch) {
          onSearch(query)
          return
        }
        const params = new URLSearchParams()
        if (query) params.set("q", query)
        router.push(params.size ? `/ara?${params}` : "/ara")
      }}
    >
      <label className="relative flex-1">
        <span className="sr-only">Arama</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className={cn(
            "h-12 border-0 bg-transparent pl-10 shadow-none focus-visible:ring-0",
            large && "text-base md:text-base",
          )}
        />
      </label>
      <div className="flex gap-2">
        <PlaceButton className="min-w-0 flex-1 sm:flex-none" />
        <Button type="submit" className="h-12 flex-1 rounded-2xl px-5 sm:flex-none">
          Eşleştir
        </Button>
      </div>
    </form>
  )
}
