import type { ContentType } from '@/lib/labels'

export type SearchResult = {
  id: string
  type: ContentType
  slug: string
  title: string
  summary: string
  categoryName: string | null
  /** Trecho do conteúdo com os termos destacados (⟦ ⟧). */
  highlight: string | null
  /** Motivos legíveis de relevância ("Título corresponde…", "Tags: …"). */
  reasons: string[]
  score: number
}

export type SearchOptions = { types?: ContentType[]; limit?: number }

/**
 * Contrato de busca. Hoje: PostgresSearchProvider (full-text + trigram).
 * Futuro: uma implementação híbrida que combine este resultado com similaridade vetorial
 * (ver EmbeddingProvider) sem mudar quem consome a busca.
 */
export interface SearchProvider {
  readonly name: string
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>
}
