import { expect, test } from '@playwright/test'
import { STATE } from './fixtures'

test.use({ storageState: STATE.member })

const PAGES = [
  '/lab',
  '/lab/explore',
  '/lab/prompts',
  '/lab/prompts/luxury-product-photography-studio-campaign',
  '/lab/workflows/foto-de-produto-para-video-comercial',
  '/lab/tools/kling-ai',
  '/lab/references',
  '/lab/tutorials/animando-imagens-estaticas',
  '/lab/my-lab',
  '/lab/prompt-builder',
  '/lab/experiments',
]

test('sem rolagem horizontal nas telas principais', async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, path).toBeLessThanOrEqual(1)
  }
})

test('navegação inferior, menu e busca funcionam no celular', async ({ page }) => {
  await page.goto('/lab')
  const bottom = page.getByRole('navigation', { name: 'Navegação principal' })
  await expect(bottom).toBeVisible()
  await bottom.getByRole('link', { name: 'Explorar' }).click()
  await expect(page).toHaveURL(/\/lab\/explore$/)
  await bottom.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('dialog').getByRole('link', { name: 'Ferramentas' }).click()
  await expect(page).toHaveURL(/\/lab\/tools$/)
  await bottom.getByRole('button', { name: 'Buscar' }).click()
  await page.getByRole('combobox', { name: 'Buscar no Lab' }).fill('upscale')
  await expect(page.getByRole('option', { name: /Upscale sem artefatos/ })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/lab\/(tutorials|prompts|tools|workflows)\//)
})

test('filtros abrem sob demanda no celular', async ({ page }) => {
  await page.goto('/lab/prompts')
  const toggle = page.getByRole('button', { name: /^Filtros/ })
  await expect(page.getByRole('combobox', { name: 'Mídia' })).toBeHidden()
  await toggle.click()
  await page.getByRole('combobox', { name: 'Mídia' }).selectOption('VIDEO')
  await expect(page).toHaveURL(/media=VIDEO/)
})
