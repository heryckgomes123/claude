export type EcosystemGlyph = 'signal' | 'network' | 'layers' | 'aperture' | 'modules'

export interface EcosystemArea {
  id: string
  index: string
  title: string
  summary: string
  items: string[]
  glyph: EcosystemGlyph
}

export const ECOSYSTEM: EcosystemArea[] = [
  {
    id: 'marketing',
    index: '01',
    title: 'Marketing',
    summary: 'Posicionamento e campanhas que colocam sua marca na frente das pessoas certas.',
    items: ['Estratégia digital', 'Gestão de redes sociais', 'Conteúdo', 'Tráfego pago', 'Posicionamento', 'Campanhas'],
    glyph: 'signal',
  },
  {
    id: 'ia',
    index: '02',
    title: 'Inteligência Artificial',
    summary: 'IA aplicada ao que importa: tempo, escala e decisões melhores.',
    items: ['Implementação de IA', 'Automação', 'Agentes de IA', 'Fluxos inteligentes', 'IA aplicada a processos', 'Consultoria'],
    glyph: 'network',
  },
  {
    id: 'desenvolvimento',
    index: '03',
    title: 'Desenvolvimento',
    summary: 'Sites, sistemas e aplicações construídos para performar.',
    items: ['Landing pages', 'Sites', 'Sistemas', 'Dashboards', 'Aplicações web', 'E-commerce'],
    glyph: 'layers',
  },
  {
    id: 'presenca',
    index: '04',
    title: 'Presença Digital',
    summary: 'Uma marca consistente em todos os pontos de contato.',
    items: ['Identidade visual', 'Instagram', 'Google', 'Branding', 'Estrutura digital', 'Comunicação'],
    glyph: 'aperture',
  },
  {
    id: 'experiencias',
    index: '05',
    title: 'Experiências Digitais',
    summary: 'Produtos e ferramentas sob medida para o jeito que sua empresa opera.',
    items: ['Plataformas', 'Produtos digitais', 'Ferramentas internas', 'Sistemas personalizados', 'Soluções sob medida'],
    glyph: 'modules',
  },
]
