/**
 * Validação do orçamento — usada no navegador (por etapa) e no servidor (payload completo).
 * Mantenha este arquivo livre de dependências de DOM ou de assets.
 */
import {
  BUDGET_GUIDANCE_ID,
  BUDGET_RANGES,
  BUDGET_SKIP_ID,
  CONTACT_CHANNELS,
  DIRECTION_IDS,
  INTEREST_IDS,
  LIMITS,
  SERVICE_IDS,
  isQuestionRequired,
  visibleQuestions,
} from '../../config/quote.js'
import type { ContactChannel, DirectionId, InterestId, ServiceId } from '../../config/quote.js'

export type Answers = Record<string, string | string[]>

export interface ContactDraft {
  name: string
  company: string
  channel: ContactChannel | ''
  whatsapp: string
  email: string
  budget: string
  budgetNote: string
  marketingConsent: boolean
}

export interface QuotePayload {
  idempotencyKey: string
  startedAt: number
  /** Campo-isca: precisa chegar vazio. */
  website: string
  interest: InterestId | null
  services: ServiceId[]
  references: string[]
  direction: DirectionId | null
  answers: Answers
  contact: ContactDraft & { channel: ContactChannel }
  privacyNoticeVersion: string
  sourceUrl: string
}

export type FieldErrors = Record<string, string>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const REF_ID_RE = /^[a-z0-9-]{1,48}$/

/** Normaliza um WhatsApp digitado: só dígitos; números brasileiros sem DDI ganham 55. */
export function normalizeWhatsapp(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

export function isValidWhatsapp(raw: string): boolean {
  const n = normalizeWhatsapp(raw)
  return /^\d{12,15}$/.test(n)
}

export function isValidEmail(raw: string): boolean {
  const v = raw.trim()
  return v.length <= LIMITS.email && EMAIL_RE.test(v)
}

export function validateServices(services: readonly string[]): FieldErrors {
  if (services.length === 0) return { services: 'Escolha pelo menos uma opção para continuar.' }
  return {}
}

export function validateAnswers(services: readonly ServiceId[], answers: Answers): FieldErrors {
  const errors: FieldErrors = {}
  for (const q of visibleQuestions(services)) {
    const value = answers[q.id]
    const required = isQuestionRequired(q, services)
    const empty = value === undefined || (Array.isArray(value) ? value.length === 0 : value.trim() === '')
    if (empty) {
      if (required) errors[q.id] = q.kind === 'textarea' || q.kind === 'text' ? 'Conte um pouco para continuar.' : 'Escolha uma opção.'
      continue
    }
    if (q.kind === 'single') {
      if (typeof value !== 'string' || !q.options?.some((o) => o.id === value)) errors[q.id] = 'Opção inválida.'
    } else if (q.kind === 'multi') {
      if (!Array.isArray(value) || value.some((v) => !q.options?.some((o) => o.id === v))) errors[q.id] = 'Opção inválida.'
    } else if (typeof value !== 'string' || value.length > (q.maxLength ?? LIMITS.text)) {
      errors[q.id] = `Use até ${q.maxLength ?? LIMITS.text} caracteres.`
    }
  }
  return errors
}

export function validateContact(contact: ContactDraft): FieldErrors {
  const errors: FieldErrors = {}
  const name = contact.name.trim()
  if (name.length < 2) errors.name = 'Como podemos te chamar?'
  else if (name.length > LIMITS.name) errors.name = `Use até ${LIMITS.name} caracteres.`
  if (contact.company.trim().length > LIMITS.company) errors.company = `Use até ${LIMITS.company} caracteres.`
  if (!CONTACT_CHANNELS.includes(contact.channel as ContactChannel)) errors.channel = 'Escolha como prefere receber a resposta.'
  if (contact.channel === 'whatsapp' && !isValidWhatsapp(contact.whatsapp)) errors.whatsapp = 'Informe um WhatsApp com DDD. Ex.: (11) 91234-5678'
  if (contact.channel === 'email' && !isValidEmail(contact.email)) errors.email = 'Informe um e-mail válido.'
  const budgetIds = [...BUDGET_RANGES.map((r) => r.id), BUDGET_GUIDANCE_ID, BUDGET_SKIP_ID, '']
  if (!budgetIds.includes(contact.budget)) errors.budget = 'Opção inválida.'
  if (contact.budgetNote.length > LIMITS.budgetNote) errors.budgetNote = `Use até ${LIMITS.budgetNote} caracteres.`
  return errors
}

/* -------------------------------------------------------------------------- */
/* Servidor: valida e normaliza um payload desconhecido                       */
/* -------------------------------------------------------------------------- */

function str(v: unknown, max: number = LIMITS.text): string {
  return typeof v === 'string' ? v.slice(0, max * 2) : ''
}

export type ParseResult = { ok: true; value: QuotePayload } | { ok: false; errors: FieldErrors }

export function parseQuotePayload(input: unknown): ParseResult {
  if (!input || typeof input !== 'object') return { ok: false, errors: { form: 'Solicitação inválida.' } }
  const raw = input as Record<string, unknown>
  const errors: FieldErrors = {}

  const idempotencyKey = str(raw.idempotencyKey, 64)
  if (!UUID_RE.test(idempotencyKey)) errors.idempotencyKey = 'Identificador inválido.'

  const startedAt = typeof raw.startedAt === 'number' && Number.isFinite(raw.startedAt) ? raw.startedAt : 0

  const interest = INTEREST_IDS.includes(raw.interest as InterestId) ? (raw.interest as InterestId) : null

  const services = Array.isArray(raw.services) ? [...new Set(raw.services.filter((s): s is ServiceId => SERVICE_IDS.includes(s as ServiceId)))] : []
  Object.assign(errors, validateServices(services))

  const refsRaw = Array.isArray(raw.references) ? raw.references : []
  const references = [...new Set(refsRaw.filter((r): r is string => typeof r === 'string' && REF_ID_RE.test(r)))]
  if (references.length > LIMITS.references || references.length !== refsRaw.length) errors.references = 'Referências inválidas.'

  const direction = raw.direction == null ? null : DIRECTION_IDS.includes(raw.direction as DirectionId) ? (raw.direction as DirectionId) : undefined
  if (direction === undefined) errors.direction = 'Direção inválida.'

  // Só aceita respostas de perguntas visíveis para os serviços escolhidos.
  const answers: Answers = {}
  const answersRaw = raw.answers && typeof raw.answers === 'object' ? (raw.answers as Record<string, unknown>) : {}
  for (const q of visibleQuestions(services)) {
    const v = answersRaw[q.id]
    if (typeof v === 'string') answers[q.id] = v.trim()
    else if (Array.isArray(v) && v.every((x) => typeof x === 'string')) answers[q.id] = [...new Set(v as string[])]
  }
  Object.assign(errors, validateAnswers(services, answers))

  const c = raw.contact && typeof raw.contact === 'object' ? (raw.contact as Record<string, unknown>) : {}
  const contact: ContactDraft = {
    name: str(c.name).trim(),
    company: str(c.company).trim(),
    channel: str(c.channel, 16) as ContactChannel,
    whatsapp: str(c.whatsapp, 32),
    email: str(c.email, LIMITS.email).trim(),
    budget: str(c.budget, 32),
    budgetNote: str(c.budgetNote, LIMITS.budgetNote).trim(),
    marketingConsent: c.marketingConsent === true,
  }
  Object.assign(errors, validateContact(contact))
  // Guarda apenas o contato do canal escolhido.
  if (contact.channel === 'whatsapp') {
    contact.whatsapp = normalizeWhatsapp(contact.whatsapp)
    contact.email = ''
  } else {
    contact.whatsapp = ''
  }

  const privacyNoticeVersion = str(raw.privacyNoticeVersion, 32)
  if (!privacyNoticeVersion) errors.privacyNoticeVersion = 'Aviso de privacidade ausente.'

  if (Object.keys(errors).length) return { ok: false, errors }

  return {
    ok: true,
    value: {
      idempotencyKey,
      startedAt,
      website: str(raw.website, 200),
      interest,
      services,
      references,
      direction: direction ?? null,
      answers,
      contact: contact as QuotePayload['contact'],
      privacyNoticeVersion,
      sourceUrl: str(raw.sourceUrl, 300),
    },
  }
}
