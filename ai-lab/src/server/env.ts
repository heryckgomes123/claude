import 'server-only'
import { z } from 'zod'

/**
 * Variáveis de ambiente do servidor. Nunca importe este módulo em componentes cliente.
 * A validação é preguiçosa (na primeira leitura em runtime) para que o `next build`
 * não dependa de segredos quando nenhuma página precisa deles durante o build.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL não configurada'),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET precisa de pelo menos 32 caracteres'),
  /** URL canônica (lida em runtime; nunca use NEXT_PUBLIC_* no servidor — é fixada no build). */
  APP_URL: z.url().optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  /** E-mails transacionais (verificação de e-mail, nova senha) via Resend. Opcional. */
  RESEND_API_KEY: z.string().trim().optional(),
  EMAIL_FROM: z.string().trim().optional(),
})

export type ServerEnv = z.infer<typeof schema>

let cached: ServerEnv | undefined

export function serverEnv(): ServerEnv {
  if (cached) return cached
  const parsed = schema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET,
    APP_URL: process.env.APP_URL || undefined,
    DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX || undefined,
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    EMAIL_FROM: process.env.EMAIL_FROM || undefined,
  })
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Configuração de ambiente inválida — ${issues}`)
  }
  cached = parsed.data
  return cached
}

/** E-mail transacional configurado? Quando sim, o e-mail do aluno precisa ser confirmado. */
export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

/**
 * Segredos dos webhooks de venda. Lidos sob demanda (não são obrigatórios para o app subir).
 * *_PRODUCT_IDS: lista separada por vírgula; vazio = qualquer produto da conta libera acesso.
 */
export function webhookEnv() {
  const list = (value: string | undefined) =>
    (value ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
  return {
    hotmartHottok: process.env.HOTMART_HOTTOK?.trim() || undefined,
    hotmartProductIds: list(process.env.HOTMART_PRODUCT_IDS),
    kiwifyToken: process.env.KIWIFY_WEBHOOK_TOKEN?.trim() || undefined,
    kiwifyProductIds: list(process.env.KIWIFY_PRODUCT_IDS),
  }
}

/** Diagnóstico seguro (sem valores) para o endpoint de saúde. */
export function envStatus() {
  return {
    database: Boolean(process.env.DATABASE_URL),
    authSecret: Boolean(process.env.AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET),
    appUrl: Boolean(process.env.APP_URL || process.env.URL),
  }
}
