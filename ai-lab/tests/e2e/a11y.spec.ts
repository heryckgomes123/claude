import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { STATE } from './fixtures'

const PUBLIC = ['/', '/entrar', '/criar-conta']
const MEMBER = [
  '/lab',
  '/lab/explore',
  '/lab/prompts',
  '/lab/prompts/luxury-product-photography-studio-campaign',
  '/lab/workflows/foto-de-produto-para-video-comercial',
  '/lab/tools/kling-ai',
  '/lab/references/chiaroscuro-para-perfumaria-de-luxo',
  '/lab/tutorials/anatomia-de-um-prompt-de-imagem',
  '/lab/search?q=video',
  '/lab/my-lab',
  '/lab/prompt-builder',
  '/lab/experiments/new',
]

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

test.describe('área de membros', () => {
  test.use({ storageState: STATE.member })
  test('páginas do Lab sem violações sérias de acessibilidade', async ({ page }) => {
    for (const path of MEMBER) await audit(page, path)
  })
})

test.describe('admin', () => {
  test.use({ storageState: STATE.admin })
  test('Command Center sem violações sérias de acessibilidade', async ({ page }) => {
    for (const path of ['/admin', '/admin/content', '/admin/content/new?type=WORKFLOW', '/admin/members', '/admin/access-codes']) await audit(page, path)
  })
})
