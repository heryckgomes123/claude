export interface Objective {
  id: string
  title: string
  description: string
  items: string[]
  message: string
}

export const OBJECTIVES: Objective[] = [
  {
    id: 'vender',
    title: 'Quero vender mais',
    description: 'Atrair demanda qualificada e transformar atenção em clientes.',
    items: ['Tráfego pago', 'Landing page', 'Estratégia', 'Conteúdo', 'Funil'],
    message: 'Olá, INTELRA! Quero vender mais e gostaria de entender qual estrutura faz sentido para o meu negócio.',
  },
  {
    id: 'marca',
    title: 'Quero profissionalizar minha marca',
    description: 'Ser percebido pelo valor real do que você entrega.',
    items: ['Identidade', 'Posicionamento', 'Redes sociais', 'Site', 'Conteúdo'],
    message: 'Olá, INTELRA! Quero profissionalizar a minha marca. Podemos conversar?',
  },
  {
    id: 'ia',
    title: 'Quero usar IA no meu negócio',
    description: 'Aplicar inteligência artificial onde ela realmente gera ganho.',
    items: ['Consultoria', 'Automação', 'Agentes', 'Processos', 'Integrações'],
    message: 'Olá, INTELRA! Quero usar inteligência artificial no meu negócio. Podemos conversar?',
  },
  {
    id: 'solucao',
    title: 'Quero criar uma solução digital',
    description: 'Tirar do papel um sistema, plataforma ou produto digital.',
    items: ['Sistema', 'Dashboard', 'Plataforma', 'Aplicação', 'E-commerce'],
    message: 'Olá, INTELRA! Quero criar uma solução digital e gostaria de conversar sobre o projeto.',
  },
  {
    id: 'zero',
    title: 'Quero começar do zero',
    description: 'Ainda não sabe por onde começar? Partimos de um diagnóstico e desenhamos uma solução personalizada.',
    items: ['Diagnóstico', 'Plano de ação', 'Solução personalizada'],
    message: 'Olá, INTELRA! Quero começar do zero e gostaria de um diagnóstico para o meu negócio.',
  },
]
