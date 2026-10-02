/** Textos comerciais da página. Edite aqui sem tocar nos componentes. */
import type { InterestId } from './quote'

export const NAV_LINKS = [
  { label: 'Criações', href: '#criacoes' },
  { label: 'Soluções', href: '#solucoes' },
  { label: 'Como funciona', href: '#como-funciona' },
] as const

export const CTA = {
  primary: 'Montar meu projeto',
  explore: 'Explorar criações',
  whatsapp: 'Conversar com a INTELRA',
} as const

export const HERO = {
  eyebrow: 'A máquina de possibilidades',
  title: 'Sua próxima ideia merece sair do comum.',
  subtitle: 'Imagens, vídeos e experiências digitais com IA e direção criativa para colocar sua marca em destaque.',
  question: 'Me conta: o que vamos criar para sua marca?',
}

export const QUICK_CHOICES: { id: InterestId; label: string; anchor: string }[] = [
  { id: 'images', label: 'Imagens e campanhas', anchor: '#imagens' },
  { id: 'video', label: 'Vídeos e animações', anchor: '#videos' },
  { id: 'site', label: 'Sites e experiências digitais', anchor: '#experiencias' },
  { id: 'discover', label: 'Quero descobrir as possibilidades', anchor: '#criacoes' },
]

export const WORLDS_INTRO = {
  eyebrow: 'Criações',
  title: 'Três mundos. Uma mesma máquina.',
  text: 'Passeie pelos exemplos e leve para o seu projeto o que combinar com a sua marca. Cada peça mostra se é trabalho realizado, produção própria ou capacidade.',
}

export const WORLDS = {
  images: {
    index: '01',
    eyebrow: 'Mundo 1 · Estúdio',
    title: 'Imagens que mudam a percepção.',
    text: 'Fotografia de cena, tipografia e personagem compostos com IA e direção de arte — do post de feed ao key visual de campanha.',
    cta: 'Quero esse estilo para minha marca',
  },
  motion: {
    index: '02',
    eyebrow: 'Mundo 2 · Ilha de edição',
    title: 'Ideias que ganham movimento.',
    text: 'Roteiro visual, personagem e ritmo. O filme do nosso próprio mascote foi feito assim: da cidade neon ao pouso com raios.',
    cta: 'Quero um vídeo assim',
  },
  experiences: {
    index: '03',
    eyebrow: 'Mundo 3 · Interface',
    title: 'Experiências que viram negócio.',
    text: 'Sites e landing pages que guiam o visitante até o próximo passo. Ainda não publicamos cases de clientes aqui — por isso mostramos o que construímos e o que sabemos fazer.',
    cta: 'Quero uma experiência para minha empresa',
  },
} as const

export const DIRECTION_LAB = {
  eyebrow: 'Teste uma direção',
  title: 'Uma ideia. Três universos.',
  text: 'A mesma ideia — apresentar o anfitrião da INTELRA — em três direções de arte. Escolha a que mais combina com a sua marca.',
  disclaimer: 'Composições de demonstração montadas para esta página. Não é geração por IA em tempo real.',
  cta: 'Usar essa direção no meu projeto',
}

export const SOLUTIONS = {
  eyebrow: 'Soluções',
  title: 'O que a INTELRA cria para a sua marca.',
  text: 'Contrate um formato ou misture vários no mesmo projeto.',
}

export const PROCESS = {
  eyebrow: 'Como funciona',
  title: 'Da ideia à entrega.',
  steps: [
    { title: 'Você apresenta o objetivo.', text: 'Monte seu projeto aqui na página ou converse com a gente. Referências ajudam, mas não são obrigatórias.' },
    { title: 'A INTELRA define a direção e a proposta.', text: 'Analisamos o pedido, propomos o caminho criativo e enviamos uma proposta personalizada.' },
    { title: 'O projeto entra em produção após aprovação.', text: 'Nada começa sem o seu ok na direção e na proposta.' },
    { title: 'A entrega segue o escopo combinado.', text: 'Formatos, quantidades e canais saem exatamente do que foi acordado.' },
  ],
}

export const CLOSING = {
  title: 'Qual ideia vamos tirar do papel?',
  text: 'Monte seu projeto em poucos passos. Sem cadastro e sem compromisso.',
}

export const PRIVACY_NOTICE =
  'Usamos seus dados só para responder a esta solicitação. Eles ficam guardados com acesso restrito à equipe INTELRA.'
