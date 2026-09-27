import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { STATE } from './fixtures'

const PUBLIC = ['/', '/entrar', '/criar-conta', '/esqueci-senha']
const MEMBER = [
  '/lab',
  '/lab/prompts',
  '/lab/prompts/luxury-product-photography-studio-campaign',
  '/lab/aulas',
  '/lab/aulas/anatomia-de-um-prompt-de-imagem',
  '/lab/ferramentas',
  '/lab/favoritos',
]
const ADMIN = ['/admin', '/admin/prompts', '/admin/prompts/novo', '/admin/prompts/importar', '/admin/aulas/novo', '/admin/alunos', '/admin/vendas']

async function audit(page: import('@playwright/test').Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious.map((v) => `${v.id}: ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`), path).toEqual([])
}

test('páginas públicas sem violações sérias de acessibilidade', async ({ page }) => {
  for (const path of PUBLIC) await audit(page, path)
})

test.describe('aluno', () => {
  test.use({ storageState: STATE.member })
  test('área do aluno sem violações sérias de acessibilidade', async ({ page }) => {
    for (const path of MEMBER) await audit(page, path)
  })
})

test.describe('professor', () => {
  test.use({ storageState: STATE.admin })
  test('painel sem violações sérias de acessibilidade', async ({ page }) => {
    for (const path of ADMIN) await audit(page, path)
  })
})
