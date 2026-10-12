"use client"

import { useMemo } from "react"
import { encode, renderSVG } from "uqr"

export function QrMark({ text, label }: { text: string; label: string }) {
  const svg = useMemo(
    () => renderSVG(text, { ecc: "M", border: 2, pixelSize: 4, blackColor: "#1c1917", whiteColor: "#ffffff" }),
    [text],
  )
  return <div className="w-52 max-w-full" role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />
}

export function downloadQrSvg(text: string, filename: string) {
  const svg = renderSVG(text, { ecc: "M", border: 2, pixelSize: 8, blackColor: "#1c1917", whiteColor: "#ffffff" })
  const blob = new Blob([svg], { type: "image/svg+xml" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadQrPng(text: string, filename: string) {
  const matrix = encode(text, { ecc: "M", border: 2 })
  const scale = 12
  const canvas = document.createElement("canvas")
  canvas.width = matrix.size * scale
  canvas.height = matrix.size * scale
  const context = canvas.getContext("2d")
  if (!context) return
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = "#1c1917"
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
