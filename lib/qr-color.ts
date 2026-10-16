export type Rgb = { r: number; g: number; b: number }

export const qrInk = "#1c1917"
export const qrPaper = "#ffffff"

type Hsl = { h: number; s: number; l: number }

function channel(value: number) {
  const unit = value / 255
  return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4
}

function luminance(pixel: Rgb) {
  return 0.2126 * channel(pixel.r) + 0.7152 * channel(pixel.g) + 0.0722 * channel(pixel.b)
}

function contrast(dark: Rgb, light: Rgb) {
  const hi = Math.max(luminance(dark), luminance(light))
  const lo = Math.min(luminance(dark), luminance(light))
  return (hi + 0.05) / (lo + 0.05)
}

function hsl(pixel: Rgb): Hsl {
  const r = pixel.r / 255
  const g = pixel.g / 255
  const b = pixel.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const delta = max - min
  if (delta === 0) return { h: 0, s: 0, l }
  const s = delta / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (max === r) h = ((g - b) / delta) % 6
  else if (max === g) h = (b - r) / delta + 2
  else h = (r - g) / delta + 4
  h /= 6
  if (h < 0) h += 1
  return { h, s, l }
}

function rgb(h: number, s: number, l: number): Rgb {
  const chroma = (1 - Math.abs(2 * l - 1)) * s
  const x = chroma * (1 - Math.abs(((h * 6) % 2) - 1))
  const m = l - chroma / 2
  let r = 0
  let g = 0
  let b = 0
  const sector = h * 6
  if (sector < 1) [r, g, b] = [chroma, x, 0]
  else if (sector < 2) [r, g, b] = [x, chroma, 0]
  else if (sector < 3) [r, g, b] = [0, chroma, x]
  else if (sector < 4) [r, g, b] = [0, x, chroma]
  else if (sector < 5) [r, g, b] = [x, 0, chroma]
  else [r, g, b] = [chroma, 0, x]
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 }
}

function hex(pixel: Rgb) {
  const byte = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")
  return `#${byte(pixel.r)}${byte(pixel.g)}${byte(pixel.b)}`
}

export function qrPalette(pixels: Rgb[]) {
  const bins = Array.from({ length: 24 }, () => ({ weight: 0, r: 0, g: 0, b: 0, n: 0 }))
  for (const pixel of pixels) {
    const tone = hsl(pixel)
    if (tone.s < 0.18 || tone.l > 0.9 || tone.l < 0.1) continue
    const bin = Math.min(23, Math.floor(tone.h * 24))
    const weight = tone.s * (1 - Math.abs(tone.l - 0.45))
    bins[bin].weight += weight
    bins[bin].r += pixel.r
    bins[bin].g += pixel.g
    bins[bin].b += pixel.b
    bins[bin].n += 1
  }
  const best = bins.reduce((left, right) => (right.weight > left.weight ? right : left))
  if (best.n < 4) return { dark: qrInk, light: qrPaper }
  const tone = hsl({ r: best.r / best.n, g: best.g / best.n, b: best.b / best.n })
  const saturation = Math.max(0.62, Math.min(0.92, tone.s))
  const light = rgb(tone.h, Math.min(0.22, saturation * 0.2), 0.96)
  let lightness = 0.34
  let dark = rgb(tone.h, saturation, lightness)
  while (contrast(dark, light) < 7 && lightness > 0.16) {
    lightness -= 0.03
    dark = rgb(tone.h, saturation, lightness)
  }
  return { dark: hex(dark), light: hex(light) }
}
