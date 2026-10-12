const types = new Set(["image/jpeg", "image/png", "image/webp"])
const maxBytes = 1.2 * 1024 * 1024

export function readCampaignImage(file: File) {
  if (!types.has(file.type)) return Promise.reject(new Error("type"))
  if (file.size > maxBytes) return Promise.reject(new Error("size"))
  return new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, 960 / image.width)
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      const context = canvas.getContext("2d")
      if (!context) {
        URL.revokeObjectURL(url)
        reject(new Error("canvas"))
        return
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL("image/jpeg", 0.72))
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("read"))
    }
    image.src = url
  })
}
