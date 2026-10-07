import type { Deps } from '../handlers/ports.ts'
import { downloadUpload, melhorEnvio, mercadoPago, sendMail } from './clients.ts'
import { env } from './env.ts'
import { adminClient } from './http.ts'
import { supabaseRepo } from './supabaseRepo.ts'

/** Monta as dependências reais (banco, Mercado Pago, Correios, e-mail). */
export function buildDeps(): Deps {
  return {
    repo: supabaseRepo(adminClient()),
    mp: mercadoPago(),
    shipping: melhorEnvio(),
    storage: { download: downloadUpload },
    mail: { send: sendMail },
    now: () => new Date(),
    log: (event, data) => console.log(JSON.stringify({ event, ...data })),
    config: {
      siteUrl: env.siteUrl(),
      originCep: env.originCep(),
      freeShippingFrom: env.freeShippingFrom(),
      pixRate: env.pixRate(),
      maxInstallments: env.maxInstallments(),
      minInstallment: env.minInstallment(),
      notificationUrl: `${env.supabaseUrl()}/functions/v1/mp-webhook`,
      adminEmail: env.adminEmail(),
      paymentsEnabled: !!env.mpAccessToken(),
      mpWebhookSecret: env.mpWebhookSecret(),
    },
  }
}
