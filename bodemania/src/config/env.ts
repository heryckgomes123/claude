/**
 * Configuração de ambiente (variáveis VITE_*, públicas — nunca coloque segredos aqui).
 * Sem VITE_SUPABASE_URL a loja roda em modo demonstração (tudo no navegador).
 */
const env = import.meta.env

export const SUPABASE_URL: string = env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY: string = env.VITE_SUPABASE_ANON_KEY ?? ''
export const MP_PUBLIC_KEY: string = env.VITE_MP_PUBLIC_KEY ?? ''
export const GA_ID: string = env.VITE_GA_ID ?? ''

export const BACKEND: 'supabase' | 'local' = SUPABASE_URL && SUPABASE_ANON_KEY && env.VITE_BACKEND !== 'local' ? 'supabase' : 'local'
/** `hash` (#/loja) abre direto do disco/arquivo único; `history` (/loja) é o site de verdade. */
export const ROUTER: 'hash' | 'history' = env.VITE_ROUTER === 'hash' ? 'hash' : 'history'
