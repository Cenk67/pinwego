import { watermarkLayout } from "@/lib/gallery-mark"

const cache = new Map<string, string>()

export function paintWatermark(context: CanvasRenderingContext2D, width: number, height: number, name: string) {
  const layout = watermarkLayout(width, height, name)
  if (!layout.label) return
  context.save()
  context.translate(width / 2, height / 2)
  context.rotate((-24 * Math.PI) / 180)
  context.translate(-width / 2, -height / 2)
  context.font = `600 ${layout.fontSize}px Outfit, sans-serif`
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.fillStyle = "rgba(255,255,255,0.46)"
  context.shadowColor = "rgba(8, 24, 64, 0.62)"
  context.shadowBlur = Math.max(2, Math.round(layout.fontSize * 0.16))
  for (const point of layout.points) context.fillText(layout.label, point.x, point.y)
  context.restore()
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Görsel okunamadı."))
    image.src = src
  })
}

export async function watermarkImage(src: string, name: string) {
  const key = `${name}\0${src}`
  const cached = cache.get(key)
  if (cached) return cached
  const image = await loadImage(src)
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) return src
  context.drawImage(image, 0, 0, width, height)
  paintWatermark(context, width, height, name)
  const webp = canvas.toDataURL("image/webp", 0.86)
  const dataUrl = webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.86)
  cache.set(key, dataUrl)
  return dataUrl
}
