import 'server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { db } from '../db'
import * as schema from '../db/schema'
import { serverEnv } from '../env'
import { grantSignupDefaultPlan } from '../access/memberships'

/** Origens confiáveis: URL da aplicação + URLs que a Netlify injeta (produção e deploy previews). */
function trustedOrigins(): string[] {
  const candidates = [
    process.env.APP_URL,
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.DEPLOY_URL,
  ]
  return [...new Set(candidates.filter((v): v is string => Boolean(v)).map((v) => v.replace(/\/$/, '')))]
}

function createAuth() {
  const env = serverEnv()
  const origins = trustedOrigins()
  return betterAuth({
    appName: 'INTELRA AI LAB',
    secret: env.AUTH_SECRET,
    // Com APP_URL definida, ela é a URL canônica. Sem ela (ex.: deploy previews), a URL é inferida
    // da requisição — e só origens confiáveis passam na verificação de CSRF.
    baseURL: env.APP_URL,
    trustedOrigins: origins,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        rateLimit: schema.rateLimit,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    user: {
      additionalFields: {
        // input: false — o papel nunca pode ser definido pelo próprio usuário no cadastro.
        role: { type: 'string', required: false, defaultValue: 'USER', input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: process.env.NODE_ENV === 'production' || process.env.AUTH_RATE_LIMIT === 'on',
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 8 },
        '/sign-up/email': { window: 60 * 10, max: 5 },
      },
    },
    advanced: {
      ipAddress: {
        // Netlify envia o IP real do cliente neste cabeçalho.
        ipAddressHeaders: ['x-nf-client-connection-ip', 'x-forwarded-for'],
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (created) => {
            await grantSignupDefaultPlan(created.id)
          },
        },
      },
    },
    plugins: [nextCookies()],
  })
}

type Auth = ReturnType<typeof createAuth>
const globalForAuth = globalThis as unknown as { __intelraAuth?: Auth }

/** Instância preguiçosa: nada de segredos ou conexões durante o import (build). */
export function getAuth(): Auth {
  if (!globalForAuth.__intelraAuth) globalForAuth.__intelraAuth = createAuth()
  return globalForAuth.__intelraAuth
}
