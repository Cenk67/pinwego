"use client"

import { useEffect, useState } from "react"
import { watermarkImage } from "@/lib/watermark"

export function MarkedPhoto({
  src,
  name,
  alt,
  className,
}: {
  src: string
  name: string
  alt: string
  className?: string
}) {
  const [shown, setShown] = useState(src)
  useEffect(() => {
    let cancel = false
    setShown(src)
    watermarkImage(src, name)
      .then((url) => {
        if (!cancel) setShown(url)
      })
      .catch(() => {
        if (!cancel) setShown(src)
      })
    return () => {
      cancel = true
    }
  }, [src, name])
  return <img src={shown} alt={alt} loading="lazy" decoding="async" className={className} />
}
