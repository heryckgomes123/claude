import { expect, test } from '@playwright/test'
import { STATE } from './fixtures'

test.use({ storageState: STATE.member })

test('área do aluno no celular: sem rolagem lateral e com menu inferior', async ({ page }) => {
  for (const path of ['/lab', '/lab/prompts', '/lab/prompts/luxury-product-photography-studio-campaign', '/lab/aulas', '/lab/ferramentas', '/lab/favoritos']) {
    await page.goto(path)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, path).toBeLessThanOrEqual(0)
  }
  const nav = page.getByRole('navigation', { name: 'Menu principal' })
  await expect(nav).toBeVisible()
  await nav.getByRole('link', { name: 'Aulas' }).click()
  await expect(page).toHaveURL(/\/lab\/aulas$/)
})
