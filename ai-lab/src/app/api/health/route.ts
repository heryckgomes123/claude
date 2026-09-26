import { sql } from 'drizzle-orm'
import { db } from '@/server/db'
import { envStatus } from '@/server/env'

export const dynamic = 'force-dynamic'

/** Verificação de saúde para deploy/monitoramento. Nunca retorna valores de configuração. */
export async function GET() {
  const config = envStatus()
  let database: 'ok' | 'error' | 'not-configured' = 'not-configured'
  if (config.database) {
    try {
      await db.execute(sql`select 1`)
      database = 'ok'
    } catch {
      database = 'error'
    }
  }
  const healthy = database === 'ok' && config.authSecret
  return Response.json(
    { status: healthy ? 'ok' : 'degraded', database, authConfigured: config.authSecret },
    { status: healthy ? 200 : 503, headers: { 'cache-control': 'no-store' } },
  )
}
