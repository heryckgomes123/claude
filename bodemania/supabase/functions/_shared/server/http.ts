import { createClient } from 'npm:@supabase/supabase-js@2'
import { AppError, fail, type HandlerResult } from '../handlers/ports.ts'
import { env } from './env.ts'

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

export const adminClient = () => createClient(env.supabaseUrl(), env.serviceKey(), { auth: { persistSession: false, autoRefreshToken: false } })

/** Quem está chamando? Valida o JWT do usuário no Supabase Auth (a chave anônima não conta). */
export async function requireUser(req: Request): Promise<string> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new AppError('unauthorized', 'Entre na sua conta para continuar.', 401)
  const { data, error } = await adminClient().auth.getUser(token)
  if (error || !data.user) throw new AppError('unauthorized', 'Sua sessão expirou. Entre novamente.', 401)
  return data.user.id
}

/** Esqueleto comum das funções: CORS, POST, erros padronizados e log só do que importa. */
export function serve(handler: (req: Request) => Promise<HandlerResult>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
    if (req.method !== 'POST') return json(405, { error: { code: 'method_not_allowed', message: 'Use POST.' } })
    try {
      const r = await handler(req)
      return json(r.status, r.body)
    } catch (e) {
      const r = fail(e)
      if (r.status >= 500) console.error('[erro]', e instanceof Error ? e.stack ?? e.message : e)
      return json(r.status, r.body)
    }
  })
}
