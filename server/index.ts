/**
 * LIFT 2.0 — servidor mínimo da API.
 *
 * Hoje expõe apenas:
 *   GET  /api/health
 *   POST /api/ai/chat   → LIFT AI (Frontend → Backend → Provedor de IA)
 *
 * Segurança:
 * - A chave do provedor (AI_API_KEY) fica SOMENTE aqui, via variável de ambiente.
 * - Entradas são validadas e limitadas; há rate limit simples por IP.
 * - O contexto enviado pelo cliente NÃO é confiável. Enquanto não houver
 *   autenticação + banco, ele só é aceito com ALLOW_CLIENT_CONTEXT=true e é
 *   apresentado ao modelo como "dados informados pelo app, não verificados".
 *   Em produção: identificar o aluno pela sessão e buscar os dados no banco.
 *
 * Executar: npm run server  (lê .env automaticamente via --env-file, ver package.json)
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { getAIProvider, AIProviderError } from './ai/providers.js'
import { LIFT_AI_SYSTEM_PROMPT } from './ai/systemPrompt.js'

const PORT = Number(process.env.PORT ?? 8787)
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173'
const ALLOW_CLIENT_CONTEXT = process.env.ALLOW_CLIENT_CONTEXT === 'true'
const MAX_BODY = 64 * 1024
const MAX_MESSAGES = 20
const MAX_CHARS = 2000

// ── rate limit em memória (trocar por Redis/edge em produção) ──
const hits = new Map<string, { count: number; reset: number }>()
function rateLimited(ip: string, limit = 20, windowMs = 60_000) {
  const now = Date.now()
  const h = hits.get(ip)
  if (!h || h.reset < now) {
    hits.set(ip, { count: 1, reset: now + windowMs })
    return false
  }
  h.count++
  return h.count > limit
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(body))
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > MAX_BODY) throw new Error('payload_too_large')
    chunks.push(chunk as Buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

type ChatTurn = { role: 'user' | 'assistant'; content: string }

function validateMessages(input: unknown): ChatTurn[] | null {
  if (!Array.isArray(input) || input.length === 0) return null
  const out: ChatTurn[] = []
  for (const m of input.slice(-MAX_MESSAGES)) {
    if (!m || typeof m !== 'object') return null
    const { role, content } = m as Record<string, unknown>
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || !content.trim()) return null
    out.push({ role, content: content.slice(0, MAX_CHARS) })
  }
  // A API exige começar com "user"
  while (out.length && out[0].role !== 'user') out.shift()
  return out.length && out[out.length - 1].role === 'user' ? out : null
}

function sanitizeContext(ctx: unknown): string | null {
  if (!ALLOW_CLIENT_CONTEXT || !ctx || typeof ctx !== 'object') return null
  const json = JSON.stringify(ctx)
  return json.length > 12_000 ? json.slice(0, 12_000) : json
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
  if (req.method === 'OPTIONS') return send(res, 204, {})

  if (req.method === 'GET' && url.pathname === '/api/health') {
    return send(res, 200, { ok: true, ai: getAIProvider() ? 'configured' : 'not_configured' })
  }

  if (req.method === 'POST' && url.pathname === '/api/ai/chat') {
    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown'
    if (rateLimited(ip)) return send(res, 429, { error: 'rate_limited', message: 'Muitas mensagens. Aguarde um minuto.' })

    const provider = getAIProvider()
    if (!provider) return send(res, 503, { error: 'ai_not_configured', message: 'Provedor de IA não configurado no servidor.' })

    let body: Record<string, unknown>
    try {
      body = (await readJson(req)) as Record<string, unknown>
    } catch {
      return send(res, 400, { error: 'invalid_body' })
    }
    const messages = validateMessages(body.messages)
    if (!messages) return send(res, 400, { error: 'invalid_messages' })

    const ctx = sanitizeContext(body.context)
    const system = ctx
      ? `${LIFT_AI_SYSTEM_PROMPT}\n\n<dados_do_aluno origem="app, não verificados">\n${ctx}\n</dados_do_aluno>`
      : `${LIFT_AI_SYSTEM_PROMPT}\n\n(Nenhum dado do aluno disponível nesta conversa. Se a pergunta depender deles, diga isso.)`

    try {
      const content = await provider.chat(system, messages)
      return send(res, 200, { content })
    } catch (e) {
      const status = e instanceof AIProviderError ? e.status : 502
      console.error('[ai] erro:', e instanceof Error ? e.message : e)
      return send(res, status, { error: 'ai_error', message: 'Não foi possível responder agora.' })
    }
  }

  send(res, 404, { error: 'not_found' })
})

server.listen(PORT, () => {
  console.log(`LIFT API em http://localhost:${PORT}  ·  IA: ${getAIProvider() ? 'configurada' : 'NÃO configurada (defina AI_API_KEY)'}`)
})
