import { melhorEnvioBody, parseMelhorEnvio } from '../shippingRules.ts'
import type { Mail } from '../emailTemplates.ts'
import type { MpPayment } from '../mercadopago.ts'
import type { MercadoPagoPort, ShippingPort } from '../handlers/ports.ts'
import { env } from './env.ts'
import { adminClient } from './http.ts'

async function ensureOk(res: Response, what: string) {
  if (res.ok) return res
  // nunca registramos o corpo da requisição (tem CPF/cartão tokenizado), só a resposta do serviço
  const text = (await res.text().catch(() => '')).slice(0, 400)
  throw new Error(`${what}: HTTP ${res.status} ${text}`)
}

export function mercadoPago(): MercadoPagoPort {
  const base = 'https://api.mercadopago.com'
  const headers = (extra: Record<string, string> = {}) => {
    const token = env.mpAccessToken()
    if (!token) throw new Error('MP_ACCESS_TOKEN não configurado')
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...extra }
  }
  return {
    async createPayment(body, idempotencyKey, deviceId) {
      const res = await ensureOk(
        await fetch(`${base}/v1/payments`, { method: 'POST', headers: headers({ 'X-Idempotency-Key': idempotencyKey, ...(deviceId ? { 'X-meli-session-id': deviceId } : {}) }), body: JSON.stringify(body) }),
        'Mercado Pago (criar pagamento)',
      )
      return (await res.json()) as MpPayment
    },
    async getPayment(id) {
      const res = await ensureOk(await fetch(`${base}/v1/payments/${encodeURIComponent(id)}`, { headers: headers() }), 'Mercado Pago (consultar pagamento)')
      return (await res.json()) as MpPayment
    },
    async refund(paymentId) {
      await ensureOk(
        await fetch(`${base}/v1/payments/${encodeURIComponent(paymentId)}/refunds`, { method: 'POST', headers: headers({ 'X-Idempotency-Key': `refund-${paymentId}` }), body: '{}' }),
        'Mercado Pago (estorno)',
      )
    },
  }
}

export function melhorEnvio(): ShippingPort {
  return {
    async quote({ originCep, destCep, lines }) {
      const token = env.meToken()
      if (!token) throw new Error('ME_TOKEN não configurado')
      const base = env.meSandbox() ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br'
      const res = await ensureOk(
        await fetch(`${base}/api/v2/me/shipment/calculate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': `Bodemania (${env.adminEmail() ?? 'contato@bodemania.com.br'})` },
          body: JSON.stringify(melhorEnvioBody(originCep, destCep, lines)),
          signal: AbortSignal.timeout(8000),
        }),
        'Melhor Envio (cotação)',
      )
      return parseMelhorEnvio(await res.json())
    },
  }
}

export async function sendMail(to: string, mail: Mail) {
  const key = env.resendKey()
  if (!key) {
    console.log('[e-mail desligado] RESEND_API_KEY ausente — não enviado:', mail.subject)
    return
  }
  await ensureOk(
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.mailFrom(), to: [to], subject: mail.subject, html: mail.html, ...(env.mailReplyTo() ? { reply_to: env.mailReplyTo() } : {}) }),
    }),
    'Resend (e-mail)',
  )
}

export async function downloadUpload(path: string): Promise<ArrayBuffer> {
  const { data, error } = await adminClient().storage.from('order-uploads').download(path)
  if (error || !data) throw new Error(error?.message ?? 'arquivo não encontrado')
  return data.arrayBuffer()
}
