import { describe, expect, it } from 'vitest'
import { csvToObjects, parseCsv } from '@/lib/csv'
import { parseLessonContent, toVideoEmbed } from '@/lib/lesson'
import { extractVariables, fillVariables, humanizeKey, segmentPrompt } from '@/lib/prompt-variables'
import { safeExternalUrl, slugify } from '@/lib/utils'

describe('variáveis de prompt', () => {
  const body = 'Foto de {{produto|um relógio}} em {{superficie}} com luz {{cor_destaque|dourada}}. {{produto}} em destaque.'

  it('extrai campos, rótulos e valores padrão sem repetir', () => {
    expect(extractVariables(body)).toEqual([
      { key: 'produto', label: 'Produto', defaultValue: 'um relógio' },
      { key: 'superficie', label: 'Superficie', defaultValue: '' },
      { key: 'cor_destaque', label: 'Cor destaque', defaultValue: 'dourada' },
    ])
  })

  it('preenche com o valor digitado, depois o padrão, depois um marcador legível', () => {
    expect(fillVariables(body, { produto: 'um tênis' })).toBe('Foto de um tênis em [superficie] com luz dourada. um tênis em destaque.')
    expect(fillVariables(body, {})).toBe('Foto de um relógio em [superficie] com luz dourada. um relógio em destaque.')
  })

  it('aceita chaves com acento e ignora chaves inválidas', () => {
    expect(extractVariables('{{iluminação}} {{a b}}').map((v) => v.key)).toEqual(['iluminação'])
    expect(humanizeKey('estilo-de_foto')).toBe('Estilo de foto')
  })

  it('segmenta para destacar os campos', () => {
    const segments = segmentPrompt('A {{x|1}} B {{y}}', { y: '2' })
    expect(segments).toEqual([
      { kind: 'text', value: 'A ' },
      { kind: 'variable', key: 'x', value: '1', filled: true },
      { kind: 'text', value: ' B ' },
      { kind: 'variable', key: 'y', value: '2', filled: true },
    ])
  })
})

describe('texto das aulas', () => {
  it('converte títulos, listas e parágrafos', () => {
    const blocks = parseLessonContent('Intro linha 1\nlinha 2\n\n## Passos\n• um\n- dois\n1. três\nFim.')
    expect(blocks).toEqual([
      { kind: 'paragraph', text: 'Intro linha 1 linha 2' },
      { kind: 'heading', text: 'Passos' },
      { kind: 'list', items: ['um', 'dois', 'três'] },
      { kind: 'paragraph', text: 'Fim.' },
    ])
  })
})

describe('player de vídeo', () => {
  it('reconhece YouTube, Vimeo, Panda e arquivos', () => {
    expect(toVideoEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')?.src).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0')
    expect(toVideoEmbed('https://youtu.be/dQw4w9WgXcQ?t=3')?.src).toContain('/embed/dQw4w9WgXcQ')
    expect(toVideoEmbed('https://youtube.com/shorts/abcdef123')?.src).toContain('/embed/abcdef123')
    expect(toVideoEmbed('https://vimeo.com/123456/abcdef')?.src).toBe('https://player.vimeo.com/video/123456?h=abcdef')
    expect(toVideoEmbed('https://player-vz-1.tv.pandavideo.com.br/embed/?v=x')?.kind).toBe('iframe')
    expect(toVideoEmbed('https://cdn.exemplo.com/aula.mp4')).toEqual({ kind: 'file', src: 'https://cdn.exemplo.com/aula.mp4' })
  })

  it('recusa links inseguros ou desconhecidos', () => {
    expect(toVideoEmbed('javascript:alert(1)')).toBeNull()
    expect(toVideoEmbed('http://youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(toVideoEmbed('https://evil.com/youtube.com/embed/x')).toBeNull()
    expect(toVideoEmbed('https://drive.google.com/file/d/1')).toBeNull()
    expect(toVideoEmbed('')).toBeNull()
  })
})

describe('CSV', () => {
  it('lida com aspas, vírgulas e quebras de linha dentro de campos', () => {
    expect(parseCsv('a,b\n"x, y","linha 1\nlinha 2"\n"com ""aspas""",z\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'linha 1\nlinha 2'],
      ['com "aspas"', 'z'],
    ])
  })

  it('detecta ponto e vírgula (Excel pt-BR) e normaliza o cabeçalho', () => {
    expect(csvToObjects('﻿Título;Categoria;Descrição\nA;B;C')).toEqual([{ titulo: 'A', categoria: 'B', descricao: 'C' }])
  })
})

describe('utilitários', () => {
  it('gera slugs sem acento', () => {
    expect(slugify('Foto de Produto — Estúdio & Luz!')).toBe('foto-de-produto-estudio-e-luz')
  })
  it('só aceita URLs http(s)', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull()
    expect(safeExternalUrl('https://ok.com/a')).toBe('https://ok.com/a')
  })
})
