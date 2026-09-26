import 'server-only'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { serverEnv } from '../env'
import * as schema from './schema'

export type Database = PostgresJsDatabase<typeof schema>

/**
 * Conexão única por instância de função serverless (reaproveitada entre invocações “quentes”).
 * `prepare: false` mantém compatibilidade com poolers em modo transação (Neon, Supabase, PgBouncer).
 */
const globalForDb = globalThis as unknown as { __intelraDb?: Database }

function createDb(): Database {
  const env = serverEnv()
  const client = postgres(env.DATABASE_URL, {
    prepare: false,
    max: env.DATABASE_POOL_MAX,
    idle_timeout: 20,
    connect_timeout: 10,
  })
  return drizzle(client, { schema, casing: 'snake_case' })
}

export function getDb(): Database {
  if (!globalForDb.__intelraDb) globalForDb.__intelraDb = createDb()
  return globalForDb.__intelraDb
}

/** Proxy preguiçoso: a conexão só é criada no primeiro uso, nunca durante o import. */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver)
  },
})

export { schema }
