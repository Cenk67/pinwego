import { coverFrame, GALLERY_HEIGHT, GALLERY_WIDTH } from "@/lib/gallery-mark"
import { COVER_LIMIT, GALLERY_IMAGE_LIMIT } from "@/lib/listing-media"

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
  const fitted = fitFrame(source, GALLERY_WIDTH, GALLERY_HEIGHT, GALLERY_IMAGE_LIMIT)
  return {
    ...fitted,
    sourceWidth: source.naturalWidth,
    sourceHeight: source.naturalHeight,
  }
}

export async function scaleCoverFile(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Yalnızca görsel yüklenir.")
  const source = await readImage(file)
  const fitted = fitFrame(source, 1280, 720, COVER_LIMIT)
  return {
    ...fitted,
    sourceWidth: source.naturalWidth,
    sourceHeight: source.naturalHeight,
  }
}

export async function shrinkCover(src: string) {
  if (!src.startsWith("data:") || src.length <= COVER_LIMIT) return src
  const source = await loadImage(src)
  return fitFrame(source, 1280, 720, COVER_LIMIT).dataUrl
}

function fitFrame(source: HTMLImageElement, width: number, height: number, limit: number) {
  let frameWidth = width
  let frameHeight = height
  let dataUrl = ""
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const frame = coverFrame(source.naturalWidth, source.naturalHeight, frameWidth, frameHeight)
    const canvas = document.createElement("canvas")
    canvas.width = frame.frameWidth
    canvas.height = frame.frameHeight
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Görsel ölçeklenemedi.")
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, frame.frameWidth, frame.frameHeight)
    context.drawImage(source, frame.dx, frame.dy, frame.dw, frame.dh)
    dataUrl = encode(canvas, limit)
    if (dataUrl.length <= limit) {
      return { dataUrl, width: frame.frameWidth, height: frame.frameHeight }
    }
    frameWidth = Math.max(480, Math.round(frameWidth * 0.75))
    frameHeight = Math.max(270, Math.round(frameHeight * 0.75))
  }
  return { dataUrl, width: frameWidth, height: frameHeight }
}

function encode(canvas: HTMLCanvasElement, limit: number) {
  let best = canvas.toDataURL("image/jpeg", 0.82)
  for (const quality of [0.82, 0.7, 0.58, 0.46]) {
    const webp = canvas.toDataURL("image/webp", quality)
    const jpeg = canvas.toDataURL("image/jpeg", quality)
    const dataUrl = webp.startsWith("data:image/webp") && webp.length <= jpeg.length ? webp : jpeg
    best = dataUrl
    if (dataUrl.length <= limit) return dataUrl
  }
  return best
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Görsel okunamadı."))
    image.src = src
  })
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
