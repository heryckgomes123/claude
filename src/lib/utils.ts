export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export const uid = (prefix = 'id') =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

/** PRNG determinístico (mulberry32) — dados demo estáveis entre renders. */
export function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v))

export const pct = (value: number, total: number) => (total <= 0 ? 0 : clamp(value / total))

export const formatNumber = (n: number) => new Intl.NumberFormat('pt-BR').format(n)

export function vibrate(pattern: number | number[] = 12) {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern)
  } catch {
    /* sem suporte */
  }
}
