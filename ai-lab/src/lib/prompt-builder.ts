/**
 * Prompt Builder — montagem determinística (sem IA externa).
 * A arquitetura permite, no futuro, um passo opcional de "melhorar com IA" via AIProvider.
 */

export const BUILDER_FIELDS = [
  { key: 'subject', label: 'Assunto', hint: 'O que está em cena. Seja específico.', placeholder: 'luxury perfume bottle with gold cap', suggestions: ['luxury perfume bottle', 'athletic woman mid-sprint', 'artisan coffee cup', 'minimalist sneaker', 'chef plating a dish'] },
  { key: 'action', label: 'Ação', hint: 'O que está acontecendo.', placeholder: 'splashing through a thin layer of water', suggestions: ['frozen mid-motion', 'slowly rotating', 'walking toward camera', 'steam rising', 'fabric flowing in the wind'] },
  { key: 'environment', label: 'Ambiente', hint: 'Onde a cena acontece.', placeholder: 'black marble podium in a dark studio', suggestions: ['dark studio with seamless backdrop', 'neon-lit city street at night', 'sunlit brutalist architecture', 'misty forest at dawn', 'clean white infinity cove'] },
  { key: 'style', label: 'Estilo', hint: 'Linguagem visual ou referência de gênero.', placeholder: 'high-end commercial photography', suggestions: ['high-end commercial photography', 'editorial fashion', 'cinematic film still', 'minimalist product render', 'documentary photography'] },
  { key: 'composition', label: 'Composição', hint: 'Enquadramento e distribuição dos elementos.', placeholder: 'centered hero composition, negative space on the left', suggestions: ['centered hero composition', 'rule of thirds', 'symmetrical', 'low angle', 'top-down flat lay', 'extreme close-up'] },
  { key: 'camera', label: 'Câmera', hint: 'Lente, corpo, abertura, movimento.', placeholder: '85mm lens, f/2.8, shallow depth of field', suggestions: ['85mm lens, f/1.8', '35mm lens', '100mm macro', 'anamorphic lens', 'slow dolly-in', 'handheld'] },
  { key: 'lighting', label: 'Iluminação', hint: 'Fonte, direção e qualidade da luz.', placeholder: 'dramatic rim light, soft key from the left', suggestions: ['soft studio key light', 'dramatic rim light', 'golden hour', 'chiaroscuro', 'neon practical lights', 'overcast diffused light'] },
  { key: 'color', label: 'Cor', hint: 'Paleta e tratamento de cor.', placeholder: 'deep blacks with warm gold accents', suggestions: ['deep blacks with gold accents', 'muted earth tones', 'teal and orange grade', 'monochrome', 'pastel palette'] },
  { key: 'mood', label: 'Atmosfera', hint: 'A emoção que a imagem transmite.', placeholder: 'exclusive, confident, quiet luxury', suggestions: ['quiet luxury', 'energetic', 'nostalgic', 'mysterious', 'optimistic'] },
  { key: 'material', label: 'Materiais', hint: 'Texturas e superfícies relevantes.', placeholder: 'polished glass, brushed metal, velvet', suggestions: ['polished glass', 'brushed metal', 'raw concrete', 'velvet', 'matte ceramic'] },
  { key: 'detail', label: 'Detalhes', hint: 'Elementos secundários que enriquecem a cena.', placeholder: 'water droplets on the surface, subtle reflections', suggestions: ['water droplets', 'floating particles', 'subtle reflections', 'visible fabric texture'] },
  { key: 'quality', label: 'Qualidade', hint: 'Acabamento e nível técnico.', placeholder: 'ultra-detailed, sharp focus, 8k', suggestions: ['ultra-detailed', 'sharp focus', 'photorealistic', 'high dynamic range'] },
] as const

export type BuilderFieldKey = (typeof BUILDER_FIELDS)[number]['key']

export type BuilderState = Partial<Record<BuilderFieldKey | 'negative' | 'parameters', string>> & {
  format?: BuilderFormat
}

export const BUILDER_FORMATS = ['descriptive', 'structured'] as const
export type BuilderFormat = (typeof BUILDER_FORMATS)[number]
export const BUILDER_FORMAT_LABELS: Record<BuilderFormat, { label: string; hint: string }> = {
  descriptive: { label: 'Descritivo', hint: 'Frases naturais — ideal para GPT Image, Veo, Runway, Kling.' },
  structured: { label: 'Estruturado', hint: 'Blocos separados por vírgula — ideal para Midjourney e Flux.' },
}

const clean = (value?: string) => value?.trim().replace(/\s+/g, ' ').replace(/[.,;]+$/, '') ?? ''

function capitalize(value: string) {
  return value ? value[0].toUpperCase() + value.slice(1) : value
}

export function buildPrompt(state: BuilderState): { prompt: string; negative: string; parameters: string } {
  const v = Object.fromEntries(BUILDER_FIELDS.map((f) => [f.key, clean(state[f.key])])) as Record<BuilderFieldKey, string>
  const format = state.format ?? 'descriptive'
  let prompt: string

  if (format === 'structured') {
    prompt = BUILDER_FIELDS.map((f) => v[f.key]).filter(Boolean).join(', ')
  } else {
    const sentences: string[] = []
    const lead = [v.style ? `${capitalize(v.style)} of ${v.subject || 'the subject'}` : capitalize(v.subject), v.action]
      .filter(Boolean)
      .join(', ')
    if (lead) sentences.push(lead + (v.environment ? `, set in ${v.environment}` : ''))
    else if (v.environment) sentences.push(`Set in ${v.environment}`)
    if (v.composition || v.camera) sentences.push(capitalize([v.composition, v.camera].filter(Boolean).join(', shot with ')))
    if (v.lighting) sentences.push(`Lighting: ${v.lighting}`)
    if (v.color) sentences.push(`Color palette: ${v.color}`)
    if (v.mood) sentences.push(`Mood: ${v.mood}`)
    if (v.material || v.detail) sentences.push(capitalize([v.material, v.detail].filter(Boolean).join('; ')))
    if (v.quality) sentences.push(capitalize(v.quality))
    prompt = sentences.map((s) => `${s}.`).join(' ')
  }

  return { prompt, negative: clean(state.negative), parameters: state.parameters?.trim() ?? '' }
}

/** Texto final para copiar: prompt + parâmetros técnicos + negativo (quando houver). */
export function composeFinalPrompt(state: BuilderState): string {
  const { prompt, negative, parameters } = buildPrompt(state)
  const parts = [prompt]
  if (parameters) parts[0] = `${prompt} ${parameters}`.trim()
  if (negative) parts.push(`Negative prompt: ${negative}`)
  return parts.filter(Boolean).join('\n\n')
}

export function filledFieldCount(state: BuilderState): number {
  return BUILDER_FIELDS.filter((f) => clean(state[f.key])).length
}
