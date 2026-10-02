import { PRIVACY_NOTICE_VERSION, QUOTE_ENDPOINT } from '../../config/site'
import type { ProjectState } from '../../state/project'
import type { SubmitError } from '../../state/ui'
import type { FieldErrors, QuotePayload } from './validation'
import { visibleQuestions } from '../../config/quote'

export type SubmitResult = { ok: true; id: string } | { ok: false; error: SubmitError; fields?: FieldErrors }

export function buildPayload(state: ProjectState, honeypot: string): QuotePayload {
  // Só envia respostas das perguntas visíveis para os serviços escolhidos.
  const answers: QuotePayload['answers'] = {}
  for (const q of visibleQuestions(state.services)) {
    const v = state.answers[q.id]
    if (v !== undefined && (Array.isArray(v) ? v.length : v.trim())) answers[q.id] = v
  }
  return {
    idempotencyKey: state.idempotencyKey,
    startedAt: state.startedAt ?? Date.now(),
    website: honeypot,
    interest: state.interest,
    services: state.services,
    references: state.references,
    direction: state.direction,
    answers,
    contact: state.contact as QuotePayload['contact'],
    privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
    sourceUrl: window.location.origin + window.location.pathname,
  }
}

/** Envia o orçamento. Só retorna ok depois que o servidor confirma a gravação. */
export async function submitQuote(payload: QuotePayload, signal?: AbortSignal): Promise<SubmitResult> {
  if (!QUOTE_ENDPOINT) return { ok: false, error: 'not_configured' }
  let res: Response
  try {
    res = await fetch(QUOTE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    })
  } catch {
    return { ok: false, error: 'network' }
  }

  let body: { ok?: boolean; id?: string; error?: string; fields?: FieldErrors } = {}
  try {
    body = await res.json()
  } catch {
    // Resposta sem JSON (ex.: rota inexistente em hospedagem sem funções).
  }

  if (res.ok && body.ok && typeof body.id === 'string') return { ok: true, id: body.id }
  if (res.status === 503 || body.error === 'not_configured') return { ok: false, error: 'not_configured' }
  if (res.status === 404 || res.status === 405) return { ok: false, error: 'not_configured' }
  if (res.status === 429) return { ok: false, error: 'rate_limited' }
  if (body.error === 'spam') return { ok: false, error: 'spam' }
  if (res.status === 422 || res.status === 400) return { ok: false, error: 'validation', fields: body.fields }
  return { ok: false, error: 'server' }
}
