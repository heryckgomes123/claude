/** Variáveis de prompt no formato {{chave}}. Chaves: letras, números, _ e -. */
const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g

export function extractVariableKeys(body: string): string[] {
  const keys: string[] = []
  for (const match of body.matchAll(VARIABLE_PATTERN)) {
    if (!keys.includes(match[1])) keys.push(match[1])
  }
  return keys
}

/** Substitui variáveis preenchidas; as vazias permanecem como {{chave}} para o usuário perceber. */
export function fillVariables(body: string, values: Record<string, string | undefined>): string {
  return body.replace(VARIABLE_PATTERN, (whole, key: string) => {
    const value = values[key]?.trim()
    return value ? value : whole
  })
}

export type PromptSegment = { kind: 'text'; value: string } | { kind: 'variable'; key: string; value?: string }

/** Quebra o prompt em segmentos para destacar variáveis na pré-visualização. */
export function segmentPrompt(body: string, values: Record<string, string | undefined> = {}): PromptSegment[] {
  const segments: PromptSegment[] = []
  let last = 0
  for (const match of body.matchAll(VARIABLE_PATTERN)) {
    const index = match.index ?? 0
    if (index > last) segments.push({ kind: 'text', value: body.slice(last, index) })
    const key = match[1]
    segments.push({ kind: 'variable', key, value: values[key]?.trim() || undefined })
    last = index + match[0].length
  }
  if (last < body.length) segments.push({ kind: 'text', value: body.slice(last) })
  return segments
}
