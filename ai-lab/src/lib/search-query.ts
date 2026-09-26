/** Utilitários puros de busca (testáveis sem banco). */

export function unaccent(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Tokens seguros para to_tsquery: apenas [a-z0-9], no máximo 8. */
export function searchTokens(query: string): string[] {
  return unaccent(query.toLowerCase())
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 || /^\d$/.test(t))
    .slice(0, 8)
}

/** Monta uma tsquery com prefixo (busca enquanto digita). Retorna null se não houver termos. */
export function prefixTsQuery(query: string, mode: 'and' | 'or' = 'and'): string | null {
  const tokens = searchTokens(query)
  if (tokens.length === 0) return null
  return tokens.map((t) => `${t}:*`).join(mode === 'and' ? ' & ' : ' | ')
}

export const HIGHLIGHT_START = '⟦'
export const HIGHLIGHT_END = '⟧'

/** Quebra um trecho destacado pelo Postgres em partes renderizáveis (sem HTML). */
export function splitHighlight(text: string): { text: string; match: boolean }[] {
  const parts: { text: string; match: boolean }[] = []
  const pattern = new RegExp(`${HIGHLIGHT_START}(.*?)${HIGHLIGHT_END}`, 'g')
  let last = 0
  for (const m of text.matchAll(pattern)) {
    const index = m.index ?? 0
    if (index > last) parts.push({ text: text.slice(last, index), match: false })
    parts.push({ text: m[1], match: true })
    last = index + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false })
  return parts
}
