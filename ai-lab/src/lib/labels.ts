/** Rótulos em português e metadados de apresentação dos enums do domínio. */

export const CONTENT_TYPES = ['PROMPT', 'WORKFLOW', 'TOOL', 'REFERENCE', 'TUTORIAL'] as const
export type ContentType = (typeof CONTENT_TYPES)[number]

export const CONTENT_TYPE_META: Record<
  ContentType,
  { label: string; plural: string; path: string; article: string; description: string }
> = {
  PROMPT: {
    label: 'Prompt',
    plural: 'Prompts',
    path: '/lab/prompts',
    article: 'este prompt',
    description: 'Prompts prontos, com variáveis e configurações recomendadas.',
  },
  WORKFLOW: {
    label: 'Workflow',
    plural: 'Workflows',
    path: '/lab/workflows',
    article: 'este workflow',
    description: 'Processos passo a passo, da ideia ao resultado final.',
  },
  TOOL: {
    label: 'Ferramenta',
    plural: 'Ferramentas',
    path: '/lab/tools',
    article: 'esta ferramenta',
    description: 'O diretório de IAs, com pontos fortes, limites e usos.',
  },
  REFERENCE: {
    label: 'Referência',
    plural: 'Referências',
    path: '/lab/references',
    article: 'esta referência',
    description: 'Direções visuais, paletas e conceitos para se inspirar.',
  },
  TUTORIAL: {
    label: 'Tutorial',
    plural: 'Tutoriais',
    path: '/lab/tutorials',
    article: 'este tutorial',
    description: 'Aprenda técnicas com passos, erros comuns e dicas pro.',
  },
}

export function contentHref(type: ContentType, slug: string) {
  return `${CONTENT_TYPE_META[type].path}/${slug}`
}

export const CONTENT_STATUSES = ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'] as const
export type ContentStatus = (typeof CONTENT_STATUSES)[number]
export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  DRAFT: 'Rascunho',
  REVIEW: 'Em revisão',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Arquivado',
}

export const DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  BEGINNER: 'Iniciante',
  INTERMEDIATE: 'Intermediário',
  ADVANCED: 'Avançado',
  EXPERT: 'Expert',
}

export const MEDIA_TYPES = ['IMAGE', 'VIDEO', 'AUDIO', 'TEXT', 'THREE_D'] as const
export type MediaType = (typeof MEDIA_TYPES)[number]
export const MEDIA_LABELS: Record<MediaType, string> = {
  IMAGE: 'Imagem',
  VIDEO: 'Vídeo',
  AUDIO: 'Áudio',
  TEXT: 'Texto',
  THREE_D: '3D',
}

export const PRICING_STATUSES = ['FREE', 'FREEMIUM', 'PAID', 'TRIAL', 'UNKNOWN'] as const
export type PricingStatus = (typeof PRICING_STATUSES)[number]
export const PRICING_LABELS: Record<PricingStatus, string> = {
  FREE: 'Gratuita',
  FREEMIUM: 'Freemium',
  PAID: 'Paga',
  TRIAL: 'Teste grátis',
  UNKNOWN: 'A confirmar',
}

export const VERIFICATION_STATUSES = ['VERIFIED', 'NEEDS_REVIEW', 'OUTDATED'] as const
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]
export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  VERIFIED: 'Verificada',
  NEEDS_REVIEW: 'Verificação pendente',
  OUTDATED: 'Desatualizada',
}

export const SORTS = ['recent', 'used', 'popular', 'az'] as const
export type SortKey = (typeof SORTS)[number]
export const SORT_LABELS: Record<SortKey, string> = {
  recent: 'Mais recentes',
  used: 'Mais usados',
  popular: 'Populares',
  az: 'A–Z',
}

export const TIME_BUCKETS = ['short', 'medium', 'long'] as const
export type TimeBucket = (typeof TIME_BUCKETS)[number]
export const TIME_BUCKET_LABELS: Record<TimeBucket, string> = {
  short: 'Até 30 min',
  medium: '30–60 min',
  long: 'Mais de 1h',
}
