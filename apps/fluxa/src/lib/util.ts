import type { Contact, DelayUnit } from './types'

export function uid(prefix = ''): string {
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}${Date.now().toString(36).slice(-4)}${random}`
}

/** Minúsculas, sem acentos e sem pontuação: base para comparar palavras-chave. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function fullName(contact: Pick<Contact, 'firstName' | 'lastName'>): string {
  return [contact.firstName, contact.lastName].filter(Boolean).join(' ')
}

/**
 * Substitui variáveis no texto: {{first_name}}, {{last_name}}, {{full_name}},
 * {{channel}}, {{score}} e {{campo}} para qualquer campo personalizado.
 * Aceita fallback: {{first_name|amigo}}.
 */
export function interpolate(text: string, contact: Contact): string {
  return text.replace(/\{\{\s*([\w.]+)\s*(?:\|([^}]*))?\}\}/g, (_, rawKey: string, fallback = '') => {
    const key = rawKey.replace(/^field\./, '')
    const builtIn: Record<string, string> = {
      first_name: contact.firstName,
      last_name: contact.lastName,
      full_name: fullName(contact),
      channel: contact.channel,
      score: String(contact.score),
    }
    const value = builtIn[key] ?? contact.fields[key]
    return value ? value : fallback
  })
}

const UNIT_MS: Record<DelayUnit, number> = {
  seconds: 1000,
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
}

/** Duração real de um atraso, ou comprimida (cada unidade = 1 s) no modo demonstração. */
export function delayMs(amount: number, unit: DelayUnit, scale: 'demo' | 'real'): number {
  if (scale === 'demo') return Math.max(1, amount) * 1000
  return amount * UNIT_MS[unit]
}

export const UNIT_LABEL: Record<DelayUnit, [string, string]> = {
  seconds: ['segundo', 'segundos'],
  minutes: ['minuto', 'minutos'],
  hours: ['hora', 'horas'],
  days: ['dia', 'dias'],
}

export function formatDelay(amount: number, unit: DelayUnit): string {
  const [one, many] = UNIT_LABEL[unit]
  return `${amount} ${amount === 1 ? one : many}`
}

export function timeAgo(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts)
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} d`
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function clockTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatNumber(n: number): string {
  return n.toLocaleString('pt-BR')
}

export function percent(part: number, total: number): string {
  if (!total) return '0%'
  return `${Math.round((part / total) * 100)}%`
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Telefone com 10 a 13 dígitos (com ou sem DDI). */
export function isPhone(text: string): boolean {
  const digits = text.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 13
}

/** Janela de 24 h das plataformas da Meta para mensagens livres. */
export const MESSAGING_WINDOW_MS = 24 * 3_600_000

export function insideWindow(contact: Contact, now = Date.now()): boolean {
  if (contact.channel === 'telegram' || contact.channel === 'web') return true
  return now - contact.lastInboundAt < MESSAGING_WINDOW_MS
}

export function slugify(text: string): string {
  return normalize(text).replace(/\s+/g, '-').slice(0, 40)
}
