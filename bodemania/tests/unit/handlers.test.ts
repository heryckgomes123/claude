import { beforeEach, describe, expect, it } from 'vitest'
import { handleAdminOrder, parseAdminOrder } from '../../supabase/functions/_shared/handlers/adminOrder.ts'
import { handleCreateOrder, parseCreateOrder, type CreateOrderInput } from '../../supabase/functions/_shared/handlers/createOrder.ts'
import { AppError } from '../../supabase/functions/_shared/handlers/ports.ts'
import { handleShippingQuote } from '../../supabase/functions/_shared/handlers/shipping.ts'
import { handleMpWebhook } from '../../supabase/functions/_shared/handlers/webhook.ts'
import { signMpManifest } from '../../supabase/functions/_shared/mercadopago.ts'
import { sampleSTL } from '../../supabase/functions/_shared/print3d.ts'
import { OTHER, USER, harness, type Harness } from './fakes.ts'

let h: Harness
beforeEach(() => {
  h = harness()
  h.repo.coupons.set('BEMVINDO10', { code: 'BEMVINDO10', label: '10% de boas-vindas', percent: 0.1 })
  h.repo.coupons.set('FRETEGRATIS', { code: 'FRETEGRATIS', label: 'Frete grátis', freeShipping: true, min: 150 })
})

let n = 0
const order = (over: Partial<CreateOrderInput> = {}): CreateOrderInput => ({
  idempotencyKey: `idem-${++n}-aaaaaaaa`,
  lines: [{ productId: 'avental', qty: 1, options: { rito: 'reaa' } }],
  addressId: 'addr-1',
  shippingId: 'pac',
  payment: { method: 'pix' },
  ...over,
})
const card = (over: Partial<NonNullable<CreateOrderInput['payment']['card']>> = {}) => ({
  method: 'card' as const,
  card: { token: 'tok_123', installments: 1, paymentMethodId: 'visa', ...over },
})
const code = async (p: Promise<unknown>) => p.then(() => 'ok', (e: AppError) => e.code)

describe('criar pedido', () => {
  it('Pix: preço vem do banco, Pix com 5% off, estoque reservado, e-mail enviado', async () => {
    const r = await handleCreateOrder(h.deps, USER, order())
    expect(r.status).toBe(201)
    const body = r.body as any
    expect(body.orderId).toBe('BM-10420')
    expect(body.payment.pixCode).toBe('00020126PIXCODE')
    const o = h.repo.orders.get('BM-10420')!
    // R$ 200 + PAC R$ 31,90 (abaixo do frete grátis) − 5% de R$ 200 = 221,90
    expect(o).toMatchObject({ subtotal: 200, shipping: 31.9, pix_discount: 10, total: 221.9, status: 'aguardando' })
    expect(h.repo.products.get('avental')!.stock).toBe(9)
    expect(h.mpCalls[0].body).toMatchObject({ transaction_amount: 221.9, payment_method_id: 'pix', external_reference: 'BM-10420' })
    expect(h.sent.map((s) => s.mail.subject)).toEqual(['Recebemos o seu pedido BM-10420'])
    expect(h.sent[0].mail.html).toContain('00020126PIXCODE')
  })

  it('o cliente não consegue mandar preço: opção cara custa mais, personalização soma', async () => {
    const r = await handleCreateOrder(h.deps, USER, order({ lines: [{ productId: 'avental', qty: 2, options: { rito: 'york' }, personalization: 'J.A.S.' }], shippingId: 'pickup', addressId: 'addr-sp' }))
    expect((r.body as any).orderId).toBeDefined()
    expect(h.repo.orders.get('BM-10420')!.subtotal).toBe(490) // (200 + 20 + 25) × 2
  })

  it('frete grátis no PAC a partir de R$ 299; cupom de frete grátis a partir de R$ 150', async () => {
    await handleCreateOrder(h.deps, USER, order({ lines: [{ productId: 'avental', qty: 2, options: { rito: 'reaa' } }] }))
    expect(h.repo.orders.get('BM-10420')!.shipping).toBe(0)
    h.repo.products.get('avental')!.price = 160
    await handleCreateOrder(h.deps, USER, order({ coupon: 'fretegratis' }))
    const o = h.repo.orders.get('BM-10421')!
    expect(o).toMatchObject({ shipping: 0, coupon: 'FRETEGRATIS' })
  })

  it('cupom inválido, produto inativo, estoque e opção inválida são recusados SEM reservar estoque', async () => {
    expect(await code(handleCreateOrder(h.deps, USER, order({ coupon: 'NAOEXISTE' })))).toBe('coupon_invalid')
    h.repo.products.get('avental')!.stock = 1
    expect(await code(handleCreateOrder(h.deps, USER, order({ lines: [{ productId: 'avental', qty: 2, options: { rito: 'reaa' } }] })))).toBe('out_of_stock')
    expect(h.repo.products.get('avental')!.stock).toBe(1)
    expect(await code(handleCreateOrder(h.deps, USER, order({ lines: [{ productId: 'avental', qty: 1, options: { rito: 'xx' } }] })))).toBe('bad_selection')
    h.repo.products.get('avental')!.active = false
    expect(await code(handleCreateOrder(h.deps, USER, order()))).toBe('product_unavailable')
    expect(h.repo.orders.size).toBe(0)
  })

  it('exige endereço do próprio cliente; produto digital dispensa endereço e frete', async () => {
    expect(await code(handleCreateOrder(h.deps, USER, order({ addressId: undefined })))).toBe('address_required')
    expect(await code(handleCreateOrder(h.deps, USER, order({ addressId: 'addr-other' })))).toBe('address_required')
    const r = await handleCreateOrder(h.deps, USER, order({ lines: [{ productId: 'digital', qty: 1, options: {} }], addressId: undefined, shippingId: 'digital' }))
    expect((r.body as any).orderId).toBeDefined()
    expect(h.repo.orders.get('BM-10420')).toMatchObject({ digital_only: true, shipping: 0, total: 180.5 })
  })

  it('entrega indisponível: retirada só em SP; frete inexistente é recusado', async () => {
    expect(await code(handleCreateOrder(h.deps, USER, order({ shippingId: 'pickup' })))).toBe('shipping_unavailable')
    expect(await code(handleCreateOrder(h.deps, USER, order({ shippingId: 'sedex', addressId: 'addr-sp' })))).toBe('ok')
  })

  it('usa a tabela de contingência quando o Melhor Envio cai', async () => {
    h.failShipping = true
    const r = await handleCreateOrder(h.deps, USER, order())
    expect(r.status).toBe(201)
    expect(h.logs.some((l) => l.startsWith('shipping_quote_failed'))).toBe(true)
  })

  it('se o valor mudou desde que o cliente viu na tela, NADA é cobrado nem reservado', async () => {
    h.repo.products.get('avental')!.price = 250 // preço subiu no painel enquanto o cliente decidia
    const e = await handleCreateOrder(h.deps, USER, order({ expectedTotal: 221.9 })).catch((x) => x)
    expect(e).toMatchObject({ code: 'total_changed', status: 409 })
    expect(h.repo.orders.size).toBe(0)
    expect(h.mpCalls).toHaveLength(0)
    expect(h.repo.products.get('avental')!.stock).toBe(10)
    const ok = await handleCreateOrder(h.deps, USER, order({ expectedTotal: 250 + 31.9 - 12.5 }))
    expect(ok.status).toBe(201)
  })

  it('após cartão recusado, repetir com a mesma chave cria um pedido novo (não devolve o cancelado)', async () => {
    h.setMp((b) => ({ id: 80, status: 'rejected', status_detail: 'cc_rejected_other_reason', external_reference: b.external_reference }))
    const i = order({ payment: card() })
    await handleCreateOrder(h.deps, USER, i).catch(() => null)
    h.setMp((b) => ({ id: 81, status: 'approved', external_reference: b.external_reference, transaction_amount: b.transaction_amount }))
    const r = await handleCreateOrder(h.deps, USER, i)
    expect(r.status).toBe(201)
    expect((r.body as any).orderId).toBe('BM-10421')
  })

  it('cliente com cadastro incompleto não compra; visitante não existe', async () => {
    h.repo.profiles.get(USER)!.cpf = ''
    expect(await code(handleCreateOrder(h.deps, USER, order()))).toBe('profile_incomplete')
    expect(await code(handleCreateOrder(h.deps, 'ninguem', order()))).toBe('unauthorized')
  })

  it('o mesmo envio repetido (duplo clique) devolve o mesmo pedido e não cobra de novo', async () => {
    const input = order()
    const a = await handleCreateOrder(h.deps, USER, input)
    const b = await handleCreateOrder(h.deps, USER, input)
    expect((a.body as any).orderId).toBe((b.body as any).orderId)
    expect(h.repo.orders.size).toBe(1)
    expect(h.mpCalls).toHaveLength(1)
    expect(h.repo.products.get('avental')!.stock).toBe(9)
  })

  it('se o Mercado Pago falhar, o pedido é cancelado e o estoque volta', async () => {
    h.setMp(() => {
      throw new Error('MP 500')
    })
    expect(await code(handleCreateOrder(h.deps, USER, order()))).toBe('payment_unavailable')
    expect(h.repo.orders.get('BM-10420')!.status).toBe('cancelado')
    expect(h.repo.products.get('avental')!.stock).toBe(10)
  })

  it('pagamentos desligados (sem chave do Mercado Pago) avisam em vez de quebrar', async () => {
    h.deps.config.paymentsEnabled = false
    expect(await code(handleCreateOrder(h.deps, USER, order()))).toBe('payments_not_configured')
  })

  describe('cartão', () => {
    it('aprovado na hora → pedido pago, e-mails de recebido + pago + aviso à loja', async () => {
      const r = await handleCreateOrder(h.deps, USER, order({ payment: card({ installments: 3 }) }))
      expect((r.body as any).status).toBe('pago')
      expect(h.sent.map((s) => s.mail.subject)).toEqual(['Recebemos o seu pedido BM-10420', 'Pagamento confirmado — pedido BM-10420', expect.stringMatching(/Novo pedido pago BM-10420/)])
      expect(h.sent[2].to).toBe('dono@bodemania.com.br')
      expect(h.mpCalls[0].body).toMatchObject({ token: 'tok_123', installments: 3, payment_method_id: 'visa', transaction_amount: 231.9 })
    })
    it('recusado → erro claro, pedido cancelado, estoque devolvido', async () => {
      h.setMp((b) => ({ id: 77, status: 'rejected', status_detail: 'cc_rejected_insufficient_amount', external_reference: b.external_reference }))
      const err = await handleCreateOrder(h.deps, USER, order({ payment: card() })).catch((e) => e)
      expect(err).toMatchObject({ code: 'card_rejected', status: 402, message: expect.stringMatching(/Saldo/) })
      expect(h.repo.orders.get('BM-10420')!.status).toBe('cancelado')
      expect(h.repo.products.get('avental')!.stock).toBe(10)
    })
    it('em análise → fica aguardando até o webhook', async () => {
      h.setMp((b) => ({ id: 78, status: 'in_process', external_reference: b.external_reference, transaction_amount: b.transaction_amount }))
      const r = await handleCreateOrder(h.deps, USER, order({ payment: card() }))
      expect((r.body as any).status).toBe('aguardando')
    })
    it('limita as parcelas ao valor mínimo de R$ 30 e ao máximo de 6', async () => {
      expect(await code(handleCreateOrder(h.deps, USER, order({ payment: card({ installments: 7 }) })))).toBe('bad_request')
      expect(await code(handleCreateOrder(h.deps, USER, order({ payment: card({ installments: 6 }) })))).toBe('ok')
    })
  })

  describe('uploads do cliente', () => {
    it('foto só vale se estiver na pasta do próprio cliente', async () => {
      const line = (path: string) => ({ productId: 'litho', qty: 1, options: {}, photoPath: path })
      expect(await code(handleCreateOrder(h.deps, USER, order({ lines: [line(`${OTHER}/a.jpg`)] })))).toBe('bad_request')
      expect(await code(handleCreateOrder(h.deps, USER, order({ lines: [line(`${USER}/../${OTHER}/a.jpg`)] })))).toBe('bad_request')
      expect(await code(handleCreateOrder(h.deps, USER, order({ lines: [{ productId: 'litho', qty: 1, options: {} }] })))).toBe('bad_selection')
      expect(await code(handleCreateOrder(h.deps, USER, order({ lines: [line(`${USER}/a.jpg`)] })))).toBe('ok')
    })

    const print = (over: Record<string, unknown> = {}) => ({
      productId: 's01', qty: 1, options: {},
      print: { filePath: `${USER}/vaso.stl`, fileName: 'vaso.stl', scale: 100, material: 'pla', quality: 'padrao', infill: 25, color: 'preto', ...over },
    })

    it('impressão 3D: o preço é recalculado a partir do arquivo enviado, nunca do navegador', async () => {
      h.files.set(`${USER}/vaso.stl`, sampleSTL())
      const r = await handleCreateOrder(h.deps, USER, order({ lines: [print()], payment: { method: 'pix' } }))
      expect(r.status).toBe(201)
      const o = h.repo.orders.get('BM-10420')!
      expect(o.items[0].unit_price).toBeGreaterThan(29)
      expect(o.items[0].name).toContain('vaso.stl')
      const small = o.items[0].unit_price
      // o dobro da escala (8× o volume) tem de custar bem mais
      await handleCreateOrder(h.deps, USER, order({ lines: [print({ scale: 200 })] }))
      expect(h.repo.orders.get('BM-10421')!.items[0].unit_price).toBeGreaterThan(small * 3)
    })
    it('arquivo de outro cliente, inexistente ou inválido é recusado; peça gigante também', async () => {
      h.files.set(`${OTHER}/x.stl`, sampleSTL())
      expect(await code(handleCreateOrder(h.deps, USER, order({ lines: [print({ filePath: `${OTHER}/x.stl` })] })))).toBe('bad_request')
      expect(await code(handleCreateOrder(h.deps, USER, order({ lines: [print({ filePath: `${USER}/nao-existe.stl` })] })))).toBe('file_missing')
      h.files.set(`${USER}/lixo.stl`, new TextEncoder().encode('isto não é um stl').buffer as ArrayBuffer)
      expect(await code(handleCreateOrder(h.deps, USER, order({ lines: [print({ filePath: `${USER}/lixo.stl` })] })))).toBe('file_invalid')
      h.files.set(`${USER}/vaso.stl`, sampleSTL())
      expect(await code(handleCreateOrder(h.deps, USER, order({ lines: [print({ scale: 300 })] })))).toBe('print_too_large')
    })
    it('o produto "impressão 3D" não pode ser comprado sem orçamento', async () => {
      expect(await code(handleCreateOrder(h.deps, USER, order({ lines: [{ productId: 's01', qty: 1, options: {} }] })))).toBe('bad_request')
      expect(await code(handleCreateOrder(h.deps, USER, order({ lines: [{ productId: 'avental', qty: 1, options: { rito: 'reaa' }, print: print().print } as never] })))).toBe('bad_request')
    })
    it('sem arquivo: aceita medidas aproximadas e marca como estimativa', async () => {
      const r = await handleCreateOrder(h.deps, USER, order({ lines: [{ productId: 's01', qty: 1, options: {}, print: { manual: { x: 80, y: 60, z: 50, fill: 0.45 }, scale: 100, material: 'pla', quality: 'padrao', infill: 25, color: 'preto' } }] }))
      expect(r.status).toBe(201)
    })
  })
})

describe('validação da entrada', () => {
  it('rejeita corpo malformado', () => {
    expect(() => parseCreateOrder(null)).toThrow()
    expect(() => parseCreateOrder({ idempotencyKey: 'x', lines: [] })).toThrow()
    expect(() => parseCreateOrder({ idempotencyKey: 'abcdefgh', lines: [{ productId: 'a', qty: 0, options: {} }], shippingId: 'pac', payment: { method: 'pix' } })).toThrow()
    expect(() => parseCreateOrder({ idempotencyKey: 'abcdefgh', lines: [{ productId: 'a', qty: 1, options: {} }], shippingId: 'drone', payment: { method: 'pix' } })).toThrow()
    expect(() => parseCreateOrder({ idempotencyKey: 'abcdefgh', lines: [{ productId: 'a', qty: 1, options: {} }], shippingId: 'pac', payment: { method: 'card' } })).toThrow()
  })
  it('descarta campos estranhos (preço, total, status) enviados pelo navegador', () => {
    const parsed = parseCreateOrder({
      idempotencyKey: 'abcdefgh', total: 1, status: 'pago',
      lines: [{ productId: 'a', qty: 1, options: { x: 'y' }, price: 0.01, unitPrice: 0.01 }], shippingId: 'pac', payment: { method: 'pix' },
    })
    expect(JSON.stringify(parsed)).not.toMatch(/0\.01|"total"|"status"/)
  })
})

describe('webhook do Mercado Pago', () => {
  async function notify(id: string, secret = 'segredo', opts: { type?: string; sig?: string | null } = {}) {
    const sig = opts.sig === undefined ? await signMpManifest(secret, id, 'req-1', '1700000000') : opts.sig
    return handleMpWebhook(h.deps, {
      query: new URLSearchParams({ 'data.id': id, type: opts.type ?? 'payment' }),
      headers: { signature: sig, requestId: 'req-1' },
      body: { type: opts.type ?? 'payment', data: { id } },
    })
  }

  async function pixOrder() {
    await handleCreateOrder(h.deps, USER, order())
    h.sent.length = 0
    return h.repo.orders.get('BM-10420')!
  }

  it('assinatura inválida ou ausente → 401 e nada muda', async () => {
    const o = await pixOrder()
    h.payments.set('9001', { id: 9001, status: 'approved', external_reference: o.id, transaction_amount: o.total })
    expect(await code(notify('9001', 'segredo', { sig: 'ts=1,v1=00' }))).toBe('invalid_signature')
    expect(await code(notify('9001', 'segredo', { sig: null }))).toBe('invalid_signature')
    expect(await code(notify('9001', 'outro-segredo'))).toBe('invalid_signature')
    expect(o.status).toBe('aguardando')
  })

  it('Pix aprovado → pago, e-mail ao cliente e à loja; repetir a notificação não repete nada', async () => {
    const o = await pixOrder()
    h.payments.set('9001', { id: 9001, status: 'approved', external_reference: o.id, transaction_amount: o.total })
    const r = await notify('9001')
    expect(r.body).toMatchObject({ status: 'pago' })
    expect(h.sent.map((s) => s.to)).toEqual(['ana@exemplo.com', 'dono@bodemania.com.br'])
    await notify('9001')
    expect(h.sent).toHaveLength(2)
  })

  it('NÃO confia no corpo: consulta o pagamento no Mercado Pago (valor menor não paga o pedido)', async () => {
    const o = await pixOrder()
    h.payments.set('9001', { id: 9001, status: 'approved', external_reference: o.id, transaction_amount: 1 })
    const r = await notify('9001')
    expect(r.body).toMatchObject({ ignored: 'amount_mismatch' })
    expect(o.status).toBe('aguardando')
    expect(h.logs.some((l) => l.startsWith('mp_amount_mismatch'))).toBe(true)
  })

  it('pagamento aprovado depois do cancelamento é estornado automaticamente', async () => {
    const o = await pixOrder()
    o.status = 'cancelado'
    h.payments.set('9001', { id: 9001, status: 'approved', external_reference: o.id, transaction_amount: o.total })
    await notify('9001')
    expect(h.refunds).toEqual(['9001'])
    expect(o.status).toBe('cancelado')
  })

  it('ignora outros tópicos, pedidos desconhecidos e pagamentos sem referência', async () => {
    expect((await notify('1', 'segredo', { type: 'merchant_order' })).body).toMatchObject({ ignored: true })
    h.payments.set('5', { id: 5, status: 'approved', external_reference: 'BM-99999', transaction_amount: 10 })
    expect((await notify('5')).body).toMatchObject({ ignored: 'unknown_order' })
    h.payments.set('6', { id: 6, status: 'approved' })
    expect((await notify('6')).body).toMatchObject({ ignored: 'no_reference' })
  })

  it('sem segredo configurado, recusa tudo (nunca aceita webhook sem verificar)', async () => {
    h.deps.config.mpWebhookSecret = undefined
    expect(await code(notify('1'))).toBe('webhook_not_configured')
  })
})

describe('painel da loja', () => {
  const ADMIN = 'admin-1'
  async function paidOrder() {
    await handleCreateOrder(h.deps, USER, order({ payment: card() }))
    h.sent.length = 0
    return h.repo.orders.get('BM-10420')!
  }
  const set = (status: any, extra: Record<string, unknown> = {}) => handleAdminOrder(h.deps, ADMIN, parseAdminOrder({ orderId: 'BM-10420', status, ...extra }))

  it('só administrador muda status', async () => {
    await paidOrder()
    expect(await code(handleAdminOrder(h.deps, USER, parseAdminOrder({ orderId: 'BM-10420', status: 'producao' })))).toBe('forbidden')
    expect(await code(handleAdminOrder(h.deps, 'ninguem', parseAdminOrder({ orderId: 'BM-10420', status: 'producao' })))).toBe('forbidden')
  })

  it('produção → enviado (exige rastreio) → entregue, avisando o cliente a cada passo', async () => {
    await paidOrder()
    await set('producao')
    expect(await code(set('enviado'))).toBe('tracking_required')
    await set('enviado', { tracking: 'pc123456789br' })
    await set('entregue')
    expect(h.repo.orders.get('BM-10420')).toMatchObject({ status: 'entregue', tracking: 'PC123456789BR' })
    expect(h.sent.map((s) => s.mail.subject)).toEqual(['Seu pedido BM-10420 está em produção', 'Seu pedido BM-10420 foi enviado', 'Pedido BM-10420 entregue'])
    expect(h.sent[1].mail.html).toContain('PC123456789BR')
  })

  it('não anda para trás nem reabre pedido encerrado', async () => {
    await paidOrder()
    await set('producao')
    expect(await code(set('pago'))).toBe('invalid_transition')
  })

  it('cancelar pedido pago pode estornar no Mercado Pago', async () => {
    await paidOrder()
    const r = await set('cancelado', { refund: true, note: 'Cliente desistiu' })
    expect(r.body).toMatchObject({ status: 'cancelado', refunded: true })
    expect(h.refunds).toEqual(['9001'])
    expect(h.repo.products.get('avental')!.stock).toBe(10)
    expect(h.sent[0].mail.subject).toBe('Pedido BM-10420 cancelado')
  })

  it('retirada no ateliê e entrega digital não pedem rastreio', async () => {
    await handleCreateOrder(h.deps, USER, order({ shippingId: 'pickup', addressId: 'addr-sp', payment: card() }))
    await set('enviado')
    expect(h.sent.at(-1)!.mail.subject).toBe('Pedido BM-10420 pronto para retirada')
  })

  it('valida a entrada', () => {
    expect(() => parseAdminOrder({ orderId: "BM-1'; drop table orders;--", status: 'pago' })).toThrow()
    expect(() => parseAdminOrder({ orderId: 'BM-10420', status: 'hackeado' })).toThrow()
  })
})

describe('cotação de frete', () => {
  it('devolve as opções para o CEP, com a fonte da cotação', async () => {
    const r = await handleShippingQuote(h.deps, { cep: '20040-020', items: [{ productId: 'avental', qty: 1 }] })
    expect((r.body as any).options.map((o: any) => o.id)).toEqual(['pac', 'sedex'])
    expect((r.body as any).source).toBe('melhor-envio')
  })
  it('cai na tabela de contingência quando o Melhor Envio falha', async () => {
    h.failShipping = true
    const r = await handleShippingQuote(h.deps, { cep: '01310100', items: [{ productId: 'avental', qty: 1 }] })
    expect((r.body as any).source).toBe('tabela')
    expect((r.body as any).options.map((o: any) => o.id)).toContain('pickup')
  })
  it('CEP inválido e carrinho vazio', async () => {
    expect(await code(handleShippingQuote(h.deps, { cep: '123', items: [{ productId: 'avental', qty: 1 }] }))).toBe('invalid_cep')
    expect(await code(handleShippingQuote(h.deps, { cep: '01310100', items: [] }))).toBe('bad_request')
    expect(await code(handleShippingQuote(h.deps, { cep: '00000000', items: [{ productId: 'avental', qty: 1 }] }))).toBe('invalid_cep')
  })
  it('só produtos digitais não têm frete', async () => {
    const r = await handleShippingQuote(h.deps, { cep: '01310100', items: [{ productId: 'digital', qty: 1 }] })
    expect((r.body as any).options[0].id).toBe('digital')
  })
  it('cupom de frete grátis zera o PAC', async () => {
    const r = await handleShippingQuote(h.deps, { cep: '20040020', coupon: 'FRETEGRATIS', items: [{ productId: 'avental', qty: 1 }] })
    expect((r.body as any).options[0]).toMatchObject({ id: 'pac', price: 0 })
  })
})
