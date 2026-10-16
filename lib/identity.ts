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

export function validGsm(value: string) {
  if (validPhone(value)) return true
  const compact = value.trim().replace(/[\s().-]/g, "")
  if (!compact.startsWith("+")) return false
  return /^\d{8,15}$/.test(compact.slice(1))
}

export function validBirthDate(value: string, today = istanbulDay()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return false
  const born = new Date(Date.UTC(year, month - 1, day))
  if (born.getUTCFullYear() !== year || born.getUTCMonth() !== month - 1 || born.getUTCDate() !== day) return false
  return value <= today
}

function istanbulDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now)
}

export function validPassword(value: string) {
  return value.length >= 8 && value.length <= 200 && /\p{L}/u.test(value) && /\d/.test(value)
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
