import { onlyDigits } from './format'

const apply = (digits: string, pattern: string) => {
  let out = ''
  let i = 0
  for (const ch of pattern) {
    if (i >= digits.length) break
    if (ch === '#') out += digits[i++]
    else out += ch
  }
  return out
}

export const maskCPF = (v: string) => apply(onlyDigits(v).slice(0, 11), '###.###.###-##')
export const maskCEP = (v: string) => apply(onlyDigits(v).slice(0, 8), '#####-###')
export const maskPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11)
  return d.length <= 10 ? apply(d, '(##) ####-####') : apply(d, '(##) #####-####')
}
export const maskCard = (v: string) => {
  const d = onlyDigits(v).slice(0, 19)
  // Amex: 4-6-5
  if (/^3[47]/.test(d)) return apply(d.slice(0, 15), '#### ###### #####')
  return d.replace(/(\d{4})(?=\d)/g, '$1 ')
}
export const maskExpiry = (v: string) => apply(onlyDigits(v).slice(0, 4), '##/##')
export const maskCVV = (v: string) => onlyDigits(v).slice(0, 4)
