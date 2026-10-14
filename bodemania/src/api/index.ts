import { BACKEND } from '../config/env'
import { localBackend } from './local'
import type { Backend } from './types'

/**
 * O backend de produção (Supabase) é carregado sob demanda: o build de demonstração
 * (arquivo único) nem inclui o código dele, e o site publicado o baixa em paralelo com a página.
 */
function lazySupabase(): Backend {
  let loaded: Promise<Backend> | undefined
  const load = () => (loaded ??= import('./supabase').then((m) => m.supabaseBackend))
  const group = (name: 'auth' | 'coupons' | 'shipping' | 'orders' | 'admin') =>
    new Proxy({}, { get: (_t, fn: string) => async (...args: unknown[]) => ((await load())[name] as unknown as Record<string, (...a: unknown[]) => unknown>)[fn](...args) })
  return {
    mode: 'supabase',
    init: async () => (await load()).init(),
    reloadCatalog: async () => (await load()).reloadCatalog(),
    auth: group('auth'),
    coupons: group('coupons'),
    shipping: group('shipping'),
    orders: group('orders'),
    admin: group('admin'),
  } as Backend
}

/** O backend ativo: Supabase (produção) ou local (demonstração/arquivo único). */
export const api: Backend = BACKEND === 'supabase' ? lazySupabase() : localBackend
export * from './types'
