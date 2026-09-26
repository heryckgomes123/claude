import 'server-only'
import { createHash, randomBytes } from 'node:crypto'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sem 0/O/1/I para evitar confusão

export function hashAccessCode(code: string): string {
  return createHash('sha256').update(normalizeAccessCode(code)).digest('hex')
}

export function normalizeAccessCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/** Gera um código legível no formato LAB-XXXX-XXXX-XXXX (60 bits de entropia). */
export function generateAccessCode(prefix = 'LAB'): string {
  const bytes = randomBytes(12)
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length])
  const groups = [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12)].map((g) => g.join(''))
  return [prefix, ...groups].join('-')
}

export function accessCodeHint(code: string): string {
  const n = normalizeAccessCode(code)
  return `${n.slice(0, 3)}…${n.slice(-4)}`
}
