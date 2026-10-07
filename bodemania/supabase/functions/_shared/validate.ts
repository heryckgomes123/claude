import { onlyDigits } from './money.ts'

export function isCPF(value: string) {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10])
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim())
export const isPhone = (v: string) => /^\d{10,11}$/.test(onlyDigits(v))
export const isCEP = (v: string) => /^\d{8}$/.test(onlyDigits(v))
export const isFullName = (v: string) => String(v).trim().split(/\s+/).filter((p) => p.length > 1).length >= 2

export function luhn(value: string) {
  const d = onlyDigits(value)
  if (d.length < 13) return false
  let sum = 0
  let dbl = false
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i])
    if (dbl) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    dbl = !dbl
  }
  return sum % 10 === 0
}

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'elo' | 'hipercard' | 'unknown'

export function cardBrand(value: string): CardBrand {
  const d = onlyDigits(value)
  if (/^(4011|4312|4389|4514|4573|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(d)) return 'elo'
  if (/^(606282|3841)/.test(d)) return 'hipercard'
  if (/^3[47]/.test(d)) return 'amex'
  if (/^4/.test(d)) return 'visa'
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'mastercard'
  return 'unknown'
}

export function isExpiryValid(mmYY: string, now = new Date()) {
  const m = /^(\d{2})\/(\d{2})$/.exec(mmYY)
  if (!m) return false
  const month = Number(m[1])
  const year = 2000 + Number(m[2])
  if (month < 1 || month > 12) return false
  const end = new Date(year, month, 0, 23, 59, 59)
  return end >= now && year <= now.getFullYear() + 20
}

export const passwordIssues = (p: string) => {
  const issues: string[] = []
  if (p.length < 8) issues.push('mínimo de 8 caracteres')
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) issues.push('letras e números')
  return issues
}
