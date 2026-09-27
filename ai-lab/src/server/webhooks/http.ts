import 'server-only'
import type { GrantSource } from '../db/schema'
import { consumeRateLimit } from '../rate-limit'
import { logWebhook, type Outcome } from './process'

const MAX_BODY_BYTES = 256 * 1024

/** Lê o corpo bruto com limite de tamanho (a assinatura da Kiwify é calculada sobre ele). */
export async function readBody(request: Request): Promise<string | null> {
  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > MAX_BODY_BYTES) return null
  const text = await request.text()
  return text.length > MAX_BODY_BYTES ? null : text
}

export function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Requisição não autenticada: registra (com limite, para não encher o banco) e responde 401. */
export async function reject(provider: GrantSource, reason: string, status = 401) {
  if (await consumeRateLimit(`webhook-rejected:${provider}`, 30, 60 * 60).catch(() => false))
    await logWebhook({ provider, eventType: 'REJEITADO', outcome: 'REJECTED', detail: reason }).catch(() => {})
  return Response.json({ ok: false, error: reason }, { status, headers: { 'cache-control': 'no-store' } })
}

/** ERROR responde 500 para a plataforma reenviar; o resto confirma o recebimento. */
export function respond(outcome: Outcome) {
  return Response.json(
    { ok: outcome !== 'ERROR', outcome },
    { status: outcome === 'ERROR' ? 500 : 200, headers: { 'cache-control': 'no-store' } },
  )
}
