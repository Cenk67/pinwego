const FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"])

export function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function validPhone(value: string) {
  const digits = value.replace(/\D/g, "")
  if (digits.length === 10) return digits.startsWith("5")
  if (digits.length === 11) return digits.startsWith("05")
  if (digits.length === 12) return digits.startsWith("905")
  return false
}

export function validTckn(value: string) {
  if (!/^[1-9]\d{10}$/.test(value)) return false
  const digits = value.split("").map(Number)
  const odd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8]
  const even = digits[1] + digits[3] + digits[5] + digits[7]
  const tenth = (((odd * 7 - even) % 10) + 10) % 10
  const eleventh = digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0) % 10
  return digits[9] === tenth && digits[10] === eleventh
}

export function validVkn(value: string) {
  if (!/^\d{10}$/.test(value)) return false
  let sum = 0
  for (let index = 0; index < 9; index += 1) {
    const base = (Number(value[index]) + (9 - index)) % 10
    let step = (base * 2 ** (9 - index)) % 9
    if (base !== 0 && step === 0) step = 9
    sum += step
  }
  return Number(value[9]) === (10 - (sum % 10)) % 10
}

export function adultBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const born = new Date(`${value}T00:00:00`)
  if (Number.isNaN(born.getTime())) return false
  const limit = new Date()
  limit.setHours(0, 0, 0, 0)
  limit.setFullYear(limit.getFullYear() - 18)
  return born <= limit
}

export function validPassword(value: string) {
  return value.length >= 8
}

export function fileProblem(file: File | null) {
  if (!file) return "Belge seçilmedi."
  if (file.size > 4 * 1024 * 1024) return "Belge 4 MB’den büyük."
  const named = /\.(jpe?g|png|webp|pdf)$/i.test(file.name)
  if (!FILE_TYPES.has(file.type) && !named) return "Belge PDF, JPG, PNG veya WEBP olmalı."
  return null
}

export function maskId(value: string) {
  if (value.length < 4) return value
  return `${value.slice(0, 2)}${"•".repeat(value.length - 4)}${value.slice(-2)}`
}
