/**
 * POST /api/quote — recebe a solicitação de orçamento e grava no Supabase.
 *
 * Função serverless da Vercel (Node.js, assinatura Web Request/Response).
 * Em desenvolvimento, o Vite encaminha /api/quote para cá (ver vite.config.ts).
 *
 * Variáveis de ambiente (somente servidor — nunca use prefixo VITE_):
 *   SUPABASE_URL                 https://<projeto>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY    chave service_role (ou secret key sb_secret_…)
 *   QUOTE_IP_SALT                texto aleatório para anonimizar o IP no limite de envios
 */
import { LIMITS } from '../src/config/quote.js'
import { parseQuotePayload } from '../src/lib/quote/validation.js'

const TABLE = 'quote_requests'
const MAX_BODY_BYTES = 24_000
const RATE_LIMIT = { max: 5, windowMinutes: 60 }

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function supabaseConfig() {
  const url = (process.env.SUPABASE_URL ?? '').trim().replace(/\/$/, '')
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
  // HTTPS obrigatório (http só para testes locais em localhost).
  if (!/^(https:\/\/.+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/.test(url) || !key) return null
  const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' }
  // Chaves JWT (service_role legada) também vão no Authorization; secret keys novas só no apikey.
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`
  return { rest: `${url}/rest/v1`, headers }
}

async function hashIp(request: Request): Promise<string | null> {
  const forwarded = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? ''
  const ip = forwarded.split(',')[0]?.trim()
  if (!ip) return null
  const salt = process.env.QUOTE_IP_SALT ?? 'intelra'
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip}`))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(request: Request): Promise<Response> {
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) {
    return json(415, { ok: false, error: 'unsupported_media_type' })
  }

  const text = await request.text()
  if (text.length > MAX_BODY_BYTES) return json(413, { ok: false, error: 'too_large' })

  let input: unknown
  try {
    input = JSON.parse(text)
  } catch {
    return json(400, { ok: false, error: 'invalid_json' })
  }

  const parsed = parseQuotePayload(input)
  if (!parsed.ok) return json(422, { ok: false, error: 'validation', fields: parsed.errors })
  const payload = parsed.value

  // Proteção básica contra spam: campo-isca preenchido ou envio rápido demais.
  if (payload.website.trim() !== '' || Date.now() - payload.startedAt < LIMITS.minFillMs) {
    return json(422, { ok: false, error: 'spam' })
  }

  const db = supabaseConfig()
  if (!db) return json(503, { ok: false, error: 'not_configured' })

  const ipHash = await hashIp(request)

  try {
    if (ipHash) {
      const since = new Date(Date.now() - RATE_LIMIT.windowMinutes * 60_000).toISOString()
      const res = await fetch(
        `${db.rest}/${TABLE}?select=id&ip_hash=eq.${ipHash}&created_at=gte.${encodeURIComponent(since)}&idempotency_key=neq.${payload.idempotencyKey}`,
        { headers: { ...db.headers, Prefer: 'count=exact', Range: '0-0' } },
      )
      if (!res.ok && res.status !== 416) throw new Error(`rate_check_${res.status}`)
      const total = Number((res.headers.get('content-range') ?? '').split('/')[1] ?? '0')
      if (total >= RATE_LIMIT.max) return json(429, { ok: false, error: 'rate_limited' })
    }

    const row = {
      idempotency_key: payload.idempotencyKey,
      interest: payload.interest,
      services: payload.services,
      reference_ids: payload.references,
      direction: payload.direction,
      answers: payload.answers,
      budget: payload.contact.budget || null,
      budget_note: payload.contact.budgetNote || null,
      contact_name: payload.contact.name,
      company: payload.contact.company || null,
      contact_channel: payload.contact.channel,
      contact_whatsapp: payload.contact.whatsapp || null,
      contact_email: payload.contact.email || null,
      marketing_consent: payload.contact.marketingConsent,
      privacy_notice_version: payload.privacyNoticeVersion,
      ip_hash: ipHash,
      user_agent: (request.headers.get('user-agent') ?? '').slice(0, 300) || null,
      source_url: payload.sourceUrl || null,
    }

    const insert = await fetch(`${db.rest}/${TABLE}?select=id`, {
      method: 'POST',
      headers: { ...db.headers, Prefer: 'return=representation' },
      body: JSON.stringify(row),
    })

    if (insert.status === 409) {
      // Mesma solicitação reenviada (duplo clique, nova tentativa): devolve o registro existente.
      const existing = await fetch(`${db.rest}/${TABLE}?select=id&idempotency_key=eq.${payload.idempotencyKey}`, { headers: db.headers })
      const rows = existing.ok ? ((await existing.json()) as { id: string }[]) : []
      if (rows[0]?.id) return json(200, { ok: true, id: rows[0].id, duplicate: true })
      throw new Error('duplicate_lookup_failed')
    }

    if (!insert.ok) throw new Error(`insert_${insert.status}`)
    const created = (await insert.json()) as { id: string }[]
    if (!created[0]?.id) throw new Error('insert_without_id')
    return json(201, { ok: true, id: created[0].id })
  } catch (error) {
    // Registra só o motivo técnico — nunca dados do formulário.
    console.error('[quote] storage error:', error instanceof Error ? error.message : 'unknown')
    return json(502, { ok: false, error: 'storage_failed' })
  }
}
