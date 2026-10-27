// POST /functions/v1/create-order — valida o carrinho, recalcula tudo no servidor e cobra no Mercado Pago.
import { handleCreateOrder, parseCreateOrder } from '../_shared/handlers/createOrder.ts'
import { buildDeps } from '../_shared/server/deps.ts'
import { requireUser, serve } from '../_shared/server/http.ts'

serve(async (req) => {
  const userId = await requireUser(req)
  const input = parseCreateOrder(await req.json().catch(() => null))
  return handleCreateOrder(buildDeps(), userId, input)
})
