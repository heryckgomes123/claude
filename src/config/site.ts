/**
 * Configuração central da INTELRA (dados públicos, lidos do `.env` / variáveis da Vercel).
 *
 * Nada aqui é segredo: tudo que começa com VITE_ vai para o navegador.
 * Credenciais privilegiadas (Supabase) ficam só no servidor — ver `api/quote.ts`.
 */

const env = import.meta.env

function clean(value: string | undefined): string {
  return (value ?? '').trim()
}

export const SITE = {
  name: 'INTELRA',
  concept: 'A Máquina de Possibilidades',
  description: 'Imagens, vídeos e experiências digitais com IA e direção criativa para colocar sua marca em destaque.',
  url: clean(env.VITE_SITE_URL).replace(/\/$/, '') || 'https://intelra.com.br',
  year: new Date().getFullYear(),
} as const

/** Contatos públicos. Campos vazios simplesmente não aparecem na página. */
export const CONTACT = {
  /** WhatsApp comercial, só dígitos, com DDI + DDD (ex.: 5511999999999). */
  whatsapp: clean(env.VITE_WHATSAPP_NUMBER).replace(/\D/g, ''),
  email: clean(env.VITE_CONTACT_EMAIL),
} as const

/** Links sociais. Deixe vazio para ocultar. */
export const SOCIAL: { label: string; href: string }[] = [{ label: 'Instagram', href: clean(env.VITE_INSTAGRAM_URL) }].filter(
  (link) => link.href.startsWith('https://'),
)

/**
 * O WhatsApp só é habilitado com um número plausível e real:
 * 10 a 15 dígitos e que não seja um placeholder (DDI seguido só de zeros).
 */
export const WHATSAPP_ENABLED = /^\d{10,15}$/.test(CONTACT.whatsapp) && !/^\d{1,3}0{8,}$/.test(CONTACT.whatsapp)

export function whatsappLink(message: string): string | null {
  if (!WHATSAPP_ENABLED) return null
  return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`
}

/**
 * Endpoint de envio do orçamento (função serverless em `api/quote.ts`).
 * Na versão estática (`npm run build:static`) fica vazio: o envio aparece como “não configurado”.
 */
export const QUOTE_ENDPOINT: string = env.VITE_QUOTE_ENDPOINT ?? '/api/quote'

/** Versão do aviso de privacidade exibido no formulário (gravada junto com cada solicitação). */
export const PRIVACY_NOTICE_VERSION = '2026-10'
