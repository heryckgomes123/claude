// POST /functions/v1/admin-order — painel: muda o status do pedido, avisa o cliente e estorna se pedido.
import { handleAdminOrder, parseAdminOrder } from '../_shared/handlers/adminOrder.ts'
import { buildDeps } from '../_shared/server/deps.ts'
import { requireUser, serve } from '../_shared/server/http.ts'

serve(async (req) => {
  const userId = await requireUser(req)
  return handleAdminOrder(buildDeps(), userId, parseAdminOrder(await req.json().catch(() => null)))
})
