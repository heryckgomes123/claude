/**
 * Portfólio e referências que o visitante pode adicionar ao projeto.
 *
 * Regras:
 * - `kind` precisa refletir a verdade: trabalho realizado, produção própria, capacidade ou estudo conceitual.
 * - Não inclua clientes, métricas ou resultados que não possam ser comprovados.
 * - Pares de antes/depois só entram em BEFORE_AFTER quando existirem as duas imagens reais.
 */
import filmPoster from '../assets/work/film-poster.webp'
import filmStillLanding from '../assets/work/film-still-pouso.webp'
import filmStillFlight from '../assets/work/film-still-voo.webp'
import postOrganizacao from '../assets/work/post-organizacao.webp'
import type { ServiceId } from './quote'

export type WorldId = 'images' | 'motion' | 'experiences'
export type ItemKind = 'work' | 'own' | 'capability' | 'concept'

export const KIND_LABEL: Record<ItemKind, string> = {
  work: 'Trabalho realizado',
  own: 'Produção própria',
  capability: 'Capacidade',
  concept: 'Estudo conceitual',
}

export interface MediaImage {
  src: string
  width: number
  height: number
  alt: string
}

export interface PortfolioItem {
  id: string
  world: WorldId
  service: ServiceId
  kind: ItemKind
  title: string
  credit: string
  description: string
  image?: MediaImage
}

export const FILM = {
  id: 'filme-mascote',
  sources: [
    { src: `${import.meta.env.BASE_URL}media/intelra-film.mp4`, type: 'video/mp4; codecs="avc1.64001f, mp4a.40.2"' },
    { src: `${import.meta.env.BASE_URL}media/intelra-film.webm`, type: 'video/webm; codecs="vp9, opus"' },
  ],
  poster: { src: filmPoster, width: 720, height: 1280, alt: 'O robô da INTELRA, em versão 3D, olhando para a câmera numa rua de cidade futurista.' },
  duration: 10,
  /** Cenas para a linha do tempo (segundos). */
  scenes: [
    { label: 'Voo', start: 0, end: 4.2 },
    { label: 'Descida', start: 4.2, end: 6.2 },
    { label: 'Impacto', start: 6.2, end: 8 },
    { label: 'Revelação', start: 8, end: 10 },
  ],
}

export const PORTFOLIO: PortfolioItem[] = [
  {
    id: 'post-intelra-trader',
    world: 'images',
    service: 'images',
    kind: 'work',
    title: 'Como eu me organizo',
    credit: 'Post de feed · INTELRA Trader',
    description: 'Tipografia de impacto sobre fotografia de cena: um post feito para parar o scroll.',
    image: {
      src: postOrganizacao,
      width: 864,
      height: 1080,
      alt: 'Post “Como eu me organizo para não enlouquecer”: tipografia gigante sobre foto de um trader relaxando diante de gráficos.',
    },
  },
  {
    id: 'still-voo',
    world: 'images',
    service: 'images',
    kind: 'own',
    title: 'Voo sobre a cidade',
    credit: 'Key visual · Filme do mascote INTELRA',
    description: 'Frame do filme do mascote: o robô cruza uma cidade neon com propulsores acesos.',
    image: {
      src: filmStillFlight,
      width: 720,
      height: 1280,
      alt: 'Robô da INTELRA voando entre prédios iluminados por letreiros neon, com propulsores azuis.',
    },
  },
  {
    id: 'still-pouso',
    world: 'images',
    service: 'images',
    kind: 'own',
    title: 'Aterrissagem',
    credit: 'Key visual · Filme do mascote INTELRA',
    description: 'O impacto no asfalto vira composição: fumaça, raios e o personagem no centro.',
    image: {
      src: filmStillLanding,
      width: 720,
      height: 1280,
      alt: 'Robô da INTELRA pousando na rua com fumaça e raios elétricos ao redor.',
    },
  },
  {
    id: FILM.id,
    world: 'motion',
    service: 'video',
    kind: 'own',
    title: 'INTELRA — o filme do mascote',
    credit: 'Filme vertical 9:16 · 10 s',
    description: 'Do voo à revelação: o mascote ganha corpo 3D, cidade e trilha para se apresentar.',
    image: FILM.poster,
  },
  {
    id: 'esta-pagina',
    world: 'experiences',
    service: 'site',
    kind: 'own',
    title: 'Esta página',
    credit: 'Landing page · INTELRA',
    description: 'Mascote anfitrião, galeria navegável e orçamento guiado. Você está dentro do exemplo.',
  },
  {
    id: 'cap-landing',
    world: 'experiences',
    service: 'site',
    kind: 'capability',
    title: 'Landing pages de campanha',
    credit: 'Capacidade',
    description: 'Uma página, uma mensagem e um próximo passo claro para quem chega do anúncio.',
  },
  {
    id: 'cap-institucional',
    world: 'experiences',
    service: 'site',
    kind: 'capability',
    title: 'Sites institucionais',
    credit: 'Capacidade',
    description: 'A casa da marca na internet, com direção de arte própria e conteúdo fácil de navegar.',
  },
  {
    id: 'cap-interativa',
    world: 'experiences',
    service: 'site',
    kind: 'capability',
    title: 'Experiências interativas',
    credit: 'Capacidade',
    description: 'Configuradores, quizzes e orçamentos guiados que conversam com o visitante.',
  },
]

export const PORTFOLIO_BY_ID = Object.fromEntries(PORTFOLIO.map((p) => [p.id, p])) as Record<string, PortfolioItem>

export interface BeforeAfterPair {
  id: string
  title: string
  before: MediaImage
  after: MediaImage
}

/** Pares reais de antes/depois. Vazio até a INTELRA fornecer as duas versões de um mesmo trabalho. */
export const BEFORE_AFTER: BeforeAfterPair[] = []
