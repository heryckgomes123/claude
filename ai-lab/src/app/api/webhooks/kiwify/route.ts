import { webhookEnv } from '@/server/env'
import { parseKiwify, productAllowed, verifyKiwifySignature } from '@/server/webhooks/parse'
import { processSale } from '@/server/webhooks/process'
import { parseJson, readBody, reject, respond } from '@/server/webhooks/http'

export const dynamic = 'force-dynamic'

/**
 * Webhook da Kiwify.
 * Configure na Kiwify: Apps → Webhooks → URL {APP_URL}/api/webhooks/kiwify,
 * eventos de compra aprovada, reembolso, chargeback e assinatura cancelada;
 * copie o token gerado para a variável KIWIFY_WEBHOOK_TOKEN.
 */
export async function POST(request: Request) {
  const env = webhookEnv()
  if (!env.kiwifyToken) return reject('KIWIFY', 'KIWIFY_WEBHOOK_TOKEN não configurado no servidor.', 503)

  const raw = await readBody(request)
  if (raw === null) return reject('KIWIFY', 'Corpo da requisição muito grande.', 413)
  const signature = new URL(request.url).searchParams.get('signature')
  if (!verifyKiwifySignature(raw, signature, env.kiwifyToken)) return reject('KIWIFY', 'Assinatura inválida.')
  const payload = parseJson(raw)
  if (!payload) return reject('KIWIFY', 'JSON inválido.', 400)

  const event = parseKiwify(payload)
  return respond(await processSale('KIWIFY', event, productAllowed(event, env.kiwifyProductIds)))
}
