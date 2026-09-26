import { execFileSync } from 'node:child_process'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

/** Testes de integração só rodam com um banco dedicado (nunca o de desenvolvimento/produção). */
export const TEST_DB = process.env.TEST_DATABASE_URL
if (TEST_DB) {
  process.env.DATABASE_URL = TEST_DB
  process.env.AUTH_SECRET ??= 'test-secret-test-secret-test-secret-000'
}

export function migrateTestDb() {
  execFileSync('node', ['scripts/migrate.mjs'], { env: { ...process.env, DATABASE_URL: TEST_DB }, stdio: 'pipe' })
}
