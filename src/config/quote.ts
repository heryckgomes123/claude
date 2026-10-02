/**
 * Serviços, perguntas do orçamento e faixas de investimento.
 *
 * Este arquivo é compartilhado entre a página e a função de servidor (`api/quote.ts`),
 * por isso contém apenas dados puros — nada de imports de imagens ou componentes.
 */

export const SERVICE_IDS = ['images', 'video', 'site', 'custom'] as const
export type ServiceId = (typeof SERVICE_IDS)[number]

export const INTEREST_IDS = [...SERVICE_IDS, 'discover'] as const
export type InterestId = (typeof INTEREST_IDS)[number]

export interface Service {
  id: ServiceId
  /** Nome curto usado no orçamento e no resumo. */
  label: string
  summary: string
  deliverables: string[]
  /** Seção da página com exemplos deste serviço. */
  anchor: string
}

export const SERVICES: Service[] = [
  {
    id: 'images',
    label: 'Imagens e criativos',
    summary: 'Key visuals, posts e criativos com direção de arte, produzidos com IA e acabamento de estúdio.',
    deliverables: ['Key visuals de campanha', 'Posts e carrosséis', 'Criativos para anúncios', 'Produtos em cenários criados'],
    anchor: '#imagens',
  },
  {
    id: 'video',
    label: 'Vídeo ou animação',
    summary: 'Filmes curtos, animações de personagem e vídeos para redes, com roteiro visual e ritmo de edição.',
    deliverables: ['Filmes curtos de marca', 'Animação de mascote', 'Vídeos verticais para redes', 'Vinhetas e aberturas'],
    anchor: '#videos',
  },
  {
    id: 'site',
    label: 'Landing page ou site',
    summary: 'Landing pages, sites e experiências interativas pensadas para transformar visita em conversa.',
    deliverables: ['Landing pages de campanha', 'Sites institucionais', 'Experiências interativas', 'Orçamentos e formulários guiados'],
    anchor: '#experiencias',
  },
  {
    id: 'custom',
    label: 'Projeto personalizado',
    summary: 'Uma ideia que mistura formatos ou ainda não tem nome. A gente ajuda a dar forma.',
    deliverables: ['Combinação de imagem, vídeo e digital', 'Mascotes e universos de marca', 'Campanhas integradas'],
    anchor: '#solucoes',
  },
]

export const SERVICE_BY_ID = Object.fromEntries(SERVICES.map((s) => [s.id, s])) as Record<ServiceId, Service>

/* -------------------------------------------------------------------------- */
/* Etapa 2 — perguntas condicionais                                           */
/* -------------------------------------------------------------------------- */

export interface Option {
  id: string
  label: string
}

export type QuestionKind = 'single' | 'multi' | 'text' | 'textarea'

export interface Question {
  id: string
  label: string
  hint?: string
  kind: QuestionKind
  options?: Option[]
  /** Exibir só quando algum destes serviços estiver selecionado. Ausente = sempre. */
  services?: ServiceId[]
  required?: boolean | ServiceId[]
  maxLength?: number
  placeholder?: string
}

const UNSURE: Option = { id: 'unsure', label: 'Ainda não sei' }

export const QUESTIONS: Question[] = [
  {
    id: 'goal',
    label: 'Qual é o objetivo principal?',
    kind: 'single',
    required: true,
    options: [
      { id: 'launch', label: 'Lançar algo novo' },
      { id: 'sales', label: 'Campanha ou vendas' },
      { id: 'brand', label: 'Fortalecer a marca' },
      { id: 'social', label: 'Conteúdo para redes' },
      { id: 'other', label: 'Outro' },
    ],
  },
  {
    id: 'images_quantity',
    label: 'Quantas imagens, aproximadamente?',
    kind: 'single',
    services: ['images'],
    options: [{ id: '1-5', label: '1 a 5' }, { id: '6-15', label: '6 a 15' }, { id: '16+', label: '16 ou mais' }, UNSURE],
  },
  {
    id: 'images_channel',
    label: 'Onde as imagens vão aparecer?',
    kind: 'multi',
    services: ['images'],
    options: [
      { id: 'social', label: 'Redes sociais' },
      { id: 'ads', label: 'Anúncios' },
      { id: 'site', label: 'Site ou loja' },
      { id: 'print', label: 'Impresso' },
      UNSURE,
    ],
  },
  {
    id: 'video_length',
    label: 'Qual a duração do vídeo?',
    kind: 'single',
    services: ['video'],
    options: [{ id: 'short', label: 'Até 15 s' }, { id: 'medium', label: '15 a 60 s' }, { id: 'long', label: 'Mais de 1 min' }, UNSURE],
  },
  {
    id: 'video_format',
    label: 'Em que formato ele vai ser visto?',
    kind: 'single',
    services: ['video'],
    options: [
      { id: 'vertical', label: 'Vertical (redes)' },
      { id: 'horizontal', label: 'Horizontal (site, YouTube)' },
      { id: 'both', label: 'Os dois' },
      UNSURE,
    ],
  },
  {
    id: 'site_type',
    label: 'Que tipo de página você imagina?',
    kind: 'single',
    services: ['site'],
    options: [
      { id: 'landing', label: 'Landing page' },
      { id: 'institutional', label: 'Site institucional' },
      { id: 'interactive', label: 'Experiência interativa' },
      UNSURE,
    ],
  },
  {
    id: 'site_current',
    label: 'Sua empresa já tem site hoje?',
    kind: 'single',
    services: ['site'],
    options: [{ id: 'yes', label: 'Sim' }, { id: 'no', label: 'Não' }, UNSURE],
  },
  {
    id: 'custom_description',
    label: 'Conte a ideia com suas palavras',
    hint: 'Não precisa ser técnico. Uma frase já ajuda.',
    kind: 'textarea',
    services: ['custom'],
    required: ['custom'],
    maxLength: 1200,
    placeholder: 'Ex.: quero um mascote para a marca aparecer em vídeos e posts…',
  },
  {
    id: 'deadline',
    label: 'Para quando você precisa?',
    kind: 'single',
    options: [
      { id: '2w', label: 'Até 2 semanas' },
      { id: '1m', label: 'Em até 1 mês' },
      { id: '2m', label: '1 a 2 meses' },
      { id: 'flex', label: 'Sem pressa' },
      UNSURE,
    ],
  },
  {
    id: 'materials',
    label: 'O que você já tem em mãos?',
    hint: 'Marque o que tiver. Nada pronto também serve.',
    kind: 'multi',
    options: [
      { id: 'brand', label: 'Logo e identidade' },
      { id: 'photos', label: 'Fotos de produto' },
      { id: 'footage', label: 'Vídeos gravados' },
      { id: 'copy', label: 'Textos ou roteiro' },
      { id: 'none', label: 'Nada ainda' },
    ],
  },
  {
    id: 'links',
    label: 'Links de referência (opcional)',
    hint: 'Perfis, sites ou vídeos que você admira. Um por linha.',
    kind: 'textarea',
    maxLength: 800,
    placeholder: 'https://…',
  },
]

export function visibleQuestions(services: readonly ServiceId[]): Question[] {
  return QUESTIONS.filter((q) => !q.services || q.services.some((s) => services.includes(s)))
}

export function isQuestionRequired(q: Question, services: readonly ServiceId[]): boolean {
  if (q.required === true) return true
  if (Array.isArray(q.required)) return q.required.some((s) => services.includes(s))
  return false
}

/* -------------------------------------------------------------------------- */
/* Etapa 3 — investimento                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Faixas de investimento exibidas no orçamento (opcionais).
 * Sem tabela comercial definida pela INTELRA, a lista fica vazia e a página oferece
 * apenas “Quero orientação” e um campo livre. Exemplo de preenchimento:
 *   { id: 'r1', label: 'Até R$ X' }
 */
export const BUDGET_RANGES: Option[] = []

export const BUDGET_GUIDANCE_ID = 'guidance'
export const BUDGET_SKIP_ID = 'skip'

/* -------------------------------------------------------------------------- */
/* Direções visuais (módulo “Uma ideia. Três universos.”)                     */
/* -------------------------------------------------------------------------- */

export const DIRECTION_IDS = ['retro-pop', 'chrome-future', 'editorial'] as const
export type DirectionId = (typeof DIRECTION_IDS)[number]

export const DIRECTION_LABELS: Record<DirectionId, string> = {
  'retro-pop': 'Retrô pop',
  'chrome-future': 'Futuro cromado',
  editorial: 'Editorial premium',
}

export const CONTACT_CHANNELS = ['whatsapp', 'email'] as const
export type ContactChannel = (typeof CONTACT_CHANNELS)[number]

/** Limites compartilhados entre cliente e servidor. */
export const LIMITS = {
  name: 80,
  company: 80,
  email: 160,
  budgetNote: 200,
  references: 24,
  text: 1200,
  /** Tempo mínimo (ms) entre abrir o orçamento e enviar — filtro simples contra robôs. */
  minFillMs: 4000,
} as const
