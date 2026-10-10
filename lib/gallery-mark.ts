export const GALLERY_WIDTH = 1200
export const GALLERY_HEIGHT = 900

export function galleryCaption(
  business: { name: string; subcategory: string; district: string },
  item: { description?: string },
) {
  const description = item.description?.replace(/\s+/g, " ").trim() || `${business.subcategory}, ${business.district}`
  return { name: business.name.trim(), description }
}

export function coverFrame(sourceWidth: number, sourceHeight: number, frameWidth = GALLERY_WIDTH, frameHeight = GALLERY_HEIGHT) {
  const safeWidth = Math.max(1, sourceWidth)
  const safeHeight = Math.max(1, sourceHeight)
  const scale = Math.max(frameWidth / safeWidth, frameHeight / safeHeight)
  const width = safeWidth * scale
  const height = safeHeight * scale
  return {
    frameWidth,
    frameHeight,
    dx: (frameWidth - width) / 2,
    dy: (frameHeight - height) / 2,
    dw: width,
    dh: height,
  }
}

export function watermarkLayout(width: number, height: number, name: string) {
  const label = name.replace(/\s+/g, " ").trim().slice(0, 42)
  const fontSize = Math.max(22, Math.round(Math.min(width, height) * (label.length > 22 ? 0.048 : 0.062)))
  const gapX = Math.round(fontSize * Math.max(7, label.length * 0.62))
  const gapY = Math.round(fontSize * 3.1)
  const points: { x: number; y: number }[] = []
  for (let y = -height; y < height * 2; y += gapY) {
    for (let x = -width; x < width * 2; x += gapX) points.push({ x, y })
  }
  return { label, fontSize, gapX, gapY, points }
}
