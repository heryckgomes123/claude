/** Dados do configurador "Monte seu plano". */

export const SERVICES = [
  'Estratégia digital',
  'Gestão de redes sociais',
  'Conteúdo',
  'Tráfego pago',
  'Identidade visual',
  'Landing page',
  'Site',
  'Sistema / Dashboard',
  'E-commerce',
  'Automação',
  'Agentes de IA',
  'Consultoria em IA',
] as const

export type Service = (typeof SERVICES)[number]

export interface BuilderObjective {
  id: string
  title: string
  description: string
  preset: Service[]
}

export const BUILDER_OBJECTIVES: BuilderObjective[] = [
  {
    id: 'vender',
    title: 'Quero vender mais',
    description: 'Atrair demanda qualificada e transformar atenção em clientes.',
    preset: ['Tráfego pago', 'Landing page', 'Estratégia digital', 'Conteúdo'],
  },
  {
    id: 'marca',
    title: 'Quero profissionalizar minha marca',
    description: 'Ser percebido pelo valor real do que você entrega.',
    preset: ['Identidade visual', 'Gestão de redes sociais', 'Site', 'Conteúdo'],
  },
  {
    id: 'ia',
    title: 'Quero usar IA no meu negócio',
    description: 'Aplicar inteligência artificial onde ela gera ganho real.',
    preset: ['Consultoria em IA', 'Automação', 'Agentes de IA'],
  },
  {
    id: 'solucao',
    title: 'Quero criar uma solução digital',
    description: 'Tirar do papel um sistema, plataforma ou produto digital.',
    preset: ['Sistema / Dashboard', 'Site', 'E-commerce'],
  },
  {
    id: 'zero',
    title: 'Quero começar do zero',
    description: 'Partir de um diagnóstico e desenhar a estrutura certa.',
    preset: ['Estratégia digital', 'Identidade visual', 'Site', 'Gestão de redes sociais'],
  },
]

export const MOMENTS = [
  { id: 'comecando', title: 'Estou começando', description: 'Negócio novo ou digital ainda no início.' },
  { id: 'crescendo', title: 'Já vendo e quero crescer', description: 'Tenho clientes e quero escalar os resultados.' },
  { id: 'estruturando', title: 'Quero estruturar tudo', description: 'Preciso organizar e integrar a operação digital.' },
] as const

export function composePlanMessage(objective?: string, services: string[] = [], moment?: string): string {
  const lines = ['Olá, INTELRA! Montei meu plano pelo site:']
  if (objective) lines.push(`• Objetivo: ${objective}`)
  if (services.length) lines.push(`• Frentes: ${services.join(', ')}`)
  if (moment) lines.push(`• Momento: ${moment}`)
  lines.push('Podemos conversar?')
  return lines.join('\n')
}
