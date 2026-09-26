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
  NEXT_PUBLIC_APP_URL: z.url().optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  /** Código de plano concedido automaticamente no cadastro (ex.: LAB). Vazio = nenhum. */
  SIGNUP_DEFAULT_PLAN: z.string().trim().optional(),
})

export type ServerEnv = z.infer<typeof schema>

let cached: ServerEnv | undefined

export function serverEnv(): ServerEnv {
  if (cached) return cached
  const parsed = schema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || undefined,
    DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX || undefined,
    SIGNUP_DEFAULT_PLAN: process.env.SIGNUP_DEFAULT_PLAN || undefined,
  })
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Configuração de ambiente inválida — ${issues}`)
  }
  cached = parsed.data
  return cached
}

/** Diagnóstico seguro (sem valores) para o endpoint de saúde. */
export function envStatus() {
  return {
    database: Boolean(process.env.DATABASE_URL),
    authSecret: Boolean(process.env.AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET),
    appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL || process.env.URL),
  }
}
