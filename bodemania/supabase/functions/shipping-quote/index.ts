// POST /functions/v1/shipping-quote — cotação de frete (Correios via Melhor Envio) para o carrinho. Aberta a visitantes.
import { handleShippingQuote, type ShippingQuoteInput } from '../_shared/handlers/shipping.ts'
import { buildDeps } from '../_shared/server/deps.ts'
import { serve } from '../_shared/server/http.ts'

serve(async (req) => handleShippingQuote(buildDeps(), (await req.json().catch(() => ({}))) as ShippingQuoteInput))
