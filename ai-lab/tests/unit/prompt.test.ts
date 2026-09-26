import { describe, expect, it } from 'vitest'
import { buildPrompt, composeFinalPrompt, filledFieldCount } from '@/lib/prompt-builder'
import { extractVariableKeys, fillVariables, segmentPrompt } from '@/lib/prompt-variables'

describe('variáveis de prompt', () => {
  const body = 'Photo of {{produto}} on {{ superficie }}, again {{produto}}.'

  it('extrai chaves únicas, na ordem, tolerando espaços', () => {
    expect(extractVariableKeys(body)).toEqual(['produto', 'superficie'])
  })

  it('preenche valores e mantém marcadores vazios visíveis', () => {
    expect(fillVariables(body, { produto: 'a perfume bottle' })).toBe('Photo of a perfume bottle on {{ superficie }}, again a perfume bottle.')
    expect(fillVariables(body, { produto: '   ' })).toContain('{{produto}}')
  })

  it('não interpreta valores como padrões de substituição', () => {
    expect(fillVariables('{{a}}', { a: '$& $1 {{b}}' })).toBe('$& $1 {{b}}')
  })

  it('segmenta texto e variáveis para destaque', () => {
    const segments = segmentPrompt('A {{x}} B', { x: 'val' })
    expect(segments).toEqual([
      { kind: 'text', value: 'A ' },
      { kind: 'variable', key: 'x', value: 'val' },
      { kind: 'text', value: ' B' },
    ])
  })
})

describe('Prompt Builder', () => {
  it('monta o formato estruturado na ordem dos campos, sem pontuação duplicada', () => {
    const { prompt } = buildPrompt({ format: 'structured', subject: 'sneaker,', lighting: 'rim light', style: 'commercial photo.' })
    expect(prompt).toBe('sneaker, commercial photo, rim light')
  })

  it('monta frases no formato descritivo', () => {
    const { prompt } = buildPrompt({ format: 'descriptive', subject: 'a sneaker', style: 'commercial photography', environment: 'a dark studio', lighting: 'rim light' })
    expect(prompt).toBe('Commercial photography of a sneaker, set in a dark studio. Lighting: rim light.')
  })

  it('compõe prompt final com parâmetros e negativo', () => {
    const text = composeFinalPrompt({ format: 'structured', subject: 'cup', parameters: '--ar 4:5', negative: 'text, watermark' })
    expect(text).toBe('cup --ar 4:5\n\nNegative prompt: text, watermark')
  })

  it('retorna vazio quando nada foi preenchido e conta campos', () => {
    expect(composeFinalPrompt({})).toBe('')
    expect(filledFieldCount({ subject: 'x', mood: '  ', color: 'red' })).toBe(2)
  })
})
