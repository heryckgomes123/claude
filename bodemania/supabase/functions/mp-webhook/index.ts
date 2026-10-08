// POST /functions/v1/mp-webhook — notificações do Mercado Pago (sem JWT; autenticada pela assinatura x-signature).
import { handleMpWebhook } from '../_shared/handlers/webhook.ts'
import { buildDeps } from '../_shared/server/deps.ts'
import { serve } from '../_shared/server/http.ts'

serve(async (req) => {
  const url = new URL(req.url)
  const body = await req.json().catch(() => ({}))
  return handleMpWebhook(buildDeps(), {
    query: url.searchParams,
    headers: { signature: req.headers.get('x-signature'), requestId: req.headers.get('x-request-id') },
    body,
  })
})
