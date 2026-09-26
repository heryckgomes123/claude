import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { chromium, type FullConfig } from '@playwright/test'
import { hashPassword } from 'better-auth/crypto'
import postgres from 'postgres'
import { ADMIN, E2E_DB, MEMBER, OTHER, STATE } from './fixtures'

/** Prepara um banco E2E limpo: migra, carrega o seed, cria admin e membros e salva sessões. */
export default async function globalSetup(config: FullConfig) {
  if (!/_e2e|_test/.test(E2E_DB)) throw new Error('E2E_DATABASE_URL precisa apontar para um banco de teste (_e2e/_test).')
  const env = { ...process.env, DATABASE_URL: E2E_DB }
  const sql = postgres(E2E_DB, { max: 1, onnotice: () => {} })
  execFileSync('node', ['scripts/migrate.mjs'], { env, stdio: 'pipe' })
  await sql`truncate content_item, category, tag, "user", plan, lab_update, rate_limit, app_rate_limit, access_code cascade`
  execFileSync('npx', ['tsx', 'scripts/seed.ts'], {
    env: { ...env, SEED_ADMIN_EMAIL: ADMIN.email, SEED_ADMIN_PASSWORD: ADMIN.password },
    stdio: 'pipe',
  })

  const [lab] = await sql`select id from plan where code = 'LAB'`
  for (const person of [MEMBER, OTHER]) {
    const id = randomUUID()
    await sql`insert into "user" (id, name, email, email_verified, role) values (${id}, ${person.name}, ${person.email}, true, 'USER')`
    await sql`insert into account (id, account_id, provider_id, user_id, password) values (${randomUUID()}, ${id}, 'credential', ${id}, ${await hashPassword(person.password)})`
    await sql`insert into membership (user_id, plan_id, status, source) values (${id}, ${lab.id}, 'ACTIVE', 'MANUAL')`
  }
  await sql.end()

  // Sessões reutilizáveis (evita logins repetidos e o rate limit de autenticação).
  mkdirSync('tests/e2e/.auth', { recursive: true })
  const baseURL = config.projects[0].use.baseURL!
  const executablePath = config.projects[0].use.launchOptions?.executablePath
  const browser = await chromium.launch({ executablePath })
  for (const [who, file] of [
    [ADMIN, STATE.admin],
    [MEMBER, STATE.member],
  ] as const) {
    const page = await browser.newPage({ baseURL })
    await page.goto('/entrar')
    await page.getByLabel('E-mail').fill(who.email)
    await page.getByLabel('Senha').fill(who.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.waitForURL('**/lab')
    await page.context().storageState({ path: file })
    await page.close()
  }
  await browser.close()
}
