/**
 * Configuração central da LIFT.
 *
 * Valores públicos vêm de variáveis VITE_* (ver .env.example).
 * Segredos (ex.: AI_API_KEY) NUNCA ficam aqui — apenas no servidor (server/).
 */
const env = import.meta.env

export const LIFT_CONFIG = {
  LIFT_NAME: env.VITE_LIFT_NAME || 'LIFT FITNESS',
  LIFT_SHORT_NAME: 'LIFT',
  /** Marca provisória. Substitua pelo logo oficial em /public/brand. */
  LIFT_LOGO: '/icons/icon.svg',
  PRIMARY_COLOR: '#2f6bff',
  TAGLINE: ['ESTRUTURA', 'CONSISTÊNCIA', 'EVOLUÇÃO'] as const,
  WHATSAPP: env.VITE_LIFT_WHATSAPP || '',
  INSTAGRAM: env.VITE_LIFT_INSTAGRAM || '',
  LOCATION: env.VITE_LIFT_LOCATION || '',
  /** Modalidades oferecidas — base para agenda e filtros. */
  MODALITIES: ['CrossFit', 'Calistenia', 'Animal Flow', 'Yoga', 'Funcional'] as const,
  /** Unidades (preparado para multiunidade). */
  UNITS: [{ id: 'unit-main', name: 'LIFT — Unidade Principal' }],
} as const

/**
 * Provedor de IA.
 * - "demo": respostas locais por regras (SEM IA real) — padrão enquanto o backend não existir.
 * - "api":  o frontend chama /api/ai/chat; o servidor fala com o provedor (AI_PROVIDER / AI_API_KEY).
 */
export const AI_CONFIG = {
  AI_MODE: (env.VITE_AI_MODE === 'api' ? 'api' : 'demo') as 'demo' | 'api',
  AI_ENDPOINT: '/api/ai/chat',
  /** O provedor e a chave são definidos no servidor: AI_PROVIDER, AI_API_KEY. */
} as const

export type Modality = (typeof LIFT_CONFIG.MODALITIES)[number]
