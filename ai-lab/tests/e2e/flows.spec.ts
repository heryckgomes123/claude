import { expect, test } from '@playwright/test'
import { STATE, uniqueEmail } from './fixtures'

test.describe('FLUXO 1 — cadastro com código → Lab → prompt → copiar → favoritar', () => {
  test('jornada completa do novo membro', async ({ browser }) => {
    // Admin gera um código de acesso (simula a entrega pós-compra)
    const adminCtx = await browser.newContext({ storageState: STATE.admin })
    const admin = await adminCtx.newPage()
    await admin.goto('/admin/access-codes')
    await admin.getByRole('button', { name: 'Gerar códigos' }).click()
    const codeBlock = admin.locator('pre')
    await expect(codeBlock).toContainText('LAB-')
    const code = (await codeBlock.innerText()).trim().split('\n')[0]
    await adminCtx.close()

    // Novo usuário cria conta com o código
    const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
    const page = await ctx.newPage()
    await page.goto('/')
    await page.getByRole('link', { name: 'Criar conta' }).first().click()
    await page.getByLabel('Nome').fill('Nova Criadora')
    await page.getByLabel('E-mail').fill(uniqueEmail('nova'))
    await page.getByLabel('Senha').fill('senha-forte-123')
    await page.getByLabel('Código de acesso').fill(code.toLowerCase())
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await page.waitForURL('**/lab')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Transforme ideias em')

    // Explora e busca prompts
    await page.getByRole('link', { name: 'Prompts' }).first().click()
    await page.getByRole('searchbox', { name: 'Buscar' }).fill('produto estúdio')
    await page.getByRole('searchbox', { name: 'Buscar' }).press('Enter')
    await expect(page).toHaveURL(/q=produto/)
    await page.getByRole('link', { name: 'Luxury Product Photography — Studio Campaign' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Luxury Product Photography — Studio Campaign')

    // Preenche variável e copia
    await page.getByLabel('Produto', { exact: true }).fill('a matte black perfume bottle')
    await page.getByRole('button', { name: 'Copiar prompt' }).click()
    await expect(page.getByText('Prompt copiado')).toBeVisible()
    const clip = await page.evaluate(() => navigator.clipboard.readText())
    expect(clip).toContain('a matte black perfume bottle')
    expect(clip).not.toContain('{{produto}}')

    // Favorita e confere no Meu Lab
    await page.getByRole('button', { name: /^Favoritar “Luxury/ }).click()
    await expect(page.getByRole('button', { name: /^Remover “Luxury/ })).toBeVisible()
    await page.goto('/lab/my-lab?tab=favorites')
    await expect(page.getByRole('link', { name: 'Luxury Product Photography — Studio Campaign' })).toBeVisible()
    await ctx.close()
  })

  test('conta sem plano cai na ativação e código inválido é recusado', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto('/criar-conta')
    await page.getByLabel('Nome').fill('Sem Plano')
    await page.getByLabel('E-mail').fill(uniqueEmail('semplano'))
    await page.getByLabel('Senha').fill('senha-forte-123')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await page.waitForURL('**/acesso')
    await expect(page.getByRole('heading', { name: 'Ative seu acesso ao Lab' })).toBeVisible()
    await page.getByLabel('Código de acesso').fill('LAB-XXXX-XXXX-XXXX')
    await page.getByRole('button', { name: 'Ativar acesso' }).click()
    await expect(page.getByText('Código inválido, expirado ou já utilizado.')).toBeVisible()
    await page.goto('/lab/prompts')
    await expect(page).toHaveURL(/\/acesso$/)
    const api = await page.request.get('/api/search?q=produto')
    expect(api.status()).toBe(403)
    await ctx.close()
  })
})

test.describe('com sessão de membro', () => {
  test.use({ storageState: STATE.member })

  test('FLUXO 2 — workflow → ferramentas necessárias → prompt relacionado', async ({ page }) => {
    await page.goto('/lab')
    await page.getByRole('link', { name: 'Workflows' }).first().click()
    await page.getByRole('link', { name: 'Foto de produto → vídeo comercial' }).click()
    await expect(page.getByText('Obrigatórias')).toBeVisible()
    for (const tool of ['Midjourney', 'Kling AI', 'CapCut']) await expect(page.getByRole('link', { name: tool }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Etapas' })).toBeVisible()
    await page.getByRole('link', { name: /Prompt:\s*Product 360° Turntable Video/ }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Product 360° Turntable Video')
  })

  test('FLUXO 3 — ferramenta → prompts e workflows relacionados', async ({ page }) => {
    await page.goto('/lab/tools')
    await page.getByRole('link', { name: 'Kling AI' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kling AI')
    await expect(page.getByText('Verificação pendente').first()).toBeVisible()
    const usage = page.getByRole('region', { name: /Onde Kling AI entra no Lab/ })
    await expect(usage.getByRole('link', { name: /Cinematic Fitness Campaign/ })).toBeVisible()
    await expect(usage.getByRole('link', { name: /Foto de produto → vídeo comercial/ })).toBeVisible()
    await usage.getByRole('link', { name: /Cinematic Fitness Campaign/ }).click()
    await expect(page).toHaveURL(/\/lab\/prompts\/cinematic-fitness-campaign$/)
  })

  test('FLUXO 4 — coleções, recentes e prompts próprios', async ({ page }) => {
    const name = `Clientes ${Date.now()}`
    await page.goto('/lab/prompts/editorial-fashion-portrait')
    await page.getByRole('button', { name: 'Salvar em coleção' }).click()
    await page.getByLabel('Nome da nova coleção').fill(name)
    await page.getByRole('button', { name: 'Criar coleção' }).click()
    await expect(page.getByText(`Salvo em “${name}”`)).toBeVisible()
    await page.keyboard.press('Escape')

    // Remix cria cópia editável
    await page.getByRole('button', { name: 'Remix' }).click()
    await page.waitForURL(/\/lab\/my-lab\/prompts\//)
    await expect(page.getByLabel('Título')).toHaveValue('Remix — Editorial Fashion Portrait')

    await page.goto('/lab/my-lab?tab=collections')
    await page.getByRole('link', { name: new RegExp(name) }).click()
    await expect(page.getByRole('link', { name: 'Editorial Fashion Portrait' })).toBeVisible()

    await page.goto('/lab/my-lab?tab=recent')
    await expect(page.getByRole('link', { name: 'Editorial Fashion Portrait' })).toBeVisible()
    await page.goto('/lab/my-lab?tab=prompts')
    await expect(page.getByRole('link', { name: /Remix — Editorial Fashion Portrait/ })).toBeVisible()
  })

  test('Prompt Builder monta, salva e aparece no Meu Lab', async ({ page }) => {
    await page.goto('/lab/prompt-builder')
    await page.getByLabel(/Assunto/).fill('a minimalist ceramic mug')
    await page.getByLabel(/Iluminação/).fill('soft window light')
    await expect(page.getByText(/A minimalist ceramic mug.*Lighting: soft window light\./)).toBeVisible()
    await page.getByLabel('Título').fill('Caneca — teste builder')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page).toHaveURL(/prompt-builder\?id=/)
    await page.goto('/lab/my-lab?tab=prompts')
    await expect(page.getByRole('link', { name: /Caneca — teste builder/ })).toBeVisible()
  })

  test('filtros alteram os resultados do banco', async ({ page }) => {
    await page.goto('/lab/prompts')
    const total = Number((await page.getByText(/\d+ resultados?/).first().innerText()).match(/\d+/)![0])
    await page.getByRole('combobox', { name: 'Mídia' }).selectOption('VIDEO')
    await expect(page).toHaveURL(/media=VIDEO/)
    const filtered = Number((await page.getByText(/\d+ resultados?/).first().innerText()).match(/\d+/)![0])
    expect(filtered).toBeGreaterThan(0)
    expect(filtered).toBeLessThan(total)
    await expect(page.locator('article').filter({ hasText: 'Imagem' })).toHaveCount(0)
  })

  test('busca global explica a relevância', async ({ page }) => {
    await page.goto('/lab/search?q=fotografia%20de%20produto')
    await expect(page.getByRole('link', { name: /Luxury Product Photography/ }).first()).toBeVisible()
    await expect(page.getByText('Por que é relevante').first()).toBeVisible()
  })

  test('experimento com variantes A/B', async ({ page }) => {
    await page.goto('/lab/prompts/luxury-product-photography-studio-campaign')
    await page.getByRole('link', { name: 'Testar num experimento' }).click()
    await expect(page.getByLabel('Título')).toHaveValue(/Teste — Luxury Product/)
    await page.getByLabel('Nota (0–10)').first().fill('8')
    await page.getByLabel('Nota (0–10)').nth(1).fill('6')
    await page.getByRole('button', { name: 'Salvar experimento' }).click()
    await page.waitForURL(/\/lab\/experiments\/[0-9a-f-]{36}$/)
    await expect(page.getByRole('heading', { name: 'Comparação' })).toBeVisible()
    await expect(page.getByText('8/10')).toBeVisible()
  })
})

test.describe('FLUXO 5 — admin cria, salva rascunho e publica', () => {
  test('rascunho invisível para membros até a publicação', async ({ browser }) => {
    const title = `Prompt E2E ${Date.now()}`
    const adminCtx = await browser.newContext({ storageState: STATE.admin })
    const admin = await adminCtx.newPage()
    await admin.goto('/admin/content/new?type=PROMPT')
    await admin.getByLabel('Título').fill(title)
    await admin.getByLabel('Resumo').fill('Prompt criado pelo teste de ponta a ponta.')
    await admin.getByLabel('Texto do prompt').fill('Cinematic still of {{assunto}} at blue hour.')
    await admin.getByRole('button', { name: /Adicionar 1 detectada/ }).click()
    await admin.getByRole('button', { name: 'Criar prompt' }).click()
    await admin.waitForURL(/\/admin\/content\/[0-9a-f-]{36}\?created=1/)
    await expect(admin.getByText('Rascunho').first()).toBeVisible()

    const memberCtx = await browser.newContext({ storageState: STATE.member })
    const member = await memberCtx.newPage()
    await member.goto(`/lab/prompts?q=${encodeURIComponent(title)}`)
    await expect(member.getByText('0 resultados')).toBeVisible()

    await admin.getByLabel('Status').selectOption('PUBLISHED')
    await admin.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(admin.getByText('Conteúdo salvo')).toBeVisible()

    await member.reload()
    await member.getByRole('link', { name: title, exact: true }).click()
    await expect(member.getByRole('heading', { level: 1 })).toHaveText(title)
    await expect(member.getByLabel('assunto')).toBeVisible()
    await adminCtx.close()
    await memberCtx.close()
  })
})
