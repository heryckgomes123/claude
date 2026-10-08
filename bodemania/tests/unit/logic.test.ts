import { describe, expect, it } from 'vitest'
import { signMpManifest, verifyMpSignature, buildPaymentBody, paymentView, rejectionMessage } from '../../supabase/functions/_shared/mercadopago.ts'
import { addBusinessDays, toBrasiliaIso } from '../../supabase/functions/_shared/money.ts'
import { selectionError, unitPriceOf } from '../../supabase/functions/_shared/pricing.ts'
import { buildShippingOptions, heuristicQuote, melhorEnvioBody, parseMelhorEnvio, ufFromCep } from '../../supabase/functions/_shared/shippingRules.ts'
import { computeTotals, couponDiscount } from '../../supabase/functions/_shared/totals.ts'
import { isCPF, isExpiryValid, luhn } from '../../supabase/functions/_shared/validate.ts'
import { quotePrint, parseSTL, sampleSTL } from '../../supabase/functions/_shared/print3d.ts'
import { aventalComRito } from './fakes.ts'
import { waNumber } from '../../src/lib/format.ts'

describe('preço', () => {
  it('soma opções e personalização só quando preenchida', () => {
    expect(unitPriceOf(aventalComRito, { rito: 'reaa' })).toBe(200)
    expect(unitPriceOf(aventalComRito, { rito: 'york' })).toBe(220)
    expect(unitPriceOf(aventalComRito, { rito: 'york' }, 'J.A.S.')).toBe(245)
    expect(unitPriceOf(aventalComRito, { rito: 'york' }, '   ')).toBe(220)
  })
  it('recusa opção inexistente, texto grande demais e foto ausente', () => {
    expect(selectionError(aventalComRito, { rito: 'zzz' }, undefined, false)).toMatch(/rito/i)
    expect(selectionError(aventalComRito, { rito: 'reaa' }, 'ABCDEFGH', false)).toMatch(/passa de 6/)
    expect(selectionError(aventalComRito, { rito: 'reaa' }, 'ABC', false)).toBeNull()
    expect(selectionError({ name: 'L', photoUpload: { label: 'f', required: true } }, {}, undefined, false)).toMatch(/foto/i)
  })
})

describe('cupom e totais', () => {
  const ten = { code: 'X', label: 'x', percent: 0.1 }
  it('desconto percentual, fixo, mínimo e teto', () => {
    expect(couponDiscount(ten, 200)).toBe(20)
    expect(couponDiscount({ code: 'A', label: 'a', amount: 500 }, 200)).toBe(200)
    expect(couponDiscount({ code: 'M', label: 'm', percent: 0.15, min: 400 }, 300)).toBe(0)
    expect(couponDiscount(null, 200)).toBe(0)
  })
  it('Pix desconta 5% só dos produtos, não do frete', () => {
    expect(computeTotals({ subtotal: 200, coupon: ten, shipping: 30, pix: true, pixRate: 0.05 })).toEqual({ subtotal: 200, discount: 20, goods: 180, pixDiscount: 9, shipping: 30, total: 201 })
    expect(computeTotals({ subtotal: 200, coupon: null, shipping: 30, pix: false, pixRate: 0.05 }).total).toBe(230)
  })
  it('arredonda centavos', () => {
    expect(computeTotals({ subtotal: 33.33, coupon: ten, shipping: 0, pix: true, pixRate: 0.05 }).total).toBe(28.5)
  })
})

describe('frete', () => {
  it('UF pelo CEP', () => {
    expect(ufFromCep('01310-100')).toBe('SP')
    expect(ufFromCep('20040020')).toBe('RJ')
    expect(ufFromCep('90010000')).toBe('RS')
    expect(ufFromCep('00000000')).toBeNull()
  })
  it('PAC grátis acima do mínimo ou com cupom; SEDEX nunca; retirada só no estado da origem', () => {
    const raw = heuristicQuote('01310100', 'SP', 1)
    const paid = buildShippingOptions(raw, { originCep: '01310100', destUf: 'SP', goods: 100, freeShippingFrom: 299, freeShippingCoupon: false })
    expect(paid.map((o) => o.id)).toEqual(['pac', 'sedex', 'pickup'])
    expect(paid[0].price).toBeGreaterThan(0)
    const free = buildShippingOptions(raw, { originCep: '01310100', destUf: 'RJ', goods: 300, freeShippingFrom: 299, freeShippingCoupon: false })
    expect(free.map((o) => o.id)).toEqual(['pac', 'sedex'])
    expect(free[0].price).toBe(0)
    expect(free[1].price).toBeGreaterThan(0)
    expect(buildShippingOptions(raw, { originCep: '01310100', destUf: 'RJ', goods: 10, freeShippingFrom: 299, freeShippingCoupon: true })[0].price).toBe(0)
  })
  it('origem em Dourados/MS: retirada só para MS e frete de São Paulo é de outra região', () => {
    const ms = buildShippingOptions(heuristicQuote('79823030', 'MS', 1), { originCep: '79823030', destUf: 'MS', goods: 100, freeShippingFrom: 299, freeShippingCoupon: false })
    expect(ms.map((o) => o.id)).toEqual(['pac', 'sedex', 'pickup'])
    expect(ms[2].detail).toContain('Dourados/MS')
    const sp = buildShippingOptions(heuristicQuote('79823030', 'SP', 1), { originCep: '79823030', destUf: 'SP', goods: 100, freeShippingFrom: 299, freeShippingCoupon: false })
    expect(sp.map((o) => o.id)).toEqual(['pac', 'sedex'])
    expect(ufFromCep('79823030')).toBe('MS')
  })
  it('lê a resposta do Melhor Envio e ignora serviços com erro ou desconhecidos', () => {
    const raw = parseMelhorEnvio([
      { id: 1, name: 'PAC', price: '23.50', custom_price: '25.10', delivery_time: 5, custom_delivery_time: 6 },
      { id: 2, name: 'SEDEX', price: '48.00', delivery_time: 2 },
      { id: 3, name: '.Package', price: '20.00', delivery_time: 4 },
      { id: 4, error: 'Serviço indisponível' },
    ])
    expect(raw).toEqual([{ id: 'pac', price: 25.1, days: 6 }, { id: 'sedex', price: 48, days: 2 }])
    expect(parseMelhorEnvio({ message: 'Unauthenticated' })).toEqual([])
  })
  it('corpo do Melhor Envio respeita os mínimos dos Correios', () => {
    const b = melhorEnvioBody('01310-100', '20040020', [{ id: 'p', qty: 2, weight: 0.03, widthCm: 3, heightCm: 1, lengthCm: 5, unitPrice: 24.9 }])
    expect(b.to.postal_code).toBe('20040020')
    expect(b.products[0]).toMatchObject({ width: 11, height: 2, length: 16, weight: 0.1, quantity: 2, insurance_value: 24.9 })
  })
})

describe('Mercado Pago', () => {
  const secret = 's3gr3d0'
  it('aceita assinatura válida e rejeita adulterada, vazia ou de outro segredo', async () => {
    const sig = await signMpManifest(secret, '123456', 'req-1', '1700000000')
    expect(await verifyMpSignature({ secret, signature: sig, requestId: 'req-1', dataId: '123456' })).toBe(true)
    expect(await verifyMpSignature({ secret, signature: sig, requestId: 'req-1', dataId: '999999' })).toBe(false)
    expect(await verifyMpSignature({ secret, signature: sig, requestId: 'req-2', dataId: '123456' })).toBe(false)
    expect(await verifyMpSignature({ secret: 'outro', signature: sig, requestId: 'req-1', dataId: '123456' })).toBe(false)
    expect(await verifyMpSignature({ secret, signature: null, requestId: 'req-1', dataId: '123456' })).toBe(false)
    expect(await verifyMpSignature({ secret: '', signature: sig, requestId: 'req-1', dataId: '123456' })).toBe(false)
    expect(await verifyMpSignature({ secret, signature: 'lixo', requestId: 'req-1', dataId: '123456' })).toBe(false)
  })
  const base = { orderId: 'BM-10420', total: 123.456, customer: { name: 'Ana Maria Souza', email: 'a@b.com', cpf: '529.982.247-25' }, notificationUrl: 'https://x/hook', expiresAt: new Date('2026-10-07T18:30:00Z'), items: [{ id: 'p', title: 'T', qty: 2, unitPrice: 10 }] }
  it('Pix: valor com 2 casas, expiração em Brasília e referência do pedido', () => {
    const b = buildPaymentBody({ ...base, method: 'pix' }) as any
    expect(b).toMatchObject({ transaction_amount: 123.46, payment_method_id: 'pix', external_reference: 'BM-10420', date_of_expiration: '2026-10-07T15:30:00.000-03:00', payer: { first_name: 'Ana', last_name: 'Maria Souza', identification: { type: 'CPF', number: '52998224725' } } })
  })
  it('boleto leva o endereço do pagador; cartão leva o token e nunca dados do cartão', () => {
    const addr = { cep: '20040-020', street: 'Av. Rio Branco', number: '50', complement: '', district: 'Centro', city: 'Rio', uf: 'RJ' }
    const bol = buildPaymentBody({ ...base, method: 'boleto', address: addr }) as any
    expect(bol.payment_method_id).toBe('bolbradesco')
    expect(bol.payer.address).toMatchObject({ zip_code: '20040020', federal_unit: 'RJ' })
    const card = buildPaymentBody({ ...base, method: 'card', card: { token: 'tok', installments: 3, paymentMethodId: 'visa', issuerId: '24' } }) as any
    expect(card).toMatchObject({ token: 'tok', installments: 3, payment_method_id: 'visa', issuer_id: '24' })
    expect(JSON.stringify(card)).not.toMatch(/card_number|cardNumber|security/i)
    expect(() => buildPaymentBody({ ...base, method: 'card' })).toThrow()
  })
  it('extrai Pix e boleto da resposta; mensagens de recusa em português', () => {
    expect(paymentView('pix', { id: 1, status: 'pending', point_of_interaction: { transaction_data: { qr_code: 'abc', ticket_url: 'u' } } })).toMatchObject({ pixCode: 'abc', ticketUrl: 'u', mpId: '1' })
    expect(paymentView('boleto', { id: 2, status: 'pending', transaction_details: { digitable_line: '123', external_resource_url: 'pdf' } })).toMatchObject({ boletoLine: '123', boletoUrl: 'pdf' })
    expect(rejectionMessage('cc_rejected_bad_filled_security_code')).toMatch(/CVV/)
    expect(rejectionMessage('qualquer_coisa')).toMatch(/recusou/)
  })
})

describe('datas e validações', () => {
  it('dias úteis pulam fim de semana', () => {
    expect(addBusinessDays(new Date('2026-10-09T12:00:00'), 1).getDay()).toBe(1) // sexta + 1 = segunda
  })
  it('Brasília é UTC-3', () => expect(toBrasiliaIso(new Date('2026-01-01T03:00:00Z'))).toBe('2026-01-01T00:00:00.000-03:00'))
  it('CPF, cartão (Luhn) e validade', () => {
    expect(isCPF('529.982.247-25')).toBe(true)
    expect(isCPF('111.111.111-11')).toBe(false)
    expect(isCPF('529.982.247-26')).toBe(false)
    expect(luhn('4111 1111 1111 1111')).toBe(true)
    expect(luhn('4111 1111 1111 1112')).toBe(false)
    expect(isExpiryValid('12/99', new Date('2026-10-07'))).toBe(false)
    expect(isExpiryValid('12/30', new Date('2026-10-07'))).toBe(true)
    expect(isExpiryValid('01/20', new Date('2026-10-07'))).toBe(false)
  })
})

describe('impressão 3D', () => {
  it('lê um STL binário e calcula o volume', () => {
    const mesh = parseSTL(sampleSTL())
    expect(mesh.triangles).toBeGreaterThan(100)
    expect(mesh.volumeCm3).toBeGreaterThan(100)
    expect(mesh.size[2]).toBeCloseTo(120, 0)
  })
  it('preço sobe com escala e quantidade ganha desconto', () => {
    const base = { volumeCm3: 100, size: [50, 50, 50] as [number, number, number], scale: 100, material: 'pla' as const, quality: 'padrao' as const, infill: 25, qty: 1 }
    const one = quotePrint(base)
    expect(quotePrint({ ...base, scale: 150 }).unit).toBeGreaterThan(one.unit)
    expect(quotePrint({ ...base, qty: 10 }).unit).toBeLessThan(one.unit)
    expect(quotePrint({ ...base, size: [300, 10, 10] }).fits).toBe(false)
  })
})

describe('waNumber', () => {
  it('adiciona o DDI 55 quando vem só DDD + número', () => {
    expect(waNumber('67999113636')).toBe('5567999113636')
    expect(waNumber('(67) 9 9911-3636')).toBe('5567999113636')
    expect(waNumber('6733334444')).toBe('556733334444')
    expect(waNumber('067999113636')).toBe('5567999113636')
  })
  it('mantém número que já tem DDI', () => {
    expect(waNumber('5567999113636')).toBe('5567999113636')
    expect(waNumber('+55 67 99911-3636')).toBe('5567999113636')
  })
})
