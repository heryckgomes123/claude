/** Configuração vinda das variáveis de ambiente das Edge Functions (supabase secrets set …). */
const get = (k: string) => Deno.env.get(k) || undefined
const need = (k: string) => {
  const v = get(k)
  if (!v) throw new Error(`Variável de ambiente ausente: ${k}`)
  return v
}

export const env = {
  supabaseUrl: () => need('SUPABASE_URL'),
  serviceKey: () => need('SUPABASE_SERVICE_ROLE_KEY'),
  mpAccessToken: () => get('MP_ACCESS_TOKEN'),
  mpWebhookSecret: () => get('MP_WEBHOOK_SECRET'),
  meToken: () => get('ME_TOKEN'),
  meSandbox: () => get('ME_ENV') === 'sandbox',
  resendKey: () => get('RESEND_API_KEY'),
  mailFrom: () => get('MAIL_FROM') ?? 'Bodemania <pedidos@bodemania.com.br>',
  mailReplyTo: () => get('MAIL_REPLY_TO'),
  siteUrl: () => (get('SITE_URL') ?? 'https://bodemania.com.br').replace(/\/$/, ''),
  originCep: () => get('ORIGIN_CEP') ?? '79823030',
  adminEmail: () => get('ADMIN_EMAIL'),
  freeShippingFrom: () => Number(get('FREE_SHIPPING_FROM') ?? 299),
  pixRate: () => Number(get('PIX_DISCOUNT') ?? 0.05),
  maxInstallments: () => Number(get('MAX_INSTALLMENTS') ?? 6),
  minInstallment: () => Number(get('MIN_INSTALLMENT') ?? 30),
}
