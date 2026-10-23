import type { ArtKey } from '../components/ProductArt'
import { createStore } from '../state/createStore'
import { SEED_PRODUCTS } from './seedProducts'
import { BACKEND } from '../config/env'

export type Universe = 'maconaria' | '3d'
export type ProductKind = 'physical' | 'digital' | 'service'

export type OptionValue = { id: string; label: string; priceDelta?: number; hex?: string }
export type ProductOption = { id: string; label: string; type: 'chips' | 'color'; values: OptionValue[]; affectsArt?: boolean }

export type Product = {
  id: string
  slug: string
  name: string
  category: CategoryId
  price: number
  compareAt?: number
  short: string
  description: string[]
  highlights: string[]
  specs: [string, string][]
  art: ArtKey
  /** cor base da arte (pode ser trocada por uma opção de cor) */
  tone?: string
  badge?: 'Novo' | 'Mais vendido' | 'Sob encomenda' | 'Personalizável' | 'Exclusivo'
  kind: ProductKind
  weight: number // kg
  /** dias úteis de produção antes do envio */
  leadDays: number
  stock?: number
  options?: ProductOption[]
  personalization?: { label: string; placeholder: string; maxLength: number; price: number; required?: boolean }
  photoUpload?: { label: string; required: boolean }
  tags: string[]
  /** link especial (ex.: página do orçamento 3D) */
  href?: string
  priceFrom?: boolean
  /** fotos reais (URLs públicas) — quando existem, substituem a ilustração */
  images?: string[]
  /** visível na vitrine (no banco, produtos inativos só aparecem no painel) */
  active?: boolean
  /** dimensões da embalagem, para o cálculo de frete */
  dims?: { widthCm: number; heightCm: number; lengthCm: number }
}

export type CategoryId =
  | 'aventais'
  | 'paramentos'
  | 'joias-acessorios'
  | 'presentes-maconicos'
  | 'colecionaveis'
  | 'casa-decoracao'
  | 'utilidades'
  | 'personalizados'
  | 'servicos-3d'

export type Category = { id: CategoryId; name: string; universe: Universe; blurb: string; art: ArtKey; tone?: string }

export const UNIVERSES: Record<Universe, { name: string; short: string; blurb: string }> = {
  maconaria: {
    name: 'Maçonaria',
    short: 'Artigos maçônicos',
    blurb: 'Aventais, paramentos, joias e presentes para Irmãos, Lojas e familiares — com acabamento de respeito.',
  },
  '3d': {
    name: 'Impressão 3D',
    short: 'Universo 3D',
    blurb: 'Decoração, colecionáveis, utilidades e peças sob medida. Se dá para imaginar, dá para imprimir.',
  },
}

export const CATEGORIES: Category[] = [
  { id: 'aventais', name: 'Aventais', universe: 'maconaria', blurb: 'Aprendiz, Companheiro e Mestre em vários ritos', art: 'avental' },
  { id: 'paramentos', name: 'Paramentos', universe: 'maconaria', blurb: 'Colares, luvas e itens de cargo', art: 'colar' },
  { id: 'joias-acessorios', name: 'Joias & acessórios', universe: 'maconaria', blurb: 'Anéis, pins, abotoaduras e gravatas', art: 'anel' },
  { id: 'presentes-maconicos', name: 'Presentes maçônicos', universe: 'maconaria', blurb: 'Para presentear Irmãos, cunhadas e sobrinhos', art: 'colunas' },
  { id: 'colecionaveis', name: 'Colecionáveis', universe: '3d', blurb: 'Miniaturas, articulados e jogos', art: 'dragao', tone: '#13b39c' },
  { id: 'casa-decoracao', name: 'Casa & decoração', universe: '3d', blurb: 'Vasos, luminárias e objetos com design', art: 'vaso', tone: '#ff5a36' },
  { id: 'utilidades', name: 'Utilidades', universe: '3d', blurb: 'Suportes, organizadores e soluções do dia a dia', art: 'suporte', tone: '#2f5180' },
  { id: 'personalizados', name: 'Personalizados', universe: '3d', blurb: 'Com nome, foto ou a sua ideia', art: 'lithophane', tone: '#c79b3b' },
  { id: 'servicos-3d', name: 'Serviços 3D', universe: '3d', blurb: 'Imprima seu arquivo ou peça um projeto', art: 'servico', tone: '#ff5a36' },
]

/** Catálogo em memória. Em produção é carregado do banco; no modo demonstração (ou enquanto carrega) usa o catálogo de exemplo. */
export const catalogStore = createStore({
  products: (BACKEND === 'supabase' ? [] : SEED_PRODUCTS) as Product[],
  status: (BACKEND === 'supabase' ? 'loading' : 'ready') as 'loading' | 'ready' | 'error',
})

export const getProducts = () => catalogStore.get().products
export const useProducts = () => catalogStore.use((s) => s.products)
export const useCatalogStatus = () => catalogStore.use((s) => s.status)

export const productBySlug = (slug: string) => getProducts().find((p) => p.slug === slug)
export const productById = (id: string) => getProducts().find((p) => p.id === id)
export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id)
export const universeOf = (p: Pick<Product, 'category'>): Universe => categoryById(p.category)?.universe ?? 'maconaria'
