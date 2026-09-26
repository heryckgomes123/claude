/**
 * Projetos / cases.
 * Para publicar um case real: preencha `client`, `description` e `image`
 * (importe o arquivo de src/assets/work) e, se houver, `href`.
 * Enquanto `image` estiver vazio, o card exibe uma composição visual de placeholder.
 * Não inclua métricas que não possam ser comprovadas.
 */
import postOrganizacao from '../assets/work/post-organizacao.webp'

export type ProjectArt = 'grid' | 'orbit' | 'stack' | 'wave' | 'type' | 'nodes' | 'frames'

export interface Project {
  id: string
  category: string
  title: string
  description: string
  client?: string
  image?: string
  imageAlt?: string
  href?: string
  art: ProjectArt
}

export const PROJECTS: Project[] = [
  {
    id: 'social',
    category: 'Social Media',
    title: 'Post de feed para Instagram',
    description: 'Direção de arte e copy para conteúdo que para o scroll.',
    client: 'INTELRA Trader',
    image: postOrganizacao,
    imageAlt: 'Post “Como eu me organizo para não enlouquecer”: tipografia gigante sobre foto de um trader relaxando diante de gráficos.',
    art: 'orbit',
  },
  {
    id: 'branding',
    category: 'Branding',
    title: 'Identidade e posicionamento de marca',
    description: 'Espaço reservado para um case de construção de marca.',
    art: 'type',
  },
  {
    id: 'landing',
    category: 'Landing Pages',
    title: 'Página de conversão para campanha',
    description: 'Espaço reservado para um case de landing page.',
    art: 'frames',
  },
  {
    id: 'ia',
    category: 'IA',
    title: 'Automação com agentes de IA',
    description: 'Espaço reservado para um case de IA aplicada.',
    art: 'nodes',
  },
  {
    id: 'sistemas',
    category: 'Sistemas',
    title: 'Dashboard e ferramenta interna',
    description: 'Espaço reservado para um case de sistema sob medida.',
    art: 'grid',
  },
  {
    id: 'sites',
    category: 'Sites',
    title: 'Site institucional',
    description: 'Espaço reservado para um case de site.',
    art: 'stack',
  },
]
