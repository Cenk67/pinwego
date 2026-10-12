"use client"

import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState, useSyncExternalStore } from "react"
import { PlaceButton } from "@/components/directory/place-picker"
import { VoiceMic, VoicePanel, VoiceSearchRoot, type VoiceHandle } from "@/components/directory/voice-search"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { voiceSearchPath, type VoicePatch } from "@/lib/voice/intent"
import { getServerVoiceSettings, getVoiceSettings, subscribeVoice } from "@/lib/voice/settings"
import { clearVoiceTrail } from "@/lib/voice/trail"
import { useLocale } from "@/lib/use-locale"
import { cn } from "cn"

export function SearchForm({
  initial = "",
  large = false,
  placeholder,
  onSearch,
}: {
  initial?: string
  large?: boolean
  placeholder?: string
  onSearch?: (query: string, voice?: VoicePatch) => void
}) {
  const router = useRouter()
  const { t } = useLocale()
  const settings = useSyncExternalStore(subscribeVoice, getVoiceSettings, getServerVoiceSettings)
  const hint = placeholder ?? t("search.placeholder")
  const [value, setValue] = useState(initial)
  const voiceRef = useRef<VoiceHandle>(null)

  function typed(query: string) {
    clearVoiceTrail()
    if (onSearch) {
      onSearch(query)
      return
    }
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    router.push(params.size ? `/ara?${params}` : "/ara")
  }

  function commitVoice(query: string, patch: VoicePatch) {
    setValue(query)
    if (onSearch) {
      onSearch(query, patch)
      return
    }
    router.push(voiceSearchPath(query, patch))
  }

  return (
    <VoiceSearchRoot value={value} onTranscript={setValue} onCommit={commitVoice} handleRef={voiceRef}>
      <form
        className={cn(
          "flex flex-col gap-2 rounded-3xl bg-card p-2 ring-1 ring-foreground/10",
          large && "shadow-[0_24px_50px_-32px_rgba(48,36,16,0.55)]",
        )}
        onSubmit={(event) => {
          event.preventDefault()
          if (voiceRef.current?.listening) {
            voiceRef.current.stop()
            return
          }
          typed(value.trim())
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <label>
              <span className="sr-only">{t("search.aria")}</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={hint}
                className={cn(
                  "h-12 border-0 bg-transparent pl-10 shadow-none focus-visible:ring-0",
                  settings.enabled && "pe-14",
                  large && "text-base md:text-base",
                )}
              />
            </label>
            <VoiceMic />
          </div>
          <div className="flex gap-2">
            <PlaceButton className="min-w-0 flex-1 sm:flex-none" />
            <Button type="submit" className="h-12 flex-1 rounded-2xl px-5 sm:flex-none">
              {t("search.submit")}
            </Button>
          </div>
        </div>
        <VoicePanel />
      </form>
    </VoiceSearchRoot>
  )
}
