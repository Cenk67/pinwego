import { coverFrame, GALLERY_HEIGHT, GALLERY_WIDTH } from "@/lib/gallery-mark"

export const BLOG_IMAGE_MAX = 1600

export function scaledSize(width: number, height: number, max = BLOG_IMAGE_MAX) {
  const safeWidth = Math.max(1, Math.round(width))
  const safeHeight = Math.max(1, Math.round(height))
  const longEdge = Math.max(safeWidth, safeHeight)
  if (longEdge <= max) return { width: safeWidth, height: safeHeight }
  const scale = max / longEdge
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  }
}

export async function scaleImageFile(file: File, preferredMax = BLOG_IMAGE_MAX) {
  if (!file.type.startsWith("image/")) throw new Error("Yalnızca görsel yüklenir.")
  const source = await readImage(file)
  let max = preferredMax
  let quality = 0.82
  let result = draw(source, max, quality)
  if (result.dataUrl.length > 900_000) {
    max = 1200
    quality = 0.72
    result = draw(source, max, quality)
  }
  return {
    ...result,
    sourceWidth: source.width,
    sourceHeight: source.height,
  }
}

export async function scaleGalleryFile(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Yalnızca görsel yüklenir.")
  const source = await readImage(file)
  const frame = coverFrame(source.naturalWidth, source.naturalHeight, GALLERY_WIDTH, GALLERY_HEIGHT)
  const canvas = document.createElement("canvas")
  canvas.width = frame.frameWidth
  canvas.height = frame.frameHeight
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Görsel ölçeklenemedi.")
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, frame.frameWidth, frame.frameHeight)
  context.drawImage(source, frame.dx, frame.dy, frame.dw, frame.dh)
  const webp = canvas.toDataURL("image/webp", 0.82)
  let dataUrl = webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.82)
  if (dataUrl.length > 700_000) {
    const smaller = canvas.toDataURL("image/webp", 0.68)
    dataUrl = smaller.startsWith("data:image/webp") ? smaller : canvas.toDataURL("image/jpeg", 0.68)
  }
  return {
    dataUrl,
    width: frame.frameWidth,
    height: frame.frameHeight,
    sourceWidth: source.naturalWidth,
    sourceHeight: source.naturalHeight,
  }
}

function readImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Görsel okunamadı."))
    }
    image.src = url
  })
}

function draw(image: HTMLImageElement, max: number, quality: number) {
  const size = scaledSize(image.naturalWidth, image.naturalHeight, max)
  const canvas = document.createElement("canvas")
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Görsel ölçeklenemedi.")
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, size.width, size.height)
  context.drawImage(image, 0, 0, size.width, size.height)
  const webp = canvas.toDataURL("image/webp", quality)
  const dataUrl = webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", quality)
  return { dataUrl, width: size.width, height: size.height }
}
