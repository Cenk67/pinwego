"use client"

import { useEffect, useState } from "react"
import type { GalleryItem } from "@/lib/types"

export function useListingGallery(id: string | undefined, enabled: boolean) {
  const [state, setState] = useState<{ id: string; photo: string; gallery: GalleryItem[] } | null>(null)
  useEffect(() => {
    if (!enabled || !id) return
    let cancel = false
    fetch(`/api/ilan?galeri=${encodeURIComponent(id)}`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancel) return
        const row = data && typeof data === "object" ? data as { photo?: unknown; gallery?: unknown } : null
        setState({
          id,
          photo: typeof row?.photo === "string" ? row.photo : "",
          gallery: Array.isArray(row?.gallery) ? row.gallery.filter((item): item is GalleryItem => Boolean(item) && typeof item === "object") : [],
        })
      })
      .catch(() => {
        if (!cancel) setState({ id, photo: "", gallery: [] })
      })
    return () => {
      cancel = true
    }
  }, [enabled, id])
  const current = state?.id === id ? state : null
  return {
    ready: !enabled || Boolean(current),
    photo: current?.photo ?? "",
    gallery: current?.gallery ?? [],
  }
}
