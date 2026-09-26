import { describe, expect, it } from 'vitest'
import { seedBundle } from '../../content'
import { contentBundleSchema } from '@/lib/content-bundle'
import { extractVariableKeys } from '@/lib/prompt-variables'

const bundle = contentBundleSchema.parse(seedBundle)
const keys = new Set([
  ...bundle.prompts.map((p) => `PROMPT:${p.slug}`),
  ...bundle.workflows.map((w) => `WORKFLOW:${w.slug}`),
  ...bundle.tools.map((t) => `TOOL:${t.slug}`),
  ...bundle.references.map((r) => `REFERENCE:${r.slug}`),
  ...bundle.tutorials.map((t) => `TUTORIAL:${t.slug}`),
])

describe('conteúdo do seed', () => {
  it('atende os mínimos do MVP', () => {
    expect(bundle.prompts.length).toBeGreaterThanOrEqual(10)
    expect(bundle.workflows.length).toBeGreaterThanOrEqual(5)
    expect(bundle.tools.length).toBeGreaterThanOrEqual(8)
    expect(bundle.references.length).toBeGreaterThanOrEqual(5)
    expect(bundle.tutorials.length).toBeGreaterThanOrEqual(5)
  })

  it('não tem slugs duplicados por tipo', () => {
    const all = [...keys]
    const total =
      bundle.prompts.length + bundle.workflows.length + bundle.tools.length + bundle.references.length + bundle.tutorials.length
    expect(all).toHaveLength(total)
  })

  it('todas as referências do grafo apontam para itens existentes', () => {
    const missing: string[] = []
    const check = (from: string, ref: string) => !keys.has(ref) && missing.push(`${from} → ${ref}`)
    for (const p of bundle.prompts) {
      p.related.forEach((r) => check(p.slug, r))
      p.tools.forEach((t) => check(p.slug, `TOOL:${t}`))
    }
    for (const w of bundle.workflows) {
      w.related.forEach((r) => check(w.slug, r))
      ;[...w.requiredTools, ...w.optionalTools].forEach((t) => check(w.slug, `TOOL:${t}`))
      w.steps.forEach((s) => {
        if (s.tool) check(w.slug, `TOOL:${s.tool}`)
        if (s.prompt) check(w.slug, `PROMPT:${s.prompt}`)
      })
    }
    for (const r of bundle.references) {
      r.related.forEach((x) => check(r.slug, x))
      r.tools.forEach((t) => check(r.slug, `TOOL:${t}`))
    }
    for (const t of bundle.tutorials) {
      t.related.forEach((x) => check(t.slug, x))
      t.steps.forEach((s) => s.prompt && check(t.slug, `PROMPT:${s.prompt}`))
    }
    expect(missing).toEqual([])
  })

  it('variáveis declaradas existem no texto do prompt e vice-versa', () => {
    for (const p of bundle.prompts) {
      const inBody = extractVariableKeys(p.body).sort()
      const declared = p.variables.map((v) => v.key).sort()
      expect(declared, p.slug).toEqual(inBody)
    }
  })

  it('categorias usadas existem', () => {
    const cats = new Set(bundle.categories.map((c) => `${c.kind}:${c.slug}`))
    for (const t of bundle.tools) if (t.category) expect(cats.has(`TOOL:${t.category}`), t.slug).toBe(true)
    for (const item of [...bundle.prompts, ...bundle.workflows, ...bundle.references, ...bundle.tutorials])
      if (item.category) expect(cats.has(`CONTENT:${item.category}`), item.slug).toBe(true)
  })

  it('ferramentas do seed não se apresentam como verificadas sem data', () => {
    for (const t of bundle.tools) expect(t.verificationStatus === 'VERIFIED' ? Boolean(t.verifiedAt) : true, t.slug).toBe(true)
  })
})
