"use client"

import { useEffect, useMemo, useState } from "react"
import { encode, renderSVG } from "uqr"
import { qrInk, qrPalette, qrPaper, type Rgb } from "@/lib/qr-color"

export type QrPaint = { dark: string; light: string }

const fallback: QrPaint = { dark: qrInk, light: qrPaper }

export function useQrColors(photo?: string) {
  const [colors, setColors] = useState<QrPaint>(fallback)
  useEffect(() => {
    if (!photo) return
    let cancel = false
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => {
      const canvas = document.createElement("canvas")
      const size = 24
      canvas.width = size
      canvas.height = size
      const context = canvas.getContext("2d", { willReadFrequently: true })
      if (!context) return
      context.drawImage(image, 0, 0, size, size)
      let data: ImageData
      try {
        data = context.getImageData(0, 0, size, size)
      } catch {
        return
      }
      const pixels: Rgb[] = []
      for (let index = 0; index < data.data.length; index += 4) {
        if (data.data[index + 3] < 200) continue
        pixels.push({ r: data.data[index], g: data.data[index + 1], b: data.data[index + 2] })
      }
      if (!cancel) setColors(qrPalette(pixels))
    }
    image.onerror = () => {
      if (!cancel) setColors(fallback)
    }
    image.src = photo
    return () => {
      cancel = true
    }
  }, [photo])
  return colors
}

function paint(colors?: QrPaint) {
  return { blackColor: colors?.dark || qrInk, whiteColor: colors?.light || qrPaper }
}

export function QrMark({ text, label, photo, colors }: { text: string; label: string; photo?: string; colors?: QrPaint }) {
  const sampled = useQrColors(colors ? undefined : photo)
  const ink = colors ?? sampled
  const svg = useMemo(
    () => renderSVG(text, { ecc: "M", border: 2, pixelSize: 4, ...paint(ink) }),
    [text, ink],
  )
  return <div className="w-52 max-w-full" role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />
}

export function downloadQrSvg(text: string, filename: string, colors?: QrPaint) {
  const svg = renderSVG(text, { ecc: "M", border: 2, pixelSize: 8, ...paint(colors) })
  const blob = new Blob([svg], { type: "image/svg+xml" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadQrPng(text: string, filename: string, colors?: QrPaint) {
  const matrix = encode(text, { ecc: "M", border: 2 })
  const scale = 12
  const canvas = document.createElement("canvas")
  canvas.width = matrix.size * scale
  canvas.height = matrix.size * scale
  const context = canvas.getContext("2d")
  if (!context) return
  const tone = paint(colors)
  context.fillStyle = tone.whiteColor
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = tone.blackColor
  matrix.data.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) context.fillRect(x * scale, y * scale, scale, scale)
    })
  })
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }, "image/png")
}
