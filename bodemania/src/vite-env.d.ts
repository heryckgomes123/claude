/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WHATSAPP_NUMBER?: string
  readonly VITE_PIX_KEY?: string
  readonly VITE_ORIGIN_CEP?: string
  readonly VITE_SITE_URL?: string
  readonly VITE_INSTAGRAM_URL?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_MP_PUBLIC_KEY?: string
  readonly VITE_GA_ID?: string
  readonly VITE_BACKEND?: 'local' | 'supabase'
  readonly VITE_ROUTER?: 'hash' | 'history'
}
