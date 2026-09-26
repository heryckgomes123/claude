import { describe, expect, it } from 'vitest'
import { accessCodeHint, generateAccessCode, hashAccessCode, normalizeAccessCode } from '@/server/access/codes'
import { can, isRole } from '@/server/access/roles'
import { safeExternalUrl, slugify } from '@/lib/utils'
import { accessCodeInputSchema, optionalUrl } from '@/lib/validation'

describe('papéis e permissões', () => {
  it('USER não tem permissões administrativas', () => {
    expect(can('USER', 'admin:access')).toBe(false)
    expect(can('USER', 'content:publish')).toBe(false)
  })
  it('ADMIN tem todas', () => {
    expect(can('ADMIN', 'admin:access')).toBe(true)
    expect(can('ADMIN', 'members:manage')).toBe(true)
  })
  it('papéis desconhecidos não têm nada', () => {
    expect(can('SUPER_ADMIN', 'admin:access')).toBe(false)
    expect(can(undefined, 'admin:access')).toBe(false)
    expect(isRole('admin')).toBe(false)
  })
})

describe('códigos de acesso', () => {
  it('gera formato legível e único', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateAccessCode()))
    expect(codes.size).toBe(200)
    for (const c of codes) expect(c).toMatch(/^LAB-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/)
  })
  it('hash ignora caixa, espaços e hífens', () => {
    expect(hashAccessCode(' lab-abcd-efgh-jkmn ')).toBe(hashAccessCode('LABABCDEFGHJKMN'))
    expect(normalizeAccessCode('lab-ab cd')).toBe('LABABCD')
  })
  it('dica não revela o código inteiro', () => {
    expect(accessCodeHint('LAB-ABCD-EFGH-JKMN')).toBe('LAB…JKMN')
  })
  it('valida entrada do usuário', () => {
    expect(accessCodeInputSchema.safeParse('lab-abcd-efgh-jkmn').success).toBe(true)
    expect(accessCodeInputSchema.safeParse("x'; drop").success).toBe(false)
  })
})

describe('utilitários de segurança', () => {
  it('aceita apenas URLs http(s)', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull()
    expect(safeExternalUrl('data:text/html,hi')).toBeNull()
    expect(safeExternalUrl('not a url')).toBeNull()
    expect(safeExternalUrl('https://kling.ai')).toBe('https://kling.ai/')
    expect(optionalUrl.safeParse('javascript:alert(1)').success).toBe(false)
    expect(optionalUrl.parse('')).toBeNull()
  })
  it('gera slugs estáveis', () => {
    expect(slugify('Fotografia de Produto — Estúdio & Luxo!')).toBe('fotografia-de-produto-estudio-e-luxo')
    expect(slugify('  ')).toBe('')
  })
})
