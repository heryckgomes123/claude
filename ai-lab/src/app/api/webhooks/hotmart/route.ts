import { webhookEnv } from '@/server/env'
import { parseHotmart, productAllowed, verifyHotmartToken } from '@/server/webhooks/parse'
import { processSale } from '@/server/webhooks/process'
import { parseJson, readBody, reject, respond } from '@/server/webhooks/http'

export const dynamic = 'force-dynamic'

/**
 * Webhook da Hotmart (versão 2.0).
 * Configure na Hotmart: Ferramentas → Webhook → URL {APP_URL}/api/webhooks/hotmart
 * e copie o "Hottok" da conta para a variável HOTMART_HOTTOK.
 */
export async function POST(request: Request) {
  const env = webhookEnv()
  if (!env.hotmartHottok) return reject('HOTMART', 'HOTMART_HOTTOK não configurado no servidor.', 503)

  const raw = await readBody(request)
  if (raw === null) return reject('HOTMART', 'Corpo da requisição muito grande.', 413)
  const payload = parseJson(raw)
  const bodyToken = (payload as { hottok?: unknown } | null)?.hottok
  const token = request.headers.get('x-hotmart-hottok') ?? (typeof bodyToken === 'string' ? bodyToken : null)
  if (!verifyHotmartToken(token, env.hotmartHottok)) return reject('HOTMART', 'Hottok inválido.')
  if (!payload) return reject('HOTMART', 'JSON inválido.', 400)

  const event = parseHotmart(payload)
  return respond(await processSale('HOTMART', event, productAllowed(event, env.hotmartProductIds)))
}
