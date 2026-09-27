import { expect, test } from '@playwright/test'
import { createHmac } from 'node:crypto'
import { HOTTOK, KIWIFY_TOKEN, STATE, uniqueEmail } from './fixtures'

test.describe('red team — acesso e entradas', () => {
  test('visitante é redirecionado e imagens exigem acesso', async ({ page, request }) => {
    for (const path of ['/lab', '/lab/prompts', '/lab/aulas', '/lab/favoritos', '/admin', '/admin/alunos']) {
      await page.goto(path)
      await expect(page, path).toHaveURL(/\/entrar$/)
    }
    expect((await request.get('/api/media/00000000-0000-0000-0000-000000000000')).status()).toBe(401)
  })

  test('cadastro ignora tentativa de virar admin', async ({ request }) => {
    const email = uniqueEmail('hacker')
    const res = await request.post('/api/auth/sign-up/email', {
      data: { name: 'Hacker', email, password: 'Senha-Hacker-2026', role: 'ADMIN' },
      headers: { origin: 'http://localhost:3100' },
    })
    expect(res.status()).toBeLessThan(500)
    const admin = await request.get('/admin')
    expect(admin.status()).toBe(404)
  })

  test('login de outra origem é recusado (CSRF)', async ({ request }) => {
    const res = await request.post('/api/auth/sign-in/email', {
      data: { email: 'x@e2e.intelra.test', password: 'qualquer-coisa' },
      headers: { origin: 'https://site-malicioso.example' },
    })
    expect(res.status()).toBe(403)
  })

  test('webhooks recusam requisições não autenticadas ou malformadas', async ({ request }) => {
    const body = { event: 'PURCHASE_APPROVED', data: { buyer: { email: uniqueEmail('fraude') }, purchase: { transaction: 'X' } } }
    expect((await request.post('/api/webhooks/hotmart', { data: body })).status()).toBe(401)
    expect((await request.post('/api/webhooks/hotmart', { data: body, headers: { 'x-hotmart-hottok': 'errado' } })).status()).toBe(401)
    expect(
      (await request.post('/api/webhooks/hotmart', { data: Buffer.from('{não é json'), headers: { 'x-hotmart-hottok': HOTTOK, 'content-type': 'application/json' } })).status(),
    ).toBe(400)
    expect(
      (await request.post('/api/webhooks/hotmart', { data: 'x'.repeat(300_000), headers: { 'x-hotmart-hottok': HOTTOK } })).status(),
    ).toBe(413)

    const raw = JSON.stringify({ order_id: 'k-sec', order_status: 'paid', Customer: { email: uniqueEmail('kiwi') } })
    expect((await request.post('/api/webhooks/kiwify?signature=abc', { data: raw, headers: { 'content-type': 'application/json' } })).status()).toBe(401)
    const signature = createHmac('sha1', KIWIFY_TOKEN).update(raw).digest('hex')
    const ok = await request.post(`/api/webhooks/kiwify?signature=${signature}`, { data: raw, headers: { 'content-type': 'application/json' } })
    expect(await ok.json()).toMatchObject({ ok: true, outcome: 'GRANTED' })
  })

  test.describe('como aluno', () => {
    test.use({ storageState: STATE.member })

    test('painel do professor não é revelado', async ({ page }) => {
      for (const path of ['/admin', '/admin/prompts/novo', '/admin/alunos', '/admin/vendas']) {
        const res = await page.goto(path)
        expect(res?.status(), path).toBe(404)
      }
    })

    test('URLs malformadas e conteúdo inexistente mostram “não encontrado”', async ({ page }) => {
      for (const path of ['/lab/prompts/..%2F..%2Fetc', '/lab/prompts/nao-existe', '/lab/aulas/nao-existe', '/lab/rota-inexistente']) {
        await page.goto(path)
        await expect(page.getByText(/Não encontramos/).first(), path).toBeVisible()
      }
      expect((await page.request.get('/api/media/nao-e-uuid')).status()).toBe(404)
    })

    test('entradas hostis na busca não quebram a página', async ({ page }) => {
      await page.goto(`/lab/prompts?q=${encodeURIComponent("'); drop table prompt; -- <script>alert(1)</script>%_\\")}&categoria=<x>`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Prompts')
      await expect(page.getByText('Nenhum prompt encontrado')).toBeVisible()
      await page.goto('/lab/prompts?q=produto')
      await expect(page.getByText(/\d+ prompts? para “produto”/)).toBeVisible()
    })
  })
})
