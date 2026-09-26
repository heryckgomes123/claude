/**
 * Contrato para embeddings — base da futura busca semântica.
 *
 * STATUS: somente arquitetura. Plano de evolução:
 * 1. Habilitar a extensão pgvector no Postgres e criar `content_embedding(content_id, model, embedding vector(N))`.
 * 2. Implementar EmbeddingProvider e um job que gera embeddings de title + summary + description + searchKeywords
 *    sempre que um conteúdo é publicado/alterado.
 * 3. Criar um SearchProvider híbrido: combina o ranking full-text atual (PostgresSearchProvider)
 *    com similaridade vetorial (reciprocal rank fusion). A API /api/search não muda.
 */
export interface EmbeddingProvider {
  readonly name: string
  readonly model: string
  readonly dimensions: number
  embed(texts: string[]): Promise<number[][]>
}

export function getEmbeddingProvider(): EmbeddingProvider | null {
  return null
}
