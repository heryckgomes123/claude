const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const money = (value: number) => brl.format(Math.round(value * 100) / 100)

export const onlyDigits = (s: string) => s.replace(/\D/g, '')

/** wa.me exige o DDI: "67999113636" (DDD + número) vira "5567999113636". */
export function waNumber(s: string) {
  const d = onlyDigits(s).replace(/^0+/, '')
  return d.length === 10 || d.length === 11 ? '55' + d : d
}

export function formatDate(iso: string, withTime = false) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

export { addBusinessDays } from '../../supabase/functions/_shared/money'

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export const uid = (prefix = '') => prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)

/** Hash simples (não criptográfico) — usado só no modo demonstração para não guardar a senha em texto puro. */
export function demoHash(s: string) {
  let h1 = 0xdeadbeef ^ s.length
  let h2 = 0x41c6ce57 ^ s.length
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
}

export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}
