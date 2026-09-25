/**
 * Projetos / cases.
 * Para publicar um case real: preencha `client`, `description`, `image` (em /public/projects)
 * e, se houver, `href`. Enquanto `image` estiver vazio, o card exibe uma composição visual
 * de placeholder. Não inclua métricas que não possam ser comprovadas.
 */
export type ProjectArt = 'grid' | 'orbit' | 'stack' | 'wave' | 'type' | 'nodes' | 'frames'

export interface Project {
  id: string
  category: string
  title: string
  description: string
  client?: string
  image?: string
  href?: string
  art: ProjectArt
  size: 'lg' | 'md'
}

export const PROJECTS: Project[] = [
  {
    id: 'branding',
    category: 'Branding',
    title: 'Identidade e posicionamento de marca',
    description: 'Espaço reservado para um case de construção de marca.',
    art: 'type',
    size: 'lg',
  },
  {
    id: 'landing',
    category: 'Landing Pages',
    title: 'Página de conversão para campanha',
    description: 'Espaço reservado para um case de landing page.',
    art: 'frames',
    size: 'md',
  },
  {
    id: 'ia',
    category: 'IA',
    title: 'Automação com agentes de IA',
    description: 'Espaço reservado para um case de inteligência artificial aplicada.',
    art: 'nodes',
    size: 'md',
  },
  {
    id: 'sistemas',
    category: 'Sistemas',
    title: 'Dashboard e ferramenta interna',
    description: 'Espaço reservado para um case de sistema sob medida.',
    art: 'grid',
    size: 'lg',
  },
  {
    id: 'marketing',
    category: 'Marketing',
    title: 'Estratégia e campanhas digitais',
    description: 'Espaço reservado para um case de marketing.',
    art: 'wave',
    size: 'md',
  },
  {
    id: 'sites',
    category: 'Sites',
    title: 'Site institucional',
    description: 'Espaço reservado para um case de site.',
    art: 'stack',
    size: 'md',
  },
  {
    id: 'social',
    category: 'Social Media',
    title: 'Gestão de presença nas redes',
    description: 'Espaço reservado para um case de social media.',
    art: 'orbit',
    size: 'md',
  },
]
