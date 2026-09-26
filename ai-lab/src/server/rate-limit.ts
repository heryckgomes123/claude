import 'server-only'
import { sql } from 'drizzle-orm'
import { db } from './db'

/**
 * Rate limit de janela fixa persistido no Postgres (funciona entre instâncias serverless).
 * Retorna true se a requisição é permitida.
 */
export async function consumeRateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const rows = await db.execute<{ count: number }>(sql`
    insert into app_rate_limit (key, count, window_start) values (${key}, 1, now())
    on conflict (key) do update set
      count = case when app_rate_limit.window_start < now() - make_interval(secs => ${windowSeconds})
                   then 1 else app_rate_limit.count + 1 end,
      window_start = case when app_rate_limit.window_start < now() - make_interval(secs => ${windowSeconds})
                   then now() else app_rate_limit.window_start end
    returning count
  `)
  const count = Number(rows[0]?.count ?? 0)
  return count <= max
}
