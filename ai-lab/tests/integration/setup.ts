import { execFileSync } from 'node:child_process'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

/** Testes de integração só rodam com um banco dedicado (nunca o de desenvolvimento/produção). */
export const TEST_DB = process.env.TEST_DATABASE_URL
if (TEST_DB) {
  if (!/_e2e|_test/.test(TEST_DB)) throw new Error('TEST_DATABASE_URL precisa apontar para um banco de teste (_test).')
  process.env.DATABASE_URL = TEST_DB
  process.env.AUTH_SECRET ??= 'test-secret-test-secret-test-secret-000'
  delete process.env.RESEND_API_KEY
}

export function migrateTestDb() {
  execFileSync('node', ['scripts/migrate.mjs'], { env: { ...process.env, DATABASE_URL: TEST_DB }, stdio: 'pipe' })
}
