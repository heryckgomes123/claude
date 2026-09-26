import { describe, expect, it } from 'vitest'
import { parseListParams, buildQuery } from '@/lib/list-params'
import { prefixTsQuery, searchTokens, splitHighlight } from '@/lib/search-query'

describe('busca — construção segura de tsquery', () => {
  it('remove acentos, pontuação e operadores', () => {
    expect(searchTokens('Fotografia de PRODUTO!!')).toEqual(['fotografia', 'de', 'produto'])
    expect(searchTokens("cinemático'); drop table user; --")).toEqual(['cinematico', 'drop', 'table', 'user'])
    expect(searchTokens('a & b | !c :* <->')).toEqual([])
  })

  it('gera prefixos com AND/OR e nunca caracteres de sintaxe do usuário', () => {
    expect(prefixTsQuery('vídeo produto')).toBe('video:* & produto:*')
    expect(prefixTsQuery('vídeo produto', 'or')).toBe('video:* | produto:*')
    expect(prefixTsQuery('!!!')).toBeNull()
    expect(prefixTsQuery("xx' | yy & (zz) <-> !ww")).toBe('xx:* & yy:* & zz:* & ww:*')
  })

  it('limita a quantidade de termos', () => {
    expect(searchTokens('a1 b2 c3 d4 e5 f6 g7 h8 i9 j10')).toHaveLength(8)
  })

  it('divide destaques sem interpretar HTML', () => {
    expect(splitHighlight('a ⟦b⟧ <script> ⟦c⟧')).toEqual([
      { text: 'a ', match: false },
      { text: 'b', match: true },
      { text: ' <script> ', match: false },
      { text: 'c', match: true },
    ])
  })
})

describe('parâmetros de listagem', () => {
  it('ignora valores inválidos sem quebrar', () => {
    const p = parseListParams({ page: '-3', difficulty: 'HACKER', media: 'VIDEO', category: '../etc', sort: 'az', q: '  retrato  ' })
    expect(p.page).toBe(1)
    expect(p.difficulty).toBeUndefined()
    expect(p.media).toBe('VIDEO')
    expect(p.category).toBeUndefined()
    expect(p.sort).toBe('az')
    expect(p.q).toBe('retrato')
  })

  it('aceita arrays e limita a página', () => {
    expect(parseListParams({ tag: ['luxo', 'x'], page: '99999' })).toMatchObject({ tag: 'luxo', page: 1 })
  })

  it('monta query string omitindo vazios', () => {
    expect(buildQuery({ q: 'a b', page: undefined, tag: '' })).toBe('?q=a+b')
    expect(buildQuery({})).toBe('')
  })
})
