import { expect, test } from '@playwright/test'
import { HOTTOK, STATE, uniqueEmail } from './fixtures'

const PASSWORD = 'Senha-do-Aluno-2026'

async function hotmart(request: import('@playwright/test').APIRequestContext, event: string, email: string, transaction: string) {
  return request.post('/api/webhooks/hotmart', {
    headers: { 'x-hotmart-hottok': HOTTOK },
    data: { id: `${event}-${transaction}`, event, data: { buyer: { email, name: 'Compradora' }, product: { id: 1, name: 'LAB' }, purchase: { transaction } } },
  })
}

test('compra na Hotmart → conta criada com o e-mail da compra → acesso; reembolso → bloqueio', async ({ page, request }) => {
  const email = uniqueEmail('compra')
  const transaction = `T-${Date.now()}`
  const res = await hotmart(request, 'PURCHASE_APPROVED', email.toUpperCase(), transaction)
  expect(await res.json()).toMatchObject({ ok: true, outcome: 'GRANTED' })

  await page.goto(`/criar-conta?email=${encodeURIComponent(email)}`)
  await expect(page.getByLabel('E-mail da compra')).toHaveValue(email)
  await page.getByLabel('Nome').fill('Compradora Teste')
  await page.getByLabel('Crie uma senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await page.waitForURL('**/lab')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('criar hoje')

  expect((await (await hotmart(request, 'PURCHASE_REFUNDED', email, transaction)).json()).outcome).toBe('REVOKED')
  await page.goto('/lab/prompts')
  await expect(page).toHaveURL(/\/acesso$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ainda não está liberado')
})

test('conta sem compra fica na tela de acesso', async ({ page }) => {
  await page.goto('/criar-conta')
  await page.getByLabel('Nome').fill('Curioso')
  await page.getByLabel('E-mail da compra').fill(uniqueEmail('sem-compra'))
  await page.getByLabel('Crie uma senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await page.waitForURL('**/acesso')
  await page.goto('/lab')
  await expect(page).toHaveURL(/\/acesso$/)
})

test.describe('aluno', () => {
  test.use({ storageState: STATE.member })

  test('encontra, personaliza, copia e favorita um prompt', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/lab/prompts?q=cinematico')
    await expect(page.getByText(/\d+ prompts? para “cinematico”/)).toBeVisible()
    await page.goto('/lab/prompts/luxury-product-photography-studio-campaign')
    await page.getByLabel('Produto').fill('um tênis branco')
    await page.getByRole('button', { name: 'Copiar prompt', exact: true }).click()
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toContain('photograph of um tênis branco')
    expect(copied).not.toContain('{{')

    const fav = page.getByRole('button', { name: /Favoritar “Luxury Product/ })
    await fav.click()
    await expect(page.getByRole('button', { name: /Remover “Luxury Product/ })).toBeVisible()
    await page.goto('/lab/favoritos')
    await expect(page.getByRole('link', { name: /Luxury Product Photography/ })).toBeVisible()
  })

  test('assiste a uma aula e marca como concluída', async ({ page }) => {
    await page.goto('/lab/aulas')
    await page.getByRole('link', { name: /Anatomia de um prompt de imagem/ }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Anatomia de um prompt de imagem')
    const done = page.getByRole('button', { name: 'Marcar como concluída' })
    await done.click()
    await expect(page.getByRole('button', { name: 'Concluída' })).toBeVisible()
    await page.goto('/lab/aulas')
    await expect(page.getByLabel('Concluída').first()).toBeVisible()
    // desfaz para manter os testes independentes
    await page.getByRole('link', { name: /Anatomia de um prompt de imagem/ }).click()
    await page.getByRole('button', { name: 'Concluída' }).click()
    await expect(page.getByRole('button', { name: 'Marcar como concluída' })).toBeVisible()
  })

  test('vê as ferramentas com links externos seguros', async ({ page }) => {
    await page.goto('/lab/ferramentas')
    const link = page.getByRole('link', { name: /Abrir Midjourney/ })
    await expect(link).toHaveAttribute('href', 'https://www.midjourney.com/')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})

test.describe('professor', () => {
  test.use({ storageState: STATE.admin })

  test('cria prompt com campo editável e aula vinculada; o aluno vê', async ({ page, browser }) => {
    const title = `Prompt E2E ${Date.now()}`
    await page.goto('/admin/prompts/novo')
    await page.getByLabel('Título').fill(title)
    await page.getByLabel('Categoria').fill('Testes')
    await page.getByLabel('Texto do prompt').fill('Retrato de {{pessoa|uma modelo}} com luz suave')
    await page.getByLabel('Dicas de uso').fill('Primeira dica\nSegunda dica')
    await page.getByRole('button', { name: 'Criar prompt' }).click()
    await page.waitForURL('**/admin/prompts')
    await expect(page.getByRole('link', { name: title })).toBeVisible()

    const lessonTitle = `Aula E2E ${Date.now()}`
    await page.goto('/admin/aulas/novo')
    await page.getByLabel('Título da aula').fill(lessonTitle)
    await page.getByLabel('Módulo').fill('Módulo E2E')
    await page.getByLabel('Link do vídeo').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await page.getByLabel('Texto da aula').fill('## Passo 1\n• Faça isto')
    await page.getByLabel(title).check()
    await page.getByRole('button', { name: 'Criar aula' }).click()
    await page.waitForURL('**/admin/aulas')

    const member = await browser.newPage({ storageState: STATE.member })
    await member.goto('/lab/aulas')
    await member.getByRole('link', { name: new RegExp(lessonTitle) }).click()
    await expect(member.locator('iframe[src^="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"]')).toBeVisible()
    await expect(member.getByRole('heading', { name: 'Passo 1' })).toBeVisible()
    await member.getByRole('link', { name: title }).click()
    await expect(member.getByText('Primeira dica')).toBeVisible()
    await expect(member.getByLabel('Pessoa')).toHaveAttribute('placeholder', 'uma modelo')
    await member.close()
  })

  test('rascunho não aparece para o aluno', async ({ page, browser }) => {
    const title = `Rascunho ${Date.now()}`
    await page.goto('/admin/prompts/novo')
    await page.getByLabel('Título').fill(title)
    await page.getByLabel('Categoria').fill('Testes')
    await page.getByLabel('Texto do prompt').fill('segredo do rascunho')
    await page.getByLabel('Publicado (visível para os alunos)').uncheck()
    await page.getByRole('button', { name: 'Criar prompt' }).click()
    await page.waitForURL('**/admin/prompts')

    const member = await browser.newPage({ storageState: STATE.member })
    await member.goto(`/lab/prompts?q=${encodeURIComponent(title)}`)
    await expect(member.getByText('Nenhum prompt encontrado')).toBeVisible()
    await member.goto(`/lab/prompts/rascunho-${title.split(' ')[1]}`)
    await expect(member.getByText('Não encontramos este conteúdo')).toBeVisible()
    await member.close()
  })

  test('libera e-mails manualmente e configura o link de compra', async ({ page }) => {
    const email = uniqueEmail('manual')
    await page.goto('/admin/alunos')
    await page.getByLabel('Liberar acesso manualmente').fill(`${email}, Aluno Manual\nnao-e-email`)
    await page.getByRole('button', { name: 'Liberar acesso' }).click()
    await expect(page.getByText('1 linha(s) com e-mail inválido')).toBeVisible()
    await page.goto(`/admin/alunos?q=${encodeURIComponent(email)}`)
    await expect(page.getByRole('cell', { name: new RegExp(`Aluno Manual.*${email}`) })).toBeVisible()
    await expect(page.getByRole('button', { name: `Bloquear acesso de ${email}` })).toBeVisible()

    await page.goto('/admin/vendas')
    await page.getByLabel('Link de compra (checkout)').fill('https://pay.hotmart.com/E2E')
    await page.getByRole('button', { name: 'Salvar links' }).click()
    await expect(page.getByText('Configurações salvas')).toBeVisible()
    await expect(page.getByText('/api/webhooks/hotmart')).toBeVisible()
  })
})
