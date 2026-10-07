/**
 * Configuração central da Bodemania.
 * WhatsApp, chave Pix, CEP de origem e URL vêm do arquivo `.env`.
 */

import { BACKEND } from './env'

const env = import.meta.env

export const STORE = {
  name: 'Bodemania',
  tagline: 'Artigos maçônicos & impressão 3D sob medida',
  url: env.VITE_SITE_URL ?? 'https://bodemania.com.br',
  instagram: env.VITE_INSTAGRAM_URL ?? 'https://instagram.com/lojabodemania',
  email: 'contato@bodemania.com.br',
  /** Troque pelos dados reais da empresa antes de publicar. */
  legalName: 'Bodemania Comércio de Artigos LTDA',
  cnpj: '06.127.667/0001-36',
  city: 'São Paulo/SP',
  year: 2026,
  /** Modo demonstração: sem VITE_SUPABASE_URL, pagamentos e contas são simulados no navegador. */
  demo: BACKEND === 'local',
} as const

export const WHATSAPP_NUMBER: string = (env.VITE_WHATSAPP_NUMBER ?? '5500000000000').replace(/\D/g, '')
export const PIX_KEY: string = env.VITE_PIX_KEY ?? 'demonstracao@bodemania.invalid'
export const ORIGIN_CEP: string = (env.VITE_ORIGIN_CEP ?? '01310100').replace(/\D/g, '')

export const RULES = {
  /** Frete grátis (PAC) a partir deste subtotal. */
  freeShippingFrom: 299,
  /** Desconto no Pix. */
  pixDiscount: 0.05,
  /** Parcelamento sem juros no cartão. */
  maxInstallments: 6,
  minInstallment: 30,
  /** Pix expira em minutos. */
  pixExpiresMin: 30,
} as const

export const COUPONS: Record<string, { label: string; percent?: number; amount?: number; freeShipping?: boolean; min?: number }> = {
  BEMVINDO10: { label: '10% de boas-vindas', percent: 0.1 },
  IRMAO15: { label: '15% em pedidos acima de R$ 400', percent: 0.15, min: 400 },
  FRETEGRATIS: { label: 'Frete grátis', freeShipping: true, min: 150 },
}

export function whatsappLink(message = 'Olá, Bodemania! Vim pela loja e quero tirar uma dúvida.'): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}
