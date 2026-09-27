/**
 * Campos editáveis nos prompts: {{chave}} ou {{chave|valor padrão}}.
 * Chaves: letras (com acento), números, _ e -.
 */
const VARIABLE_PATTERN = /\{\{\s*([\p{L}\p{N}_-]+)\s*(?:\|([^{}]*))?\}\}/gu

export type PromptVariable = { key: string; label: string; defaultValue: string }

/** "cor_destaque" → "Cor destaque" */
export function humanizeKey(key: string): string {
  const words = key.replace(/[_-]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function extractVariables(body: string): PromptVariable[] {
  const found = new Map<string, PromptVariable>()
  for (const match of body.matchAll(VARIABLE_PATTERN)) {
    const key = match[1]
    const defaultValue = match[2]?.trim() ?? ''
    const current = found.get(key)
    if (!current) found.set(key, { key, label: humanizeKey(key), defaultValue })
    else if (!current.defaultValue && defaultValue) current.defaultValue = defaultValue
  }
  return [...found.values()]
}

/** Troca cada campo pelo valor digitado ou pelo padrão; campos vazios sem padrão ficam como [chave]. */
export function fillVariables(body: string, values: Record<string, string | undefined>): string {
  const defaults = new Map(extractVariables(body).map((v) => [v.key, v.defaultValue]))
  return body.replace(VARIABLE_PATTERN, (_whole, key: string) => {
    const value = values[key]?.trim() || defaults.get(key)
    return value ? value : `[${humanizeKey(key).toLowerCase()}]`
  })
}

export type PromptSegment = { kind: 'text'; value: string } | { kind: 'variable'; key: string; value: string; filled: boolean }

/** Quebra o prompt em segmentos para destacar os campos na pré-visualização. */
export function segmentPrompt(body: string, values: Record<string, string | undefined> = {}): PromptSegment[] {
  const segments: PromptSegment[] = []
  let last = 0
  for (const match of body.matchAll(VARIABLE_PATTERN)) {
    const index = match.index ?? 0
    if (index > last) segments.push({ kind: 'text', value: body.slice(last, index) })
    const key = match[1]
    const typed = values[key]?.trim()
    const fallback = match[2]?.trim()
    segments.push({
      kind: 'variable',
      key,
      value: typed || fallback || humanizeKey(key).toLowerCase(),
      filled: Boolean(typed || fallback),
    })
    last = index + match[0].length
  }
  if (last < body.length) segments.push({ kind: 'text', value: body.slice(last) })
  return segments
}
