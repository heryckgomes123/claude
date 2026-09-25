export type EcosystemGlyph = 'signal' | 'network' | 'layers' | 'aperture' | 'modules'

export interface EcosystemArea {
  id: string
  index: string
  title: string
  summary: string
  items: string[]
  glyph: EcosystemGlyph
  cta: string
  message: string
}

export const ECOSYSTEM: EcosystemArea[] = [
  {
    id: 'marketing',
    cta: 'Quero marketing que vende',
    message: 'Olá, INTELRA! Quero estruturar o marketing do meu negócio (estratégia, redes, conteúdo e tráfego).',
    index: '01',
    title: 'Marketing',
    summary: 'Posicionamento e campanhas que colocam sua marca na frente das pessoas certas.',
    items: ['Estratégia digital', 'Gestão de redes sociais', 'Conteúdo', 'Tráfego pago', 'Posicionamento', 'Campanhas'],
    glyph: 'signal',
  },
  {
    id: 'ia',
    cta: 'Quero IA no meu negócio',
    message: 'Olá, INTELRA! Quero implementar inteligência artificial e automação no meu negócio.',
    index: '02',
    title: 'Inteligência Artificial',
    summary: 'IA aplicada ao que importa: tempo, escala e decisões melhores.',
    items: ['Implementação de IA', 'Automação', 'Agentes de IA', 'Fluxos inteligentes', 'IA aplicada a processos', 'Consultoria'],
    glyph: 'network',
  },
  {
    id: 'desenvolvimento',
    cta: 'Quero meu site ou sistema',
    message: 'Olá, INTELRA! Quero desenvolver um site, landing page ou sistema para o meu negócio.',
    index: '03',
    title: 'Desenvolvimento',
    summary: 'Sites, sistemas e aplicações construídos para performar.',
    items: ['Landing pages', 'Sites', 'Sistemas', 'Dashboards', 'Aplicações web', 'E-commerce'],
    glyph: 'layers',
  },
  {
    id: 'presenca',
    cta: 'Quero uma marca forte',
    message: 'Olá, INTELRA! Quero fortalecer a presença digital e a marca do meu negócio.',
    index: '04',
    title: 'Presença Digital',
    summary: 'Uma marca consistente em todos os pontos de contato.',
    items: ['Identidade visual', 'Instagram', 'Google', 'Branding', 'Estrutura digital', 'Comunicação'],
    glyph: 'aperture',
  },
  {
    id: 'experiencias',
    cta: 'Quero uma solução sob medida',
    message: 'Olá, INTELRA! Quero criar uma solução digital sob medida para o meu negócio.',
    index: '05',
    title: 'Experiências Digitais',
    summary: 'Produtos e ferramentas sob medida para o jeito que sua empresa opera.',
    items: ['Plataformas', 'Produtos digitais', 'Ferramentas internas', 'Sistemas personalizados', 'Soluções sob medida'],
    glyph: 'modules',
  },
]
