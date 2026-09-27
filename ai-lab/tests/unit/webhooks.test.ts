import { describe, expect, it } from 'vitest'
import {
  kiwifySignature,
  parseHotmart,
  parseKiwify,
  productAllowed,
  verifyHotmartToken,
  verifyKiwifySignature,
} from '@/server/webhooks/parse'

const hotmart = (event: string, extra: Record<string, unknown> = {}) => ({
  id: 'evt-1',
  event,
  version: '2.0.0',
  data: {
    buyer: { email: ' Aluna@Teste.COM ', name: 'Aluna' },
    product: { id: 123, name: 'INTELRA AI LAB' },
    purchase: { transaction: 'HP111', status: 'APPROVED' },
    ...extra,
  },
})

describe('Hotmart', () => {
  it('libera acesso em compra aprovada/completa', () => {
    for (const event of ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE']) {
      const parsed = parseHotmart(hotmart(event))
      expect(parsed.action).toBe('GRANT')
      expect(parsed.email).toBe('aluna@teste.com')
      expect(parsed.externalRef).toBe('HP111')
      expect(parsed.productId).toBe('123')
      expect(parsed.eventId).toBe('evt-1')
    }
  })

  it('revoga em reembolso, chargeback, cancelamento e disputa', () => {
    for (const event of ['PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_CANCELED', 'PURCHASE_PROTEST'])
      expect(parseHotmart(hotmart(event)).action).toBe('REVOKE')
  })

  it('cancelamento de assinatura usa o e-mail do assinante e a data da próxima cobrança', () => {
    const parsed = parseHotmart({
      event: 'SUBSCRIPTION_CANCELLATION',
      data: { subscriber: { email: 'assinante@teste.com', name: 'A' }, product: { id: 9 }, date_next_charge: 1893456000000 },
    })
    expect(parsed.action).toBe('END_SUBSCRIPTION')
    expect(parsed.email).toBe('assinante@teste.com')
    expect(parsed.accessUntil?.toISOString()).toBe('2030-01-01T00:00:00.000Z')
  })

  it('ignora eventos sem efeito e payloads malformados sem lançar erro', () => {
    expect(parseHotmart(hotmart('PURCHASE_BILLET_PRINTED')).action).toBe('IGNORE')
    for (const junk of [null, 'texto', 42, [], { data: 'x' }]) expect(parseHotmart(junk).action).toBe('IGNORE')
    expect(parseHotmart({ event: 'PURCHASE_APPROVED', data: { buyer: { email: 'não-é-email' } } }).email).toBeNull()
  })

  it('compara o hottok de forma exata', () => {
    expect(verifyHotmartToken('segredo', 'segredo')).toBe(true)
    expect(verifyHotmartToken('segredo2', 'segredo')).toBe(false)
    expect(verifyHotmartToken(null, 'segredo')).toBe(false)
    expect(verifyHotmartToken('', 'segredo')).toBe(false)
  })
})

describe('Kiwify', () => {
  const order = (status: string, event: string) => ({
    order_id: 'kw-1',
    order_status: status,
    webhook_event_type: event,
    Customer: { email: 'Kiwi@Teste.com', full_name: 'Kiwi' },
    Product: { product_id: 'p1', product_name: 'LAB' },
  })

  it('libera acesso quando o pedido está pago', () => {
    const parsed = parseKiwify(order('paid', 'order_approved'))
    expect(parsed).toMatchObject({ action: 'GRANT', email: 'kiwi@teste.com', externalRef: 'kw-1', productId: 'p1' })
    expect(parsed.eventId).toBe('kw-1:order_approved')
  })

  it('revoga em reembolso e chargeback, encerra em assinatura cancelada', () => {
    expect(parseKiwify(order('refunded', 'order_refunded')).action).toBe('REVOKE')
    expect(parseKiwify(order('chargedback', 'chargeback')).action).toBe('REVOKE')
    expect(parseKiwify(order('paid', 'subscription_canceled')).action).toBe('END_SUBSCRIPTION')
    expect(parseKiwify(order('waiting_payment', 'pix_created')).action).toBe('IGNORE')
  })

  it('valida a assinatura HMAC-SHA1 do corpo bruto', () => {
    const body = JSON.stringify(order('paid', 'order_approved'))
    const signature = kiwifySignature(body, 'token')
    expect(verifyKiwifySignature(body, signature, 'token')).toBe(true)
    expect(verifyKiwifySignature(body, signature.toUpperCase(), 'token')).toBe(true)
    expect(verifyKiwifySignature(`${body} `, signature, 'token')).toBe(false)
    expect(verifyKiwifySignature(body, signature, 'outro-token')).toBe(false)
    expect(verifyKiwifySignature(body, null, 'token')).toBe(false)
  })
})

describe('filtro de produtos', () => {
  it('aceita qualquer produto quando a lista está vazia', () => {
    expect(productAllowed({ productId: 'x' }, [])).toBe(true)
    expect(productAllowed({ productId: null }, [])).toBe(true)
  })
  it('aceita apenas produtos da lista quando configurada', () => {
    expect(productAllowed({ productId: '123' }, ['123', '456'])).toBe(true)
    expect(productAllowed({ productId: '999' }, ['123'])).toBe(false)
    expect(productAllowed({ productId: null }, ['123'])).toBe(false)
  })
})
