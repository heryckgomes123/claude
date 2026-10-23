/**
 * Mercado Pago no navegador: transforma os dados do cartão em um TOKEN de uso único.
 * O número do cartão vai direto do navegador para o Mercado Pago — nosso servidor só recebe o token.
 */
import { MP_PUBLIC_KEY } from '../config/env'
import { onlyDigits } from '../lib/format'
import { UserFacingError } from './types'

declare global {
  interface Window {
    MercadoPago?: new (key: string, opts: { locale: string }) => any
    MP_DEVICE_SESSION_ID?: string
  }
}

let loading: Promise<void> | null = null

function loadSdk(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve()
  return (loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://sdk.mercadopago.com/js/v2'
    s.onload = () => resolve()
    s.onerror = () => {
      loading = null
      reject(new UserFacingError('Não foi possível carregar o pagamento por cartão. Verifique a conexão ou pague com Pix.'))
    }
    document.head.appendChild(s)
  }))
}

export interface CardToken {
  token: string
  paymentMethodId: string
  issuerId?: string
  deviceId?: string
}

export async function tokenizeCard(card: { number: string; name: string; expiry: string; cvv: string; cpf: string }): Promise<CardToken> {
  if (!MP_PUBLIC_KEY) throw new UserFacingError('O pagamento por cartão ainda não está ativo nesta loja. Pague com Pix.', 'cards_disabled')
  await loadSdk()
  const mp = new window.MercadoPago!(MP_PUBLIC_KEY, { locale: 'pt-BR' })
  const number = onlyDigits(card.number)
  const [mm, yy] = card.expiry.split('/')
  try {
    const methods = await mp.getPaymentMethods({ bin: number.slice(0, 8) })
    const method = methods?.results?.[0]
    if (!method) throw new Error('bandeira')
    const created = await mp.createCardToken({
      cardNumber: number,
      cardholderName: card.name,
      cardExpirationMonth: mm,
      cardExpirationYear: `20${yy}`,
      securityCode: card.cvv,
      identificationType: 'CPF',
      identificationNumber: onlyDigits(card.cpf),
    })
    if (!created?.id) throw new Error('token')
    return { token: created.id, paymentMethodId: method.id, issuerId: method.issuer?.id ? String(method.issuer.id) : undefined, deviceId: window.MP_DEVICE_SESSION_ID }
  } catch {
    throw new UserFacingError('Não foi possível validar o cartão. Confira número, validade e CVV, ou pague com Pix.', 'card_invalid')
  }
}
