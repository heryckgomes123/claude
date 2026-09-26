import { expect, test, type Page } from '@playwright/test'
import postgres from 'postgres'
import { E2E_DB, OTHER, STATE } from './fixtures'

/**
 * Rotas do Lab têm limite de Suspense (loading.tsx) para skeletons de navegação; quando notFound()
 * ocorre após o início do streaming, o Next exibe a tela de não encontrado com status 200 + noindex.
 * O que importa para segurança: a tela de não encontrado e nenhum dado do recurso.
 */
async function expectNotFound(page: Page, path: string) {
  const res = await page.goto(path)
  expect([200, 404], path).toContain(res?.status())
  await expect(page.getByText(/Conteúdo não encontrado|Não encontramos esta página/).first(), path).toBeVisible()
}

test.describe('red team — acesso e entradas', () => {
  test('visitante é redirecionado e APIs exigem sessão', async ({ page, request }) => {
    for (const path of ['/lab', '/lab/prompts', '/lab/my-lab', '/admin']) {
      await page.goto(path)
      await expect(page, path).toHaveURL(/\/entrar$/)
    }
    expect((await request.get('/api/search?q=x')).status()).toBe(401)
    const visit = await request.get('/lab/tools/midjourney/visit', { maxRedirects: 0 })
    expect(visit.headers().location).toContain('/entrar')
  })

  test.describe('como membro', () => {
    test.use({ storageState: STATE.member })

    test('admin não é revelado a membros', async ({ page }) => {
      const res = await page.goto('/admin')
      expect(res?.status()).toBe(404)
      expect((await page.goto('/admin/content/new'))?.status()).toBe(404)
    })

    test('coleção e prompt de outro usuário respondem 404', async ({ page }) => {
      const sql = postgres(E2E_DB, { max: 1 })
      const [other] = await sql`select id from "user" where email = ${OTHER.email}`
      const [col] = await sql`insert into collection (user_id, name) values (${other.id}, ${'Privada ' + Date.now()}) returning id`
      const [up] = await sql`insert into user_prompt (user_id, title, body) values (${other.id}, 'Segredo', 'texto privado') returning id`
      const [exp] = await sql`insert into experiment (user_id, title) values (${other.id}, 'Privado') returning id`
      await sql.end()
      await expectNotFound(page, `/lab/my-lab/collections/${col.id}`)
      await expect(page.getByText(/Privada/)).toHaveCount(0)
      await expectNotFound(page, `/lab/my-lab/prompts/${up.id}`)
      await expect(page.getByText('texto privado')).toHaveCount(0)
      await expectNotFound(page, `/lab/experiments/${exp.id}`)
    })

    test('URLs malformadas e conteúdo inexistente dão 404', async ({ page }) => {
      for (const path of ['/lab/prompts/..%2F..%2Fetc', '/lab/prompts/nao-existe', '/lab/my-lab/collections/not-a-uuid', '/lab/explore/categoria-fantasma', '/lab/rota-inexistente'])
        await expectNotFound(page, path)
    })

    test('entradas hostis na busca e nos filtros não quebram a página', async ({ page, request }) => {
      await page.goto(`/lab/search?q=${encodeURIComponent("'); drop table content_item; -- <script>alert(1)</script>")}`)
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Resultados para')
      await page.goto('/lab/prompts?difficulty=HACKER&page=-9&media=<x>&sort=;;')
      await expect(page.getByText(/\d+ resultados?/)).toBeVisible()
      const tooLong = await request.get(`/api/search?q=${'a'.repeat(500)}`)
      expect(tooLong.status()).toBe(400)
      expect((await request.get('/api/search?q=produto&type=HACK')).status()).toBe(400)
    })

    test('visita de ferramenta só redireciona para o site cadastrado', async ({ request }) => {
      const res = await request.get('/lab/tools/nao-existe/visit', { maxRedirects: 0 })
      expect(res.status()).toBe(404)
      const ok = await request.get('/lab/tools/midjourney/visit', { maxRedirects: 0 })
      expect(ok.status()).toBe(302)
      expect(ok.headers().location).toBe('https://www.midjourney.com/')
    })
  })
})
