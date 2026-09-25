/**
 * Configuração central da INTELRA.
 * O número de WhatsApp, URL e redes sociais vêm do arquivo `.env`
 * (VITE_WHATSAPP_NUMBER, VITE_SITE_URL, VITE_INSTAGRAM_URL).
 */

const env = import.meta.env

export const SITE = {
  name: 'INTELRA',
  tagline: 'Soluções digitais para empresas e negócios.',
  url: env.VITE_SITE_URL ?? 'https://intelra.com.br',
  instagram: env.VITE_INSTAGRAM_URL ?? 'https://instagram.com/intelra',
  year: 2026,
} as const

/** Número no formato internacional, apenas dígitos. Ex.: 5511999999999 */
export const WHATSAPP_NUMBER: string = (env.VITE_WHATSAPP_NUMBER ?? '5500000000000').replace(/\D/g, '')

/** Mensagens pré-preenchidas por contexto de CTA. */
export const WHATSAPP_MESSAGES = {
  default: 'Olá, INTELRA! Vim pelo site e quero conversar sobre uma solução para o meu negócio.',
  diagnosis: 'Olá, INTELRA! Quero descobrir o que minha empresa precisa. Podemos conversar?',
  final: 'Olá, INTELRA! Quero tirar um projeto do papel. Podemos conversar?',
} as const

export function whatsappLink(message: string = WHATSAPP_MESSAGES.default): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}
